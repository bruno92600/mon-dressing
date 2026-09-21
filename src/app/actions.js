"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

// 1. Action pour ajouter un vêtement depuis le modal
export async function saveItem(formData) {
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error("Non autorisé");
  const userEmail = clerkUser.emailAddresses[0].emailAddress;

  const dbUser = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!dbUser)
    throw new Error(
      "Profil introuvable, veuillez enregistrer votre profil d'abord.",
    );

  const name = formData.get("name");
  const category = formData.get("category");
  const imageUrl = formData.get("imageUrl");

  await prisma.user.upsert({
    where: { email: "contact@mondressing.com" },
    update: {},
    create: { email: "contact@mondressing.com", name: "Propriétaire" },
  });

  await prisma.item.create({
    data: {
      name,
      category,
      imageUrl,
      userId: dbUser.id,
    },
  });

  revalidatePath("/dressing");
  redirect("/dressing");
}

// 2. Action pour supprimer un vêtement
export async function deleteItem(formData) {
  const id = formData.get("id");
  await prisma.item.delete({ where: { id: id } });
  revalidatePath("/dressing");
}

// 3. Action pour générer les looks avec Gemini
export async function generateAILooks(
  baseItemIds,
  selectedEvent,
  selectedMood,
  coords,
  isTomorrow = false,
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("La clé API Gemini est absente du fichier .env");

  const clerkUser = await currentUser();
  const userEmail = clerkUser.emailAddresses[0].emailAddress;
  const user = await prisma.user.findUnique({ where: { email: userEmail } });

  const clientGender =
    user?.gender && user.gender !== "Non précisé"
      ? user.gender.toLowerCase()
      : "une personne";
  const clientAge = user?.age ? `de ${user.age} ans` : "";
  const stylePrefs = user?.stylePreferences
    ? `\nPRÉFÉRENCES DE STYLE DU CLIENT À RESPECTER ABSOLUMENT : "${user.stylePreferences}"`
    : "";

  const idsArray = baseItemIds
    ? Array.isArray(baseItemIds)
      ? baseItemIds
      : [baseItemIds]
    : [];

  const modelsRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
  );
  const modelsData = await modelsRes.json();
  const availableModel = modelsData.models?.find((m) =>
    m.supportedGenerationMethods?.includes("generateContent"),
  );
  const modelName = availableModel
    ? availableModel.name
    : "models/gemini-3.6-flash";

  const allItems = await prisma.item.findMany({ where: { userId: user.id } });
  const lat = coords?.lat || 48.9107;
  const lon = coords?.lon || 2.289;
  const weather = await getLocalWeather(lat, lon, isTomorrow);

  let weatherContext = `Météo inconnue, propose une tenue de mi-saison standard.`;
  if (weather) {
    if (weather.isTomorrow) {
      weatherContext = `ATTENTION - MÉTÉO DE DEMAIN : La température maximale prévue demain est de ${Math.round(weather.temp)}°C. Tu DOIS adapter ta proposition de tenue à cette température.`;
    } else {
      weatherContext = `ATTENTION - MÉTÉO DU JOUR : Il fait actuellement ${Math.round(weather.temp)}°C à l'extérieur. Tu DOIS adapter ta proposition de tenue à cette température.`;
    }
  }

  const eventContext = selectedEvent
    ? `ATTENTION - ÉVÉNEMENT : Le client participe à l'événement suivant : "${selectedEvent}". Tu DOIS proposer une tenue dont le niveau de formalité et le style correspondent parfaitement à cette occasion.`
    : `Aucun événement spécifique précisé, propose une tenue polyvalente.`;
  const moodContext = selectedMood
    ? `ATTENTION - HUMEUR DU JOUR : Le client souhaite une tenue qui reflète cette ambiance : "${selectedMood}". Adapte impérativement le style, les matières ou les associations pour correspondre à cet état d'esprit.`
    : ``;

  const baseItems = allItems.filter((item) => idsArray.includes(item.id));
  let otherItems = allItems.filter((item) => !idsArray.includes(item.id));
  const selectedCategories = baseItems.map((item) => item.category);
  const singleUseCategories = ["Bas", "Chaussures", "Maroquinerie"];
  const exclusiveKeywords = [
    "casquette",
    "bonnet",
    "chapeau",
    "sac",
    "manteau",
    "veste",
    "blouson",
    "lunettes",
    "montre",
  ];
  const foundKeywords = [];

  baseItems.forEach((item) => {
    const lowerName = item.name.toLowerCase();
    exclusiveKeywords.forEach((kw) => {
      if (lowerName.includes(kw) && !foundKeywords.includes(kw)) {
        foundKeywords.push(kw);
      }
    });
  });

  otherItems = otherItems.filter((item) => {
    const lowerName = item.name.toLowerCase();
    const hasWordConflict = foundKeywords.some((kw) => lowerName.includes(kw));
    if (hasWordConflict) return false;
    if (
      singleUseCategories.includes(item.category) &&
      selectedCategories.includes(item.category)
    )
      return false;
    return true;
  });

  const catalog = otherItems
    .map((i) => `- ID: ${i.id} | Nom: ${i.name} | Catégorie: ${i.category}`)
    .join("\n");
  const baseItemsList = baseItems
    .map((i) => `${i.name} (Catégorie: ${i.category})`)
    .join(" ET ");
  const obligationText =
    baseItems.length > 0
      ? `Le client veut OBLIGATOIREMENT porter ces pièces ensemble aujourd'hui : \n${baseItemsList}`
      : `Le client te laisse TOTALEMENT CARTE BLANCHE pour choisir la meilleure tenue dans le dressing.`;
  const ruleTwo =
    baseItems.length > 0
      ? `2. Chaque tenue doit INCLURE TOUTES les pièces de base demandées (ajoute leurs IDs dans "itemIds").`
      : `2. Tu as le choix total des pièces. Assure-toi de sélectionner une tenue hautement stylée et adaptée au contexte.`;

  const prompt = `Tu es un styliste personnel de haut niveau.
  ${weatherContext}
  ${eventContext} 
  ${moodContext}

    Voici les préférences de l'utilisateur :
    - Âge : ${user.age || "Non renseigné"}
    - Genre : ${user.gender || "Non renseigné"}
    - Style : ${user.stylePreferences || "Aucune préférence particulière"}

    Ton client est ${clientGender} ${clientAge}. ${stylePrefs}
  
  ${obligationText}
  
  Voici le catalogue strict du reste du dressing disponible pour compléter :
  ${catalog}
  
  RÈGLES ABSOLUES ET STRICTES DE COMPOSITION :
  1. Tu DOIS GÉNÉRER EXACTEMENT 3 TENUES différentes.
  ${ruleTwo}
  3. INTERDICTION STRICTE DE FAIRE DES DOUBLONS D'USAGE :
     - Pas de deuxième couvre-chef (casquette, bonnet...) si déjà présent.
     - Pas de deuxième sac si déjà présent.
     - Pas de deuxième pièce d'extérieur (manteau, veste...) si déjà présente.
  4. COHÉRENCE VISUELLE ABSOLUE : Dans ta "description", parle des vêtements de manière élégante et naturelle. N'ÉCRIS JAMAIS les IDs.
  5. PENSE "TENUE RÉELLE" ET GESTION DES MANQUES : Assure-toi d'inclure un Haut, un Bas, et des Chaussures. Si le catalogue ne contient pas une catégorie essentielle (ex: aucune chaussure), fais de ton mieux avec ce qui existe, mais tu DOIS recommander l'achat de cette pièce manquante dans tes suggestions.
  6. CONSEIL SHOPPING : Pour chaque tenue, propose 1 à 2 suggestions d'achats (vêtements, chaussures ou accessoires) qui viendraient sublimer ou compléter le look.
  
  Tu dois répondre UNIQUEMENT au format JSON strict. Ton résultat doit être un tableau contenant EXACTEMENT 3 objets :
  [
    {
      "name": "Nom de la tenue 1",
      "description": "Explication naturelle de la tenue...",
      "itemIds": ["id_base_1", "id_base_2", "id_complement_1", "id_complement_2"],
      "shoppingSuggestions": [
        {
          "itemToBuy": "Nom de la pièce",
          "reason": "Explication...",
          "brands": ["Marque 1", "Marque 2"]
        }
      ]
    }
  ]`;

  let response;
  let data;
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      },
    );

    data = await response.json();
    if (response.ok) break;

    if (response.status === 503 && attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } else {
      throw new Error(
        data.error?.message || "Erreur lors de la communication avec Gemini",
      );
    }
  }

  const text = data.candidates[0].content.parts[0].text;
  const startIndex = text.indexOf("[");
  const endIndex = text.lastIndexOf("]");
  if (startIndex === -1 || endIndex === -1)
    throw new Error("L'IA n'a pas respecté la structure des données demandée.");

  const cleanJson = text.substring(startIndex, endIndex + 1);
  return JSON.parse(cleanJson);
}

