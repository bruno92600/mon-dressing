"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

// 1. Action pour ajouter un vêtement depuis le modal
export async function saveItem(formData) {
  // --- NOUVEAU : Identification ---
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error("Non autorisé");
  const userEmail = clerkUser.emailAddresses[0].emailAddress;

  const dbUser = await prisma.user.findUnique({ where: { email: userEmail } });
  if (!dbUser)
    throw new Error(
      "Profil introuvable, veuillez enregistrer votre profil d'abord.",
    );
  // --------------------------------

  const name = formData.get("name");
  const category = formData.get("category");
  const imageUrl = formData.get("imageUrl");

  const user = await prisma.user.upsert({
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

  await prisma.item.delete({
    where: { id: id },
  });

  revalidatePath("/dressing");
}

// 3. Action pour générer les looks avec Gemini (CONNECTÉ AU PROFIL, GPS ET SHOPPING)
export async function generateAILooks(
  baseItemIds,
  selectedEvent,
  selectedMood,
  coords,
  isTomorrow = false,
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("La clé API Gemini est absente du fichier .env");
  }

  const clerkUser = await currentUser();
  const userEmail = clerkUser.emailAddresses[0].emailAddress;

  const user = await prisma.user.findUnique({
    where: { email: userEmail },
  });

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

  const allItems = await prisma.item.findMany({
    where: { userId: user.id },
  });

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

  // 👇 CORRECTION : Le prompt est désormais universel pour le shopping
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
  6. CONSEIL SHOPPING : Pour chaque tenue, propose 1 à 2 suggestions d'achats (vêtements, chaussures ou accessoires) qui viendraient sublimer ou compléter le look. Base-toi strictement sur les préférences de style du profil utilisateur pour suggérer des pièces et des marques pertinentes.
  
  Tu dois répondre UNIQUEMENT au format JSON strict. Ton résultat doit être un tableau contenant EXACTEMENT 3 objets :
  [
    {
      "name": "Nom de la tenue 1",
      "description": "Explication naturelle de la tenue...",
      "itemIds": ["id_base_1", "id_base_2", "id_complement_1", "id_complement_2"],
      "shoppingSuggestions": [
        {
          "itemToBuy": "Nom de la pièce (ex: Surchemise en flanelle, Bague en argent)",
          "reason": "Explication de la valeur stylistique ajoutée au look...",
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
      console.log(
        `Serveur Google surchargé. Nouvelle tentative dans 2 secondes...`,
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } else {
      console.error("Erreur API Google:", data);
      throw new Error(
        data.error?.message || "Erreur lors de la communication avec Gemini",
      );
    }
  }

  const text = data.candidates[0].content.parts[0].text;
  const startIndex = text.indexOf("[");
  const endIndex = text.lastIndexOf("]");

  if (startIndex === -1 || endIndex === -1) {
    throw new Error("L'IA n'a pas respecté la structure des données demandée.");
  }

  const cleanJson = text.substring(startIndex, endIndex + 1);
  return JSON.parse(cleanJson);
}

// 4. Action pour sauvegarder le look choisi
export async function saveGeneratedOutfit(name, itemIds) {
  // --- NOUVEAU : On identifie ton vrai compte Clerk ---
  const { userId } = await auth();
  if (!userId) throw new Error("Non autorisé");

  const clerkUser = await currentUser();
  const userEmail = clerkUser.emailAddresses[0].emailAddress;

  const dbUser = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!dbUser) throw new Error("Utilisateur non trouvé en base");
  // -----------------------------------------------------

  // 1. FILTRE ANTI-HALLUCINATION : On récupère uniquement les vrais articles qui existent en base
  const existingItems = await prisma.item.findMany({
    where: {
      id: { in: itemIds },
    },
  });

  // On crée le tableau de connexion avec uniquement les vrais IDs trouvés
  const validItemsToConnect = existingItems.map((item) => ({ id: item.id }));

  // 2. SAUVEGARDE SÉCURISÉE
  await prisma.outfit.create({
    data: {
      styleNotes: name,
      userId: dbUser.id, // On utilise l'ID de TON compte ici !
      items: {
        connect: validItemsToConnect,
      },
    },
  });

  revalidatePath("/tenues");
  redirect("/tenues");
}

// 5. Action pour analyser une image avec Gemini Vision
export async function analyzeImageWithAI(imageUrl) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("La clé API Gemini est absente du fichier .env");
  }

  try {
    const imageReq = await fetch(imageUrl);
    const imageBuffer = await imageReq.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");
    const mimeType = imageReq.headers.get("content-type") || "image/jpeg";

    const prompt = `Tu es un expert en mode masculine. Analyse ce vêtement.
    Déduis son nom descriptif (ex: "Chemise en lin bleue", "Jean brut", "Baskets blanches") et sa catégorie.
    
    Tu dois répondre UNIQUEMENT au format JSON strict avec cette structure exacte :
    {
      "name": "Nom descriptif trouvé",
      "category": "Choisis STRICTEMENT parmi : Haut, Bas, Chaussures, Maroquinerie, Accessoire"
    }`;

    // LA CORRECTION EST ICI : on utilise gemini-3.6-flash
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Image,
                  },
                },
              ],
            },
          ],
        }),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Erreur API Vision:", data);
      throw new Error(data.error?.message || "Erreur Vision");
    }

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

