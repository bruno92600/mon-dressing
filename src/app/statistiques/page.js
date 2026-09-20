import prisma from "@/lib/prisma";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import WeatherWidget from "@/components/WeatherWidget";

export default async function StatistiquesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const clerkUser = await currentUser();
  const dbUser = await prisma.user.findUnique({
    where: { email: clerkUser.emailAddresses[0].emailAddress },
  });

  // Récupération des pièces et des tenues de l'utilisateur
  const items = dbUser
    ? await prisma.item.findMany({ where: { userId: dbUser.id } })
    : [];
  const outfits = dbUser
    ? await prisma.outfit.findMany({ where: { userId: dbUser.id } })
    : [];

  // Calculs statistiques
  const totalItems = items.length;
  const totalOutfits = outfits.length;

  // Compter par catégorie
  const categoryCounts = items.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {});

  const categoriesList = [
    "Haut",
    "Bas",
    "Chaussures",
    "Maroquinerie",
    "Accessoire",
  ];

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
            className="text-neutral-400 hover:text-black transition-colors"
          >
            Valise
          </Link>
          <Link
            href="/statistiques"
            className="border-b border-black pb-1 text-black"
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

      {/* CONTENU DU DASHBOARD */}
      <section className="px-6 md:px-12 py-12 max-w-7xl mx-auto">
        <h1 className="text-4xl font-serif mb-2 text-center md:text-left">
          Indicateurs & Data
        </h1>
        <p className="text-neutral-500 mb-12 text-center md:text-left">
          Analyse chiffrée de votre collection privée et de votre lookbook.
        </p>

        {/* GRILLE DES CHIFFRES CLÉS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white border border-neutral-200 p-8 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
              Volume Total
            </p>
            <p className="text-5xl font-serif text-black">{totalItems}</p>
            <p className="text-xs text-neutral-500 mt-2">
              Pièces enregistrées dans votre dressing
            </p>
          </div>

          <div className="bg-white border border-neutral-200 p-8 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
              Lookbook
            </p>
            <p className="text-5xl font-serif text-[#C5A059]">{totalOutfits}</p>
            <p className="text-xs text-neutral-500 mt-2">
              Tenues sauvegardées et prêtes à porter
            </p>
          </div>
        </div>

        {/* RÉPARTITION PAR CATÉGORIE */}
        <div className="bg-white border border-neutral-200 p-8 shadow-sm">
          <h3 className="font-serif text-xl mb-6 text-black">
            Répartition par Catégorie
          </h3>

          <div className="space-y-6">
            {categoriesList.map((cat) => {
              const count = categoryCounts[cat] || 0;
              const percentage =
                totalItems > 0 ? Math.round((count / totalItems) * 100) : 0;

              return (
                <div key={cat}>
                  <div className="flex justify-between text-xs uppercase tracking-widest mb-2">
                    <span className="font-bold text-neutral-700">{cat}</span>
                    <span className="text-neutral-400">
                      {count} pièce{count > 1 ? "s" : ""} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-neutral-100 h-1.5 overflow-hidden">
                    <div
                      className="bg-black h-full transition-all duration-1000"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