// 4. Action pour sauvegarder le look choisi
export async function saveGeneratedOutfit(name, itemIds) {
  const { userId } = await auth();
  if (!userId) throw new Error("Non autorisé");

  const clerkUser = await currentUser();
  const userEmail = clerkUser.emailAddresses[0].emailAddress;
  const dbUser = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!dbUser) throw new Error("Utilisateur non trouvé en base");

  const existingItems = await prisma.item.findMany({
    where: { id: { in: itemIds } },
  });
  const validItemsToConnect = existingItems.map((item) => ({ id: item.id }));

  await prisma.outfit.create({
    data: {
      styleNotes: name,
      userId: dbUser.id,
      items: { connect: validItemsToConnect },
    },
  });

  revalidatePath("/tenues");
  redirect("/tenues");
}

// 5. Action pour analyser une image
export async function analyzeImageWithAI(imageUrl) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("La clé API Gemini est absente du fichier .env");

  try {
    const imageReq = await fetch(imageUrl);
    const imageBuffer = await imageReq.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");
    const mimeType = imageReq.headers.get("content-type") || "image/jpeg";

    const prompt = `Tu es un expert en mode masculine. Analyse ce vêtement.
    Déduis son nom descriptif et sa catégorie.
    Tu dois répondre UNIQUEMENT au format JSON strict avec cette structure exacte :
    {
      "name": "Nom descriptif trouvé",
      "category": "Choisis STRICTEMENT parmi : Haut, Bas, Chaussures, Maroquinerie, Accessoire"
    }`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inlineData: { mimeType: mimeType, data: base64Image } },
              ],
            },
          ],
        }),
      },
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Erreur Vision");

    const text = data.candidates[0].content.parts[0].text;
    const cleanJson = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Erreur lors de l'analyse d'image:", error);
    return null;
  }
}

