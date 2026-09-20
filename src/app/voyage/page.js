import prisma from "@/lib/prisma";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import WeatherWidget from "@/components/WeatherWidget";
import TravelForm from "./TravelForm";

export default async function VoyagePage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const clerkUser = await currentUser();
  const dbUser = await prisma.user.findUnique({
    where: { email: clerkUser.emailAddresses[0].emailAddress },
  });

  // Récupérer tout le dressing de l'utilisateur pour le transmettre au Client Component
  const allItems = dbUser
    ? await prisma.item.findMany({ where: { userId: dbUser.id } })
    : [];

  return (
    <main className="min-h-screen bg-[#FAFAFA] text-black font-sans">
      {/* HEADER ADAPTÉ */}
      <header className="flex flex-col md:flex-row md:justify-between items-center py-4 md:py-6 px-4 md:px-12 border-b border-neutral-200 bg-white gap-4 md:gap-0">
        <div className="flex justify-between items-center w-full md:w-auto">
          <div className="text-xl font-serif uppercase tracking-widest text-[#C5A059]">
            Mon Dressing
          </div>
          <div className="md:hidden">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>

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
            className="border-b border-black pb-1 text-black"
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
            className="text-neutral-400 hover:text-black transition-colors"
          >
            Profil
          </Link>
        </nav>

        <div className="flex items-center justify-center md:justify-end gap-4 w-full md:w-auto">
          <div className="transform scale-90 md:scale-100 origin-center md:origin-right">
            <WeatherWidget />
          </div>
          <div className="hidden md:block">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <section className="px-6 md:px-12 py-12 max-w-7xl mx-auto">
        <h1 className="text-4xl font-serif mb-2 text-center md:text-left">
          Garde-Robe Capsule
        </h1>
        <p className="text-neutral-500 mb-12 text-center md:text-left">
          L'IA analyse le climat de votre destination et prépare votre valise
          idéale.
        </p>

        <TravelForm allItems={allItems} />
      </section>
    </main>
  );
}
