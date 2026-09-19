"use client";

import { useState } from "react";
import { deleteItem } from "../actions";
import AILookButton from "./AILookButton";
import ZoomableImage from "./ZoomableImage";

export default function DressingGrid({ items }) {
  const [selectedIds, setSelectedIds] = useState([]);

  // Ajoute ou retire un vêtement de la sélection
  const toggleSelection = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-24">
        {items.map((item) => {
          const isSelected = selectedIds.includes(item.id);

          return (
            <div
              key={item.id}
              className={`relative aspect-[3/4] flex flex-col p-4 transition-all group border ${
                isSelected
                  ? "border-[#C5A059] shadow-lg scale-[1.02]"
                  : "border-neutral-200 hover:border-[#C5A059]"
              }`}
            >
              {/* LA CASE À COCHER */}
              <div className="absolute top-3 left-3 z-20">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelection(item.id)}
                  className="w-5 h-5 accent-[#C5A059] cursor-pointer"
                />
              </div>

              {/* Bouton de suppression */}
              <form
                action={deleteItem}
                className="absolute top-2 right-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity z-10"
              >
                <input type="hidden" name="id" value={item.id} />
                <button
                  type="submit"
                  className="bg-white/90 backdrop-blur-sm text-black w-8 h-8 rounded-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors shadow-sm text-lg cursor-pointer"
                >
                  &times;
                </button>
              </form>

              {/* Le bouton Look IA individuel disparaît si on est en mode multi-sélection */}
              {selectedIds.length === 0 && (
                <AILookButton item={item} allItems={items} />
              )}

              <ZoomableImage imageUrl={item.imageUrl} name={item.name} />

              <h3 className="font-serif text-lg truncate">{item.name}</h3>
              <p className="text-xs uppercase tracking-widest text-neutral-500">
                {item.category}
              </p>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="col-span-full py-12 text-center text-neutral-400 italic font-serif">
            Aucune pièce dans cette catégorie pour le moment.
          </div>
        )}
      </div>

      {/* LA BARRE FLOTTANTE MAGIQUE CORRIGÉE */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 inset-x-0 flex justify-center pointer-events-none z-50">
          <div className="bg-black text-white px-8 py-4 shadow-2xl flex items-center gap-6 rounded-full animate-fade-in pointer-events-auto">
            <span className="text-sm font-serif">
              {selectedIds.length} pièce{selectedIds.length > 1 ? "s" : ""}{" "}
              sélectionnée{selectedIds.length > 1 ? "s" : ""}
            </span>

            <AILookButton
              item={{ id: selectedIds, name: "Sélection multiple" }}
              allItems={items}
              isMulti={true}
            />

            <button
              onClick={() => setSelectedIds([])}
              className="text-neutral-400 hover:text-white text-2xl leading-none ml-2"
              title="Annuler la sélection"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </>
  );
}