// 6. Action pour supprimer une tenue
export async function deleteOutfit(formData) {
  const id = formData.get("id");
  await prisma.outfit.delete({ where: { id: id } });
  revalidatePath("/tenues");
}

// 7. Action pour mettre à jour le profil
export async function updateProfile(formData) {
  const gender = formData.get("gender");
  const age = parseInt(formData.get("age"), 10);
  const stylePreferences = formData.get("stylePreferences");

  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error("Vous devez être connecté.");

  const userEmail = clerkUser.emailAddresses[0].emailAddress;
  const userName = clerkUser.firstName || "Utilisateur";

  await prisma.user.upsert({
    where: { email: userEmail },
    update: {
      gender: gender,
      age: isNaN(age) ? null : age,
      stylePreferences: stylePreferences,
    },
    create: {
      email: userEmail,
      name: userName,
      gender: gender,
      age: isNaN(age) ? null : age,
      stylePreferences: stylePreferences,
    },
  });

  redirect("/dressing");
}

// Fonction météo intelligente
async function getLocalWeather(lat, lon, isTomorrow) {
  try {
    if (isTomorrow) {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max&timezone=Europe/Paris&forecast_days=2`,
        { cache: "no-store" },
      );
      const data = await response.json();
      return { temp: data.daily.temperature_2m_max[1], isTomorrow: true };
    } else {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`,
        { cache: "no-store" },
      );
      const data = await response.json();
      return { temp: data.current_weather.temperature, isTomorrow: false };
    }
  } catch (error) {
    console.error("Erreur météo:", error);
    return null;
  }
}

// Fonction utilitaire pour traduire les codes météo WMO en icônes et descriptions
function getWeatherCondition(code) {
  if (code === 0) return { label: "Ciel dégagé", icon: "☀️" };
  if (code === 1) return { label: "Ensoleillé", icon: "🌤️" };
  if (code === 2) return { label: "Éclaircies", icon: "⛅" };
  if (code === 3) return { label: "Couvert", icon: "☁️" };
  if ([45, 48].includes(code)) return { label: "Brouillard", icon: "🌫️" };
  if ([51, 53, 55].includes(code)) return { label: "Bruine", icon: "🌦️" };
  if ([61, 63, 65].includes(code)) return { label: "Pluie", icon: "🌧️" };
  if ([71, 73, 75, 77].includes(code)) return { label: "Neige", icon: "❄️" };
  if ([80, 81, 82].includes(code)) return { label: "Averses", icon: "🌧️" };
  if ([85, 86].includes(code)) return { label: "Averses de neige", icon: "🌨️" };
  if ([95, 96, 99].includes(code)) return { label: "Orage", icon: "⛈️" };
  return { label: "Variable", icon: "🌤️" };
}

