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

// 3. Action pour générer les looks avec Gemini (CONNECTÉ AU PROFIL ET AU GPS)
export async function generateAILooks(
  baseItemIds,
  selectedEvent,
  selectedMood,
  coords,
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

  // Utilisation des coordonnées du téléphone, ou Asnières par défaut si refusé
  const lat = coords?.lat || 48.9107;
  const lon = coords?.lon || 2.289;

  const weather = await getLocalWeather(lat, lon);
  const weatherContext = weather
    ? `ATTENTION - MÉTÉO DU JOUR : Il fait actuellement ${weather.temperature}°C à l'extérieur. Tu DOIS adapter ta proposition de tenue à cette température de manière stricte et logique.`
    : `Météo inconnue, propose une tenue de mi-saison standard.`;

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
  4. COHÉRENCE VISUELLE ABSOLUE : Dans ta "description", parle des vêtements de manière élégante et naturelle. N'ÉCRIS JAMAIS les IDs (ex: "cmu6...") dans le texte de la description. Les IDs ne doivent être placés QUE dans le tableau "itemIds". Cependant, tu n'as le droit de décrire QUE les pièces que tu as réellement sélectionnées dans "itemIds". N'invente aucun vêtement.
  5. Pense "Tenue Réelle" : Assure-toi de toujours inclure les IDs nécessaires pour que le client puisse sortir (un Haut, un Bas, des Chaussures).
  
  Tu dois répondre UNIQUEMENT au format JSON strict. Ton résultat doit être un tableau contenant EXACTEMENT 3 objets :
  [
    {
      "name": "Nom de la tenue 1",
      "description": "Explication naturelle de la tenue sans mentionner aucun ID...",
      "itemIds": ["id_base_1", "id_base_2", "id_complement_1", "id_complement_2"]
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

  // On isole de force le tableau JSON en ignorant le bla-bla avant et après (Extraction robuste)
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

// Fonction pour récupérer la météo locale en temps réel (dynamique)
async function getLocalWeather(lat, lon) {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`,
      { cache: "no-store" },
    );
    const data = await response.json();
    return data.current_weather;
  } catch (error) {
    console.error("Erreur météo:", error);
    return null;
  }
}
