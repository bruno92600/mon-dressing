import prisma from "@/lib/prisma";
import Link from "next/link";
import DressingGrid from "./DressingGrid";
import { UserButton } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import WeatherWidget from "@/components/WeatherWidget";
import AddPieceModal from "./AddPieceModal";

export default async function DressingPage({ searchParams }) {
  const params = await searchParams;
  const currentCategory = params?.category;

  const { userId } = await auth();
  if (!userId) redirect("/");

  const clerkUser = await currentUser();
  const userEmail = clerkUser.emailAddresses[0].emailAddress;
  const dbUser = await prisma.user.findUnique({ where: { email: userEmail } });

  const whereCondition = { userId: dbUser?.id };
  if (currentCategory) {
    whereCondition.category = currentCategory;
  }

  const items = dbUser
    ? await prisma.item.findMany({
        where: whereCondition,
        orderBy: { createdAt: "desc" },
      })
    : [];

  const categories = [
    "Haut",
    "Bas",
    "Chaussures",
    "Maroquinerie",
    "Accessoire",
  ];

  return (
    <main className="min-h-screen bg-white text-black font-sans relative">
      {/* --- HEADER RESPONSIVE DRESSING --- */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between py-4 md:py-6 px-4 md:px-12 border-b border-neutral-200 bg-white gap-4">
        {/* Ligne 1 (Mobile) / Gauche (Desktop) : Logo + Avatar mobile */}
        <div className="flex justify-between items-center w-full md:w-auto">
          <div className="text-xl font-serif uppercase tracking-widest text-[#C5A059]">
            Mon Dressing
          </div>
          <div className="md:hidden">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>

        {/* Ligne 2 (Mobile) / Centre (Desktop) : Navigation */}
        <nav className="flex justify-center gap-6 md:gap-8 text-[10px] md:text-xs uppercase tracking-widest w-full md:w-auto overflow-x-auto no-scrollbar">
          <Link
            href="/dressing"
            className="border-b border-black pb-1 text-black whitespace-nowrap"
          >
            Pièces
          </Link>
          <Link
            href="/tenues"
            className="text-neutral-400 hover:text-black transition-colors whitespace-nowrap"
          >
            Tenues
          </Link>
          <Link
            href="/voyage"
            className="text-neutral-400 hover:text-black transition-colors whitespace-nowrap"
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
            className="text-neutral-400 hover:text-black transition-colors whitespace-nowrap"
          >
            Profil
          </Link>
        </nav>

        {/* Ligne 3 (Mobile) / Droite (Desktop) : Ajouter + Météo + Avatar desktop */}
        <div className="flex items-center justify-center md:justify-end gap-3 md:gap-4 w-full md:w-auto flex-wrap">
          <AddPieceModal />

          <div className="transform scale-90 md:scale-100 origin-center md:origin-right">
            <WeatherWidget />
          </div>

          <div className="hidden md:block">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      <section className="px-6 md:px-12 py-12">
        <h1 className="text-4xl font-serif mb-2">Collection Privée</h1>
        <p className="text-neutral-500 mb-8">
          Cochez plusieurs pièces pour générer un look ciblé.
        </p>

        <div className="flex gap-6 mb-12 overflow-x-auto pb-2 text-xs uppercase tracking-widest whitespace-nowrap">
          <Link
            href="/dressing"
            className={`pb-1 border-b transition-colors ${!currentCategory ? "border-black text-black" : "border-transparent text-neutral-400 hover:text-black"}`}
          >
            Tout voir
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat}
              href={`/dressing?category=${cat}`}
              className={`pb-1 border-b transition-colors ${currentCategory === cat ? "border-black text-black" : "border-transparent text-neutral-400 hover:text-black"}`}
            >
              {cat}
            </Link>
          ))}
        </div>

        <DressingGrid items={items} />
      </section>
    </main>
  );
}