// 8. Générer une valise de voyage
export async function generateTravelSuitcase(destination, days, departureDate) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("La clé API Gemini est absente.");

  const { currentUser } = await import("@clerk/nextjs/server");
  const clerkUser = await currentUser();

  const prisma = (await import("@/lib/prisma")).default;
  const user = await prisma.user.findUnique({
    where: { email: clerkUser.emailAddresses[0].emailAddress },
  });
  const allItems = await prisma.item.findMany({ where: { userId: user.id } });

  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=fr&format=json`,
  );
  const geoData = await geoRes.json();

  let dailyForecasts = null;
  let cityName = destination;

  if (geoData.results && geoData.results.length > 0) {
    const { latitude, longitude, name, country } = geoData.results[0];
    cityName = `${name}, ${country}`;

    const today = new Date();
    const depDate = departureDate ? new Date(departureDate) : today;
    const diffDaysToDeparture = Math.ceil(
      (depDate - today) / (1000 * 60 * 60 * 24),
    );

    // Météo sur 14 jours maximum
    if (diffDaysToDeparture >= 0 && diffDaysToDeparture <= 14) {
      const startDate = depDate.toISOString().split("T")[0];
      const endDate = new Date(
        depDate.getTime() + (Math.min(days, 14) - 1) * 24 * 60 * 60 * 1000,
      )
        .toISOString()
        .split("T")[0];

      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&timezone=Europe/Paris&start_date=${startDate}&end_date=${endDate}`,
      );
      const weatherData = await weatherRes.json();

      if (weatherData.daily) {
        const {
          time,
          temperature_2m_max,
          temperature_2m_min,
          weather_code,
          precipitation_probability_max,
        } = weatherData.daily;
        dailyForecasts = time.map((dateStr, idx) => {
          const code = weather_code ? weather_code[idx] : 0;
          const condition = getWeatherCondition(code);
          return {
            date: new Date(dateStr).toLocaleDateString("fr-FR", {
              weekday: "short",
              day: "numeric",
              month: "short",
            }),
            max: Math.round(temperature_2m_max[idx]),
            min: Math.round(temperature_2m_min[idx]),
            condition: condition.label,
            icon: condition.icon,
            rainProb: precipitation_probability_max
              ? precipitation_probability_max[idx]
              : 0,
          };
        });
      }
    }
  }

  const modelsRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
  );
  const modelsData = await modelsRes.json();
  const availableModel = modelsData.models?.find((m) =>
    m.supportedGenerationMethods?.includes("generateContent"),
  );
  const modelName = availableModel
    ? availableModel.name
    : "models/gemini-1.5-flash";

  const prompt = `Tu es un styliste expert en création de garde-robe capsule minimaliste.
  Ton client part pour ${days} jours à ${cityName}.
  DATE DE DÉPART PRÉVUE : ${departureDate || "Bientôt"} (Prends en compte la saisonnalité).
  
  DRESSING DISPONIBLE :
  ${JSON.stringify(allItems.map((i) => ({ id: i.id, name: i.name, category: i.category })))}
  
  Sélectionne une garde-robe intelligente et minimaliste adaptée à cette période.
  
  Tu DOIS répondre UNIQUEMENT par un objet JSON valide, sans texte autour, avec cette structure :
  {
    "title": "Nom accrocheur",
    "description": "Courte explication stylistique prenant en compte la saison du départ.",
    "suitcaseItemIds": ["id1", "id2", "id3", "id4"]
  }`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { response_mime_type: "application/json" },
      }),
    },
  );

  const data = await res.json();

  // 👇 SÉCURITÉ ANTI-CRASH GEMINI
  if (!res.ok || !data.candidates || data.candidates.length === 0) {
    console.error("Détail de l'erreur Gemini :", JSON.stringify(data, null, 2));
    throw new Error(
      data.error?.message ||
        "L'IA est temporairement indisponible. Veuillez réessayer.",
    );
  }

  const text = data.candidates[0].content.parts[0].text;
  const cleanJsonText = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
  const result = JSON.parse(cleanJsonText);

  return { ...result, cityName, dailyForecasts, departureDate };
}

// 9. Sauvegarder la valise dans le Lookbook avec les infos météo détaillées (JSON)
export async function saveTravelSuitcase(
  title,
  itemIds,
  cityName,
  departureDate,
  dailyForecasts,
) {
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error("Non autorisé");

  const userEmail = clerkUser.emailAddresses[0].emailAddress;
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!user) throw new Error("Utilisateur non trouvé");

  // On sauvegarde dans la base de données avec le nouveau champ JSON
  await prisma.outfit.create({
    data: {
      userId: user.id,
      styleNotes: `[VALISE] ${title}`,
      travelData: {
        cityName: cityName,
        departureDate: departureDate,
        dailyForecasts: dailyForecasts,
      },
      items: {
        connect: itemIds.map((id) => ({ id })),
      },
    },
  });

  revalidatePath("/tenues");
}
