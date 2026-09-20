"use client";

import { useState } from "react";
import { deleteItem } from "../actions";
import AILookButton from "./AILookButton";
import ZoomableImage from "./ZoomableImage";

export default function DressingGrid({ items }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState("");

  // 👇 NOUVEAU : État pour mémoriser l'humeur
  const [selectedMood, setSelectedMood] = useState("");

  const events = [
    "☕ Quotidien",
    "💼 Bureau",
    "🤝 Entretien pro",
    "🍽️ Dîner / Soirée",
    "🎉 Anniversaire / Fête",
    "💍 Mariage",
  ];

  // 👇 NOUVEAU : Liste des humeurs
  const moods = [
    "😌 Confort",
    "🖤 Minimaliste",
    "✨ Audacieux",
    "👑 Chic",
    "🎨 Créatif",
    "🌸 Romantique",
  ];

  const toggleSelection = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  return (
    <>
      {/* Bloc d'options (Événement + Humeur + Bouton) */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="w-full md:w-auto overflow-hidden flex flex-col gap-4">
          {/* Ligne 1 : Événements */}
          <div>
            <h2 className="text-xs uppercase tracking-widest text-neutral-500 mb-3">
              Pour quelle occasion ?
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {events.map((evt) => (
                <button
                  key={evt}
                  onClick={() =>
                    setSelectedEvent(selectedEvent === evt ? "" : evt)
                  }
                  className={`whitespace-nowrap px-5 py-2 rounded-full text-sm border transition-colors cursor-pointer ${
                    selectedEvent === evt
                      ? "bg-black text-white border-black shadow-md"
                      : "bg-white text-neutral-600 border-neutral-200 hover:border-[#C5A059]"
                  }`}
                >
                  {evt}
                </button>
              ))}
            </div>
          </div>

          {/* 👇 NOUVEAU : Ligne 2 : Humeur */}
          <div>
            <h2 className="text-xs uppercase tracking-widest text-neutral-500 mb-3">
              Humeur du jour
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {moods.map((mood) => (
                <button
                  key={mood}
                  onClick={() =>
                    setSelectedMood(selectedMood === mood ? "" : mood)
                  }
                  className={`whitespace-nowrap px-5 py-2 rounded-full text-sm border transition-colors cursor-pointer ${
                    selectedMood === mood
                      ? "bg-[#C5A059] text-white border-[#C5A059] shadow-md font-medium"
                      : "bg-white text-neutral-600 border-neutral-200 hover:border-[#C5A059]"
                  }`}
                >
                  {mood}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Le bouton Look 100% IA (qui reçoit maintenant l'humeur) */}
        <div className="w-full md:w-auto flex-shrink-0 pb-2">
          <AILookButton
            isCarteBlanche={true}
            allItems={items}
            selectedEvent={selectedEvent}
            selectedMood={selectedMood}
          />
        </div>
      </div>

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
              <div className="absolute top-3 left-3 z-20">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelection(item.id)}
                  className="w-5 h-5 accent-[#C5A059] cursor-pointer"
                />
              </div>

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

              {/* Bouton IA individuel (qui reçoit l'humeur) */}
              {selectedIds.length === 0 && (
                <AILookButton
                  item={item}
                  allItems={items}
                  selectedEvent={selectedEvent}
                  selectedMood={selectedMood}
                />
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

      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 inset-x-0 flex justify-center pointer-events-none z-50">
          <div className="bg-black text-white px-8 py-4 shadow-2xl flex items-center gap-6 rounded-full animate-fade-in pointer-events-auto">
            <span className="text-sm font-serif">
              {selectedIds.length} pièce{selectedIds.length > 1 ? "s" : ""}{" "}
              sélectionnée{selectedIds.length > 1 ? "s" : ""}
            </span>

            {/* Bouton IA multiple (qui reçoit l'humeur) */}
            <AILookButton
              item={{ id: selectedIds, name: "Sélection multiple" }}
              allItems={items}
              isMulti={true}
              selectedEvent={selectedEvent}
              selectedMood={selectedMood}
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
