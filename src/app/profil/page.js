import prisma from "@/lib/prisma";
import Link from "next/link";
import { updateProfile } from "../actions";
import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import WeatherWidget from "@/components/WeatherWidget";

export default async function ProfilPage() {
  const clerkUser = await currentUser();
  const userEmail = clerkUser?.emailAddresses[0].emailAddress;
  const userName = clerkUser?.firstName || "Utilisateur";

  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: {},
    create: { email: userEmail, name: userName },
  });

  return (
    <main className="min-h-screen bg-[#FAFAFA] text-black font-sans">
      {/* --- HEADER RESPONSIVE PROFIL --- */}
      <header className="flex flex-col md:flex-row md:justify-between items-center py-4 md:py-6 px-4 md:px-12 border-b border-neutral-200 bg-white gap-4 md:gap-0">
        {/* Ligne 1 (Mobile) / Gauche (Desktop) : Logo + Avatar */}
        <div className="flex justify-between items-center w-full md:w-auto">
          <div className="text-xl font-serif uppercase tracking-widest text-[#C5A059]">
            Mon Dressing
          </div>
          {/* Avatar visible uniquement sur mobile ici */}
          <div className="md:hidden">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>

        {/* Ligne 2 (Mobile) / Centre (Desktop) : Navigation */}
        <nav className="flex justify-center gap-6 md:gap-8 text-[10px] md:text-xs uppercase tracking-widest w-full md:w-auto overflow-x-auto no-scrollbar">
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
            href="/voyage"
            className="text-neutral-400 hover:text-black transition-colors"
          >
            Valise
          </Link>
          <Link
            href="/statistiques"
            className="text-neutral-400 hover:text-black transition-colors whitespace-nowrap"
          >
            Stats
          </Link>
          <Link
            href="/profil"
            className="border-b border-black pb-1 text-black"
          >
            Profil
          </Link>
        </nav>

        {/* Ligne 3 (Mobile) / Droite (Desktop) : Météo + Avatar (Desktop) */}
        <div className="flex items-center justify-center md:justify-end gap-4 w-full md:w-auto">
          <div className="transform scale-90 md:scale-100 origin-center md:origin-right">
            <WeatherWidget />
          </div>
          {/* Avatar visible uniquement sur desktop ici */}
          <div className="hidden md:block">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <section className="px-6 md:px-12 py-12 max-w-2xl mx-auto animate-in fade-in duration-500">
        <h1 className="text-4xl font-serif mb-2">ADN Stylistique</h1>
        <p className="text-neutral-500 mb-12">
          Définissez votre profil pour que l'IA génère des tenues 100% adaptées
          à votre style de vie.
        </p>

        <form
          action={updateProfile}
          className="bg-white p-8 md:p-10 border border-neutral-200 shadow-sm flex flex-col gap-10"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">
                Genre
              </label>
              <select
                name="gender"
                defaultValue={user.gender || "Non précisé"}
                className="w-full border-b border-neutral-300 py-2 outline-none focus:border-[#C5A059] transition-colors bg-transparent text-sm"
              >
                <option value="Non précisé">Non précisé</option>
                <option value="Homme">Homme</option>
                <option value="Femme">Femme</option>
                <option value="Mixte / Non-binaire">Mixte / Non-binaire</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">
                Âge
              </label>
              <input
                type="number"
                name="age"
                defaultValue={user.age || ""}
                placeholder="Ex: 43"
                className="w-full border-b border-neutral-300 py-2 outline-none focus:border-[#C5A059] transition-colors bg-transparent text-sm placeholder:text-neutral-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">
              Préférences & Marques favorites
            </label>
            <textarea
              name="stylePreferences"
              defaultValue={user.stylePreferences || ""}
              placeholder="Ex : J'aime le style minimaliste et les couleurs neutres. Je porte souvent des bagues en argent ou des pendentifs. J'apprécie des marques comme Gasper ou ALT Paris pour les bijoux, et une touche de parfum Le Couvent..."
              rows={5}
              className="w-full border border-neutral-200 p-4 outline-none focus:border-[#C5A059] transition-colors bg-neutral-50 text-sm resize-none placeholder:text-neutral-400 leading-relaxed"
            />
          </div>

          <button
            type="submit"
            className="mt-2 bg-black text-white text-xs uppercase tracking-widest py-4 hover:bg-[#C5A059] transition-colors shadow-md w-full"
          >
            Mettre à jour mon profil
          </button>
        </form>
      </section>
    </main>
  );
}
