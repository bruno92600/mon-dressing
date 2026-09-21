"use client";

import { useState } from "react";
import { deleteOutfit } from "../actions";
import { toast } from "sonner";

export default function OutfitCard({ outfit, index = 0 }) {
  const [zoomedImage, setZoomedImage] = useState(null);

  const date = new Date(outfit.createdAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const handleShare = async () => {
    const itemNames = outfit.items.map((item) => item.name).join(", ");
    const shareText = `Regarde cette tenue de mon Lookbook : "${outfit.styleNotes}" !\n\nElle est composée de : ${itemNames}.`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: outfit.styleNotes,
          text: shareText,
        });
      } catch (err) {
        console.log("Partage annulé ou ignoré.");
      }
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success("Tenue copiée dans le presse-papier !");
    }
  };

  // On extrait les données de voyage si elles existent
  const travelData = outfit.travelData;

  return (
    <>
      <div
        className="animate-slide-up border border-neutral-200 p-6 md:p-8 hover:border-[#C5A059] transition-colors relative group bg-white shadow-sm hover:shadow-md flex flex-col h-full justify-between"
        style={{ animationDelay: `${index * 300}ms` }}
      >
        <div>
          {/* CONTENEUR DES BOUTONS D'ACTION */}
          <div className="absolute top-4 right-4 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-2">
            <button
              onClick={handleShare}
              className="bg-neutral-100/80 backdrop-blur-sm text-neutral-500 w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#C5A059] hover:text-white transition-colors cursor-pointer shadow-sm"
              title="Partager ce look"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z"
                />
              </svg>
            </button>

            <form action={deleteOutfit}>
              <input type="hidden" name="id" value={outfit.id} />
              <button
                type="submit"
                className="bg-neutral-100/80 backdrop-blur-sm text-neutral-400 w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors text-lg cursor-pointer shadow-sm"
                title="Supprimer ce look"
              >
                &times;
              </button>
            </form>
          </div>

          {/* EN-TÊTE DU LOOK */}
          <div className="mb-8 pr-20">
            <h2 className="font-serif text-2xl md:text-3xl mb-1 text-black">
              {outfit.styleNotes.replace(/\[VALISE\]/, "").trim()}
            </h2>
            <p className="text-[10px] uppercase tracking-widest text-neutral-400">
              Créé le {date}
            </p>
          </div>

          {/* CARROUSEL HORIZONTAL DES VÊTEMENTS */}
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar mb-4">
            {outfit.items.map((item) => (
              <div
                key={item.id}
                className="snap-start shrink-0 w-32 md:w-40 flex flex-col gap-3 group/item"
              >
                {item.imageUrl ? (
                  <div
                    onClick={() => setZoomedImage(item.imageUrl)}
                    className="aspect-[3/4] bg-cover bg-center bg-neutral-50 border border-neutral-100 transition-transform group-hover/item:scale-[1.02] cursor-zoom-in"
                    style={{ backgroundImage: `url(${item.imageUrl})` }}
                    title={item.name}
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

        {/* 👇 NOUVEAU : SECTION MÉTÉO (S'affiche uniquement si c'est une valise) */}
        {travelData && (
          <div className="border-t border-neutral-100 pt-6 mt-4">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">✈️</span>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#C5A059]">
                  Détails du voyage
                </h3>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  {travelData.cityName} • Départ le{" "}
                  {new Date(travelData.departureDate).toLocaleDateString(
                    "fr-FR",
                    { day: "numeric", month: "long", year: "numeric" },
                  )}
                </p>
              </div>
            </div>

            {travelData.dailyForecasts ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {travelData.dailyForecasts.map((day, idx) => (
                  <div
                    key={idx}
                    className="bg-[#fcfaf5] border border-neutral-200 p-3 rounded-sm flex flex-col justify-between gap-3 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-[#C5A059] font-bold">
                          {day.date}
                        </p>
                        <p className="text-[10px] text-neutral-600 mt-1 capitalize font-medium line-clamp-1">
                          {day.condition}
                        </p>
                      </div>
                      <span className="text-lg">{day.icon}</span>
                    </div>

                    <div className="flex justify-between items-end border-t border-neutral-200/60 pt-2">
                      <div>
                        <span className="text-[9px] text-neutral-400 block">
                          Pluie
                        </span>
                        <span className="text-[10px] font-semibold text-neutral-700">
                          💧 {day.rainProb}%
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-serif text-black">
                          {day.max}°C
                        </span>
                        <span className="text-[9px] text-neutral-400 block">
                          Min {day.min}°C
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#fcfaf5] border border-neutral-200 p-4 text-center">
                <p className="text-xs text-neutral-500">
                  Prévisions détaillées indisponibles (départ à plus de 14
                  jours).
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {zoomedImage && (
        <div
          className="fixed inset-0 bg-white/95 backdrop-blur-sm z-[100] flex items-center justify-center p-4 md:p-8 cursor-zoom-out animate-in fade-in duration-200"
          onClick={() => setZoomedImage(null)}
        >
          <button
            className="absolute top-6 right-6 md:top-10 md:right-10 text-4xl text-neutral-400 hover:text-black transition-colors"
            onClick={() => setZoomedImage(null)}
          >
            &times;
          </button>
          <img
            src={zoomedImage}
            alt="Vue détaillée"
            className="max-w-full max-h-[85vh] object-contain rounded-md shadow-2xl"
          />
        </div>
      )}
    </>
  );
}
