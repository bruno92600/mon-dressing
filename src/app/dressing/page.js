import prisma from "@/lib/prisma";
import AddPieceModal from "./AddPieceModal";
import Link from "next/link";
import DressingGrid from "./DressingGrid";
import { UserButton } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import WeatherWidget from "@/components/WeatherWidget";

export default async function DressingPage({ searchParams }) {
  const params = await searchParams;
  const currentCategory = params?.category;

  const { userId } = await auth();
  if (!userId) redirect("/");

  const clerkUser = await currentUser();
  const userEmail = clerkUser.emailAddresses[0].emailAddress;
  const dbUser = await prisma.user.findUnique({ where: { email: userEmail } });

  // 👇 NOUVEAU : On prépare le filtre de recherche intelligemment
  const whereCondition = { userId: dbUser?.id };
  if (currentCategory) {
    whereCondition.category = currentCategory; // Ajoute le filtre uniquement si une catégorie est sélectionnée
  }

  // On applique la condition à la base de données
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
      <header className="flex flex-wrap justify-between items-center py-4 md:py-6 px-4 md:px-12 border-b border-neutral-200 bg-white gap-y-4">
        <div className="text-xl font-serif uppercase tracking-widest text-[#C5A059] order-1">
          Mon Dressing
        </div>

        <div className="flex items-center gap-3 md:gap-6 order-2 md:order-3">
          <WeatherWidget />
          <AddPieceModal />
          <UserButton afterSignOutUrl="/" />
        </div>

        <nav className="w-full md:w-auto flex justify-center md:justify-start gap-8 text-xs uppercase tracking-widest order-3 md:order-2 pb-2 md:pb-0">
          <Link href="/dressing" className="border-b border-black pb-1">
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
            className="text-neutral-400 hover:text-black transition-colors"
          >
            Profil
          </Link>
        </nav>
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
