"use client";

import { deleteOutfit } from "../actions";

// On ajoute 'index' dans les paramètres (avec 0 par défaut)
export default function OutfitCard({ outfit, index = 0 }) {
  const date = new Date(outfit.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      className="animate-slide-up border border-neutral-200 p-6 md:p-8 hover:border-[#C5A059] transition-colors relative group bg-white shadow-sm hover:shadow-md"
      /* La magie est ici : chaque carte attend 150 millisecondes de plus que la précédente */
      style={{ animationDelay: `${index * 300}ms` }}
    >
      {/* BOUTON DE SUPPRESSION (Invisible par défaut, apparaît au survol) */}
      <form
        action={deleteOutfit}
        className="absolute top-4 right-4 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity z-10"
      >
        <input type="hidden" name="id" value={outfit.id} />
        <button
          type="submit"
          className="bg-neutral-100/80 backdrop-blur-sm text-neutral-400 w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors text-lg cursor-pointer"
          title="Supprimer ce look"
        >
          &times;
        </button>
      </form>

      {/* EN-TÊTE DU LOOK */}
      <div className="mb-8 pr-8">
        <h2 className="font-serif text-2xl md:text-3xl mb-1 text-black">
          {outfit.styleNotes}
        </h2>
        <p className="text-[10px] uppercase tracking-widest text-neutral-400">
          Créé le {date}
        </p>
      </div>

      {/* CARROUSEL HORIZONTAL DES VÊTEMENTS */}
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
        {outfit.items.map((item) => (
          <div
            key={item.id}
            className="snap-start shrink-0 w-32 md:w-40 flex flex-col gap-3 group/item"
          >
            {item.imageUrl ? (
              <div
                className="aspect-[3/4] bg-cover bg-center bg-neutral-50 border border-neutral-100 transition-transform group-hover/item:scale-[1.02]"
                style={{ backgroundImage: `url(${item.imageUrl})` }}
              />
            ) : (
              <div className="aspect-[3/4] bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-300 text-xs">
                Sans image
              </div>
            )}

            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-neutral-500 truncate mb-1">
                {item.category}
              </p>
              <p className="text-xs font-serif truncate text-black">
                {item.name}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
