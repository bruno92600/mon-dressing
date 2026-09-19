import prisma from "@/lib/prisma";
import Link from "next/link";
import OutfitCard from "./OutfitCard"; // Notre nouveau composant visuel !
import { UserButton } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import WeatherWidget from "@/components/WeatherWidget";

export default async function TenuesPage() {
  // MAGIE PRISMA : On récupère les tenues ET on inclut les items liés
  const { userId } = await auth();
  if (!userId) redirect("/");

  const clerkUser = await currentUser();
  const userEmail = clerkUser.emailAddresses[0].emailAddress;
  const dbUser = await prisma.user.findUnique({ where: { email: userEmail } });

  // On récupère uniquement les tenues de CE compte
  const outfits = dbUser
    ? await prisma.outfit.findMany({
        where: { userId: dbUser.id },
        include: { items: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <main className="min-h-screen bg-[#FAFAFA] text-black font-sans">
      {/* --- HEADER RESPONSIVE TENUES --- */}
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
            className="border-b border-black pb-1 text-black"
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

      {/* CONTENU PRINCIPAL */}
      <section className="px-6 md:px-12 py-12 max-w-7xl mx-auto">
        <h1 className="text-4xl font-serif mb-2">Lookbook</h1>
        <p className="text-neutral-500 mb-12">
          Le répertoire de vos tenues générées par l'IA.
        </p>

        {outfits.length === 0 ? (
          <div className="text-center py-24 bg-white border border-neutral-200">
            <p className="text-neutral-400 italic font-serif text-lg">
              Votre lookbook est vide.
            </p>
            <p className="text-neutral-400 text-sm mt-2">
              Rendez-vous dans votre dressing pour générer votre première tenue.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* On récupère 'index' fourni par la méthode map() et on le donne à OutfitCard */}
            {outfits.map((outfit, index) => (
              <OutfitCard key={outfit.id} outfit={outfit} index={index} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