// 6. Action pour supprimer une tenue sauvegardée
export async function deleteOutfit(formData) {
  const id = formData.get("id");

  await prisma.outfit.delete({
    where: { id: id },
  });

  revalidatePath("/tenues");
}

// 7. Action pour mettre à jour le profil utilisateur (Liée à Clerk !)
export async function updateProfile(formData) {
  const gender = formData.get("gender");
  const age = parseInt(formData.get("age"), 10);
  const stylePreferences = formData.get("stylePreferences");

  // 1. On récupère le VRAI utilisateur sécurisé via Clerk
  const clerkUser = await currentUser();
  if (!clerkUser) throw new Error("Vous devez être connecté.");

  // On extrait son email
  const userEmail = clerkUser.emailAddresses[0].emailAddress;
  const userName = clerkUser.firstName || "Utilisateur";

  // 2. On met à jour SA ligne dans la base de données
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

  // 3. LA REDIRECTION : on l'envoie dans son dressing !
  redirect("/dressing");
}

// Fonction météo intelligente (Aujourd'hui = Temps réel / Demain = Prévision Max)
async function getLocalWeather(lat, lon, isTomorrow) {
  try {
    if (isTomorrow) {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max&timezone=Europe/Paris&forecast_days=2`,
        { cache: "no-store" },
      );
      const data = await response.json();
      return { temp: data.daily.temperature_2m_max[1], isTomorrow: true }; // [1] = Demain
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

// 1. Mise à jour de la fonction de génération pour récupérer les prévisions journalières
export async function generateTravelSuitcase(destination, days) {
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

  let weatherContext = "Météo locale inconnue.";
  let dailyForecasts = [];
  let cityName = destination;

  if (geoData.results && geoData.results.length > 0) {
    const { latitude, longitude, name, country } = geoData.results[0];
    cityName = `${name}, ${country}`;

    // On demande un nombre de jours adapté (maximum 10 jours pour Open-Meteo)
    const forecastDays = Math.min(Math.max(Number(days), 1), 10);
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=Europe/Paris&forecast_days=${forecastDays}`,
    );
    const weatherData = await weatherRes.json();

    if (weatherData.daily) {
      const { time, temperature_2m_max, temperature_2m_min } =
        weatherData.daily;
      dailyForecasts = time.map((dateStr, idx) => ({
        date: new Date(dateStr).toLocaleDateString("fr-FR", {
          weekday: "short",
          day: "numeric",
          month: "short",
        }),
        max: Math.round(temperature_2m_max[idx]),
        min: Math.round(temperature_2m_min[idx]),
      }));

      const avgMax = Math.round(
        temperature_2m_max.reduce((a, b) => a + b, 0) /
          temperature_2m_max.length,
      );
      weatherContext = `Climat à ${cityName} : moyenne de ${avgMax}°C sur la période.`;
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
  CONTEXTE CLIMATIQUE : ${weatherContext}
  
  DRESSING DISPONIBLE :
  ${JSON.stringify(allItems.map((i) => ({ id: i.id, name: i.name, category: i.category })))}
  
  Sélectionne une garde-robe intelligente et minimaliste adaptée à cette durée et cette météo.
  
  Tu DOIS répondre UNIQUEMENT par un objet JSON valide, sans texte autour, avec cette structure exacte :
  {
    "title": "Nom accrocheur (ex: Valise pour Madrid)",
    "description": "Courte explication stylistique et météorologique de tes choix.",
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
  if (
    !data.candidates ||
    data.candidates.length === 0 ||
    !data.candidates[0].content
  ) {
    throw new Error("L'IA n'a pas pu générer la valise.");
  }

  const text = data.candidates[0].content.parts[0].text;
  const cleanJsonText = text
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
  const result = JSON.parse(cleanJsonText);

  // On injecte les prévisions météo pour l'affichage côté client
  return { ...result, cityName, dailyForecasts };
}

// 2. Action pour enregistrer la valise (similaire aux tenues)
export async function saveTravelSuitcase(title, itemIds) {
  const { currentUser } = await import("@clerk/nextjs/server");
  const clerkUser = await currentUser();
  const prisma = (await import("@/lib/prisma")).default;

  const user = await prisma.user.findUnique({
    where: { email: clerkUser.emailAddresses[0].emailAddress },
  });
  if (!user) throw new Error("Utilisateur non trouvé");

  await prisma.outfit.create({
    data: {
      userId: user.id,
      styleNotes: `[VALISE] ${title}`,
      items: {
        connect: itemIds.map((id) => ({ id })),
      },
    },
  });
}
