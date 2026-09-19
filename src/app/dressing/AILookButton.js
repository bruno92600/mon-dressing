"use client";

import { useState } from "react";
import { generateAILooks, saveGeneratedOutfit } from "../actions";
import DiamondLoader from "@/components/DiamondLoader"; // NOUVEAU : Le loader chic
import { toast } from "sonner"; // NOUVEAU : Les notifications

export default function AILookButton({ item, allItems, isMulti = false }) {
  const [isLoading, setIsLoading] = useState(false);
  const [looks, setLooks] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const results = await generateAILooks(item.id);
      setLooks(results);
    } catch (error) {
      toast.error("Erreur lors de la génération : " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (look) => {
    setIsSaving(true);
    try {
      // On lance la notification juste avant la sauvegarde
      toast.success("Tenue sauvegardée avec succès !");
      await saveGeneratedOutfit(look.name, look.itemIds);
    } catch (error) {
      // Si c'est le signal de redirection de Next.js, on le laisse passer !
      if (error.message === "NEXT_REDIRECT") {
        throw error;
      }
      // Sinon, on affiche l'erreur en rouge
      toast.error("Erreur lors de la sauvegarde : " + error.message);
      setIsSaving(false);
    }
  };

  const closeModal = () => setLooks(null);

  return (
    <>
      {/* AFFICHAGE DU BOUTON (Soit sur l'image, soit dans la barre multi-sélection) */}
      {!isMulti ? (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-auto">
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="bg-black text-white text-[10px] uppercase tracking-widest py-3 px-6 whitespace-nowrap hover:bg-[#C5A059] transition-colors shadow-xl disabled:bg-neutral-800"
          >
            {isLoading ? "Réflexion..." : "✨ Look IA"}
          </button>
        </div>
      ) : (
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="bg-[#C5A059] text-black text-xs uppercase tracking-widest py-2 px-6 whitespace-nowrap hover:bg-white transition-colors rounded-full font-bold shadow-md disabled:bg-neutral-500"
        >
          {isLoading ? "Génération..." : "✨ Compléter le look"}
        </button>
      )}

      {/* 1. L'ÉCRAN DE CHARGEMENT CHIC (Pendant la réflexion de Gemini) */}
      {isLoading && <DiamondLoader />}

      {/* 2. LA FENÊTRE MODAL DES RÉSULTATS (Une fois terminé) */}
      {!isLoading && looks && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white border border-neutral-200 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-8 relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-4xl text-neutral-400 hover:text-black leading-none"
            >
              &times;
            </button>

            <div>
              <h2 className="text-3xl font-serif mb-2 text-center">
                Propositions de l'IA
              </h2>
              <p className="text-neutral-500 text-center mb-10">
                Base du look : {item.name}
              </p>

              <div className="space-y-6">
                {looks.map((look, index) => (
                  <div
                    key={index}
                    className="border border-neutral-100 p-6 flex flex-col md:flex-row gap-8 items-center hover:border-[#C5A059] transition-colors"
                  >
                    <div className="flex-1 text-center md:text-left">
                      <h3 className="font-serif text-xl mb-2">{look.name}</h3>
                      <p className="text-neutral-600 text-sm mb-6">
                        {look.description}
                      </p>
                      <button
                        onClick={() => handleSave(look)}
                        disabled={isSaving}
                        className="bg-black text-white text-xs uppercase tracking-widest py-3 px-6 hover:bg-[#C5A059] transition-colors disabled:bg-neutral-800"
                      >
                        {isSaving ? "Sauvegarde..." : "Sauvegarder ce look"}
                      </button>
                    </div>

                    <div className="flex gap-3 overflow-x-auto">
                      {look.itemIds.map((id) => {
                        const foundItem = allItems.find((i) => i.id === id);
                        if (!foundItem || !foundItem.imageUrl) return null;
                        return (
                          <div
                            key={id}
                            className="w-16 h-24 flex-shrink-0 bg-cover bg-center bg-neutral-50 border border-neutral-100"
                            style={{
                              backgroundImage: `url(${foundItem.imageUrl})`,
                            }}
                            title={foundItem.name}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
