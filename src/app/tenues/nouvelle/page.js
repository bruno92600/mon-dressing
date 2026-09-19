import prisma from "@/lib/prisma";
import Link from "next/link";
import CreateOutfitForm from "./CreateOutfitForm";

export default async function NouvelleTenuePage({ searchParams }) {
  // On lit l'URL pour voir si on vient du bouton "Look IA" de la page Dressing
  const params = await searchParams;
  const initialItemId = params?.item || null;

  // On récupère tout le dressing
  const items = await prisma.item.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-white text-black font-sans">
      <header className="flex justify-between items-center py-6 px-6 md:px-12 border-b border-neutral-200">
        <div className="text-xl font-serif uppercase tracking-widest text-[#C5A059]">
          Mon Dressing
        </div>
        <Link
          href="/tenues"
          className="text-xs uppercase tracking-widest text-neutral-500 hover:text-black transition-colors"
        >
          &larr; Retour aux tenues
        </Link>
      </header>

      <section className="px-6 md:px-12 py-12 max-w-6xl mx-auto">
        <h1 className="text-4xl font-serif mb-2">Styliste IA</h1>
        <p className="text-neutral-500 mb-12">
          Sélectionnez une pièce, l'Intelligence Artificielle s'occupe du reste.
        </p>

        {/* On passe l'ID du vêtement pré-sélectionné à ton formulaire */}
        <CreateOutfitForm items={items} initialItemId={initialItemId} />
      </section>
    </main>
  );
}
