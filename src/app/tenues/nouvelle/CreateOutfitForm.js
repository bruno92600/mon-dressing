"use client";

import { useState } from "react";
import { generateAILooks, saveGeneratedOutfit } from "../../actions";

export default function CreateOutfitForm({ items, initialItemId }) {
  const [selectedBaseId, setSelectedBaseId] = useState(initialItemId);
  const [loading, setLoading] = useState(false);
  const [generatedLooks, setGeneratedLooks] = useState([]);

  const handleAskAI = async () => {
    if (!selectedBaseId) return;
    setLoading(true);
    try {
      const looks = await generateAILooks(selectedBaseId);
      setGeneratedLooks(looks);
    } catch (error) {
      alert("Le styliste a eu un moment d'hésitation. Réessayez !");
      console.error(error);
    }
    setLoading(false);
  };

  if (generatedLooks.length > 0) {
    return (
      <div className="flex flex-col gap-12">
        <h2 className="text-2xl font-serif text-[#C5A059]">
          Le styliste IA vous propose :
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {generatedLooks.map((look, index) => (
            <div
              key={index}
              className="border border-neutral-200 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow bg-white"
            >
              <div>
                <h3 className="font-serif text-xl mb-2">{look.name}</h3>
                <p className="text-sm text-neutral-500 mb-6 italic leading-relaxed">
                  "{look.description}"
                </p>

                <div className="flex gap-2 overflow-x-auto pb-4 mb-6">
                  {look.itemIds.map((id) => {
                    const item = items.find((i) => i.id === id);
                    if (!item) return null;
                    return (
                      <div
                        key={id}
                        className="w-16 h-24 flex-shrink-0 bg-cover bg-center bg-neutral-50 border border-neutral-100"
                        style={{ backgroundImage: `url(${item.imageUrl})` }}
                        title={item.name}
                      />
                    );
                  })}
                </div>
              </div>
              <button
                onClick={() => saveGeneratedOutfit(look.name, look.itemIds)}
                className="w-full bg-black text-white py-3 text-xs uppercase tracking-widest hover:bg-[#B533FF] transition-colors"
              >
                Sauvegarder ce look
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={() => setGeneratedLooks([])}
          className="text-xs uppercase tracking-widest text-neutral-400 hover:text-black mt-8 text-left"
        >
          &larr; Recommencer avec une autre pièce
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <label className="block text-xs uppercase tracking-widest text-neutral-500 mb-6">
          1. Choisissez la pièce maîtresse à porter aujourd'hui
        </label>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {items.map((item) => {
            const isSelected = selectedBaseId === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedBaseId(item.id)}
                className={`relative border aspect-[3/4] cursor-pointer transition-all ${isSelected ? "border-[#C5A059] ring-2 ring-[#C5A059] shadow-lg" : "border-neutral-200 hover:border-[#B533FF]"}`}
              >
                {item.imageUrl ? (
                  <div
                    className="w-full h-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${item.imageUrl})` }}
                  />
                ) : (
                  <div className="w-full h-full bg-neutral-50 flex items-center justify-center text-xs text-neutral-400">
                    Sans image
                  </div>
                )}
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-[#C5A059] text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">
                    ✓
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={handleAskAI}
        disabled={!selectedBaseId || loading}
        className="mt-8 bg-black text-white py-4 px-8 text-xs uppercase tracking-widest hover:bg-[#C5A059] transition-colors disabled:opacity-50 disabled:hover:bg-black w-full max-w-xs flex items-center justify-center"
      >
        {loading ? "Le styliste réfléchit..." : "✨ Demander à l'IA"}
      </button>
    </div>
  );
}
