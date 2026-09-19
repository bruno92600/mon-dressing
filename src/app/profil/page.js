import prisma from "@/lib/prisma";
import Link from "next/link";
import { updateProfile } from "../actions";
import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server"; // <-- AJOUT POUR LA SÉCURITÉ
import WeatherWidget from "@/components/WeatherWidget";

export default async function ProfilPage() {
  // 1. On identifie la personne connectée (Sécurité Clerk)
  const clerkUser = await currentUser();
  const userEmail = clerkUser?.emailAddresses[0].emailAddress;
  const userName = clerkUser?.firstName || "Utilisateur";

  // 2. On récupère les infos de TON utilisateur (et plus le faux compte de test)
  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: {},
    create: { email: userEmail, name: userName },
  });

  return (
    <main className="min-h-screen bg-[#FAFAFA] text-black font-sans">
      {/* --- HEADER RESPONSIVE PROFIL --- */}
      <header className="flex flex-wrap justify-between items-center py-4 md:py-6 px-4 md:px-12 border-b border-neutral-200 bg-white gap-y-4">
        <div className="text-xl font-serif uppercase tracking-widest text-[#C5A059] order-1">
          Mon Dressing
        </div>

        <div className="flex items-center gap-3 md:gap-6 order-2 md:order-3">
          <WeatherWidget />
          <UserButton afterSignOutUrl="/" />
        </div>

        <nav className="w-full md:w-auto flex justify-center md:justify-start gap-8 text-xs uppercase tracking-widest order-3 md:order-2 pb-2 md:pb-0">
          <Link
            href="/dressing"
            className="text-neutral-400 hover:text-black transition-colors"
          >
            Pièces
          </Link>
          <Link
            href="/tenues"
            className="text-neutral-400 hover:text-black transition-colors"
          >
            Tenues
          </Link>
          <Link
            href="/profil"
            className="border-b border-black pb-1 text-black"
          >
            Profil
          </Link>
        </nav>
      </header>

      {/* CONTENU PRINCIPAL */}
      <section className="px-6 md:px-12 py-12 max-w-2xl mx-auto">
        <h1 className="text-4xl font-serif mb-2">ADN Stylistique</h1>
        <p className="text-neutral-500 mb-12">
          Définissez votre profil pour que l'IA génère des tenues 100% adaptées
          à vous.
        </p>

        <form
          action={updateProfile}
          className="bg-white p-8 border border-neutral-200 shadow-sm flex flex-col gap-8"
        >
          {/* GENRE */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-neutral-500 mb-2">
              Genre
            </label>
            <select
              name="gender"
              defaultValue={user.gender || "Non précisé"}
              className="w-full border-b border-black py-2 outline-none focus:border-[#C5A059] transition-colors bg-transparent"
            >
              <option value="Non précisé">Non précisé</option>
              <option value="Homme">Homme</option>
              <option value="Femme">Femme</option>
              <option value="Mixte / Non-binaire">Mixte / Non-binaire</option>
            </select>
          </div>

          {/* ÂGE */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-neutral-500 mb-2">
              Âge
            </label>
            <input
              type="number"
              name="age"
              defaultValue={user.age || ""}
              placeholder="Ex: 43"
              className="w-full border-b border-black py-2 outline-none focus:border-[#C5A059] transition-colors bg-transparent"
            />
          </div>

          {/* PRÉFÉRENCES DE STYLE */}
          <div>
            <label className="block text-xs uppercase tracking-widest text-neutral-500 mb-2">
              Préférences de style & mots-clés
            </label>
            <textarea
              name="stylePreferences"
              defaultValue={user.stylePreferences || ""}
              placeholder="Ex: J'aime le style minimaliste, les couleurs neutres. Pas de motifs bariolés. J'adore intégrer des bijoux fins..."
              rows={4}
              className="w-full border border-neutral-300 p-3 outline-none focus:border-[#C5A059] transition-colors bg-transparent resize-none"
            />
          </div>

          <button
            type="submit"
            className="mt-4 bg-black text-white text-xs uppercase tracking-widest py-4 hover:bg-[#C5A059] transition-colors shadow-md"
          >
            Mettre à jour mon profil
          </button>
        </form>
      </section>
    </main>
  );
}
