"use client";

import { useState } from "react";
import { generateAILooks, saveGeneratedOutfit } from "../actions";
import DiamondLoader from "@/components/DiamondLoader";
import { toast } from "sonner";

export default function AILookButton({
  item,
  allItems,
  isMulti = false,
  isCarteBlanche = false,
  selectedEvent,
  selectedMood,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [looks, setLooks] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTomorrow, setIsTomorrow] = useState(false);

  // 👇 NOUVEL ÉTAT : Pour stocker l'image sur laquelle on a cliqué
  const [zoomedImage, setZoomedImage] = useState(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      let userCoords = null;
      if ("geolocation" in navigator) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 4000,
            });
          });
          userCoords = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          };
        } catch (err) {
          console.warn("Géolocalisation refusée, utilisation par défaut.");
        }
      }

      const results = await generateAILooks(
        isCarteBlanche ? [] : item.id,
        selectedEvent,
        selectedMood,
        userCoords,
        isTomorrow,
      );
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
      toast.success("Tenue sauvegardée avec succès !");
      await saveGeneratedOutfit(look.name, look.itemIds);
    } catch (error) {
      if (error.message === "NEXT_REDIRECT") throw error;
      toast.error("Erreur lors de la sauvegarde : " + error.message);
      setIsSaving(false);
    }
  };

  const handleShare = async (look) => {
    const shareText = `Découvre cette tenue proposée par mon IA styliste : "${look.name}" !\n\n${look.description}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: look.name,
          text: shareText,
        });
      } catch (err) {
        console.log("Partage annulé ou ignoré.");
      }
    } else {
      navigator.clipboard.writeText(shareText);
      toast.success("Description copiée dans le presse-papier !");
    }
  };

  const closeModal = () => setLooks(null);

  return (
    <>
      {isCarteBlanche ? (
        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-sm text-[10px] font-bold uppercase tracking-widest text-neutral-400 w-full md:w-auto justify-center">
            <button
              onClick={() => setIsTomorrow(false)}
              className={`py-2 px-4 transition-colors w-1/2 md:w-auto ${!isTomorrow ? "bg-white text-black shadow-sm" : "hover:text-black"}`}
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => setIsTomorrow(true)}
              className={`py-2 px-4 transition-colors w-1/2 md:w-auto ${isTomorrow ? "bg-white text-black shadow-sm" : "hover:text-black"}`}
            >
              Demain
            </button>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full md:w-auto bg-black text-white text-[10px] md:text-xs uppercase tracking-widest py-3 md:py-2.5 px-8 hover:bg-[#C5A059] transition-colors shadow-md disabled:bg-neutral-800 whitespace-nowrap"
          >
            {isLoading ? "Réflexion..." : "✨ Look 100% IA"}
          </button>
        </div>
      ) : !isMulti ? (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all z-10 pointer-events-auto w-[85%] md:w-auto flex justify-center">
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="w-full md:w-auto bg-black/70 md:bg-black backdrop-blur-md md:backdrop-blur-none text-white text-[9px] md:text-[10px] uppercase tracking-widest py-2.5 md:py-3 px-4 md:px-6 whitespace-nowrap hover:bg-[#C5A059] transition-colors shadow-md md:shadow-xl disabled:bg-neutral-800 rounded-full md:rounded-none border border-white/20 md:border-none"
          >
            {isLoading ? "..." : "✨ Look IA"}
          </button>
        </div>
      ) : (
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="bg-[#C5A059] text-black text-xs uppercase tracking-widest py-2 px-6 whitespace-nowrap hover:bg-white transition-colors rounded-full font-bold shadow-md disabled:bg-neutral-500"
        >
          {isLoading ? "Génération..." : "✨ Compléter"}
        </button>
      )}

      {isLoading && <DiamondLoader />}

      {!isLoading && looks && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
          <div className="bg-white border border-neutral-200 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative">
            <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-neutral-100 p-4 md:p-6 flex justify-between items-center z-20">
              <div>
                <h2 className="text-xl md:text-2xl font-serif">
                  Propositions de l'IA
                </h2>
                <p className="text-neutral-500 text-[10px] md:text-xs uppercase tracking-widest mt-1">
                  {isCarteBlanche
                    ? `Choix libre pour ${isTomorrow ? "demain" : "aujourd'hui"}`
                    : `Base du look : ${item?.name}`}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-4xl text-neutral-400 hover:text-black leading-none transition-colors"
              >
                &times;
              </button>
            </div>

            <div className="p-4 md:p-6 space-y-12">
              {looks.map((look, index) => (
                <div key={index} className="flex flex-col gap-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h3 className="font-serif text-xl md:text-2xl text-black">
                      {look.name}
                    </h3>

                    <div className="flex gap-2 w-full md:w-auto">
                      <button
                        onClick={() => handleShare(look)}
                        className="bg-neutral-100 text-black p-3 md:py-3 md:px-4 hover:bg-neutral-200 transition-colors flex items-center justify-center shrink-0 border border-neutral-200"
                        title="Partager ce look"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="w-4 h-4 md:w-5 md:h-5"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z"
                          />
                        </svg>
                      </button>

                      <button
                        onClick={() => handleSave(look)}
                        disabled={isSaving}
                        className="bg-black text-white text-[10px] md:text-xs uppercase tracking-widest py-3 px-4 md:px-6 hover:bg-[#C5A059] transition-colors disabled:bg-neutral-800 flex-1 md:flex-none text-center"
                      >
                        {isSaving ? "En cours..." : "Sauvegarder"}
                      </button>
                    </div>
                  </div>

                  <p className="text-neutral-600 text-sm md:text-base leading-relaxed">
                    {look.description}
                  </p>

                  <div>
                    <h4 className="text-[10px] uppercase tracking-widest text-neutral-400 mb-4">
                      Les pièces de votre dressing
                    </h4>
                    <div className="flex gap-4 overflow-x-auto pb-4">
                      {look.itemIds.map((id) => {
                        const foundItem = allItems.find((i) => i.id === id);
                        if (!foundItem || !foundItem.imageUrl) return null;
                        return (
                          <div
                            key={id}
                            // 👇 On rend la zone cliquable pour activer le zoom
                            onClick={() => setZoomedImage(foundItem.imageUrl)}
                            className="w-20 h-28 md:w-24 md:h-32 flex-shrink-0 overflow-hidden border border-neutral-200 shadow-sm rounded-sm cursor-zoom-in"
                          >
                            <div
                              className="w-full h-full bg-cover bg-center bg-neutral-50 transition-transform duration-500 hover:scale-110"
                              style={{
                                backgroundImage: `url(${foundItem.imageUrl})`,
                              }}
                              title={foundItem.name}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {look.shoppingSuggestions &&
                    look.shoppingSuggestions.length > 0 && (
                      <div className="bg-[#fcfaf5] border border-[#C5A059]/30 rounded-lg p-4 md:p-5 mt-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#C5A059] mb-4 flex items-center gap-2">
                          <span>💡</span> Conseil Shopping pour sublimer le look
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {look.shoppingSuggestions.map((sugg, idx) => {
                            const safeQuery =
                              sugg.searchQueryEn ||
                              sugg.itemToBuy ||
                              "fashion item";
                            const imagePrompt = `minimalist ${safeQuery} product shot isolated on white background`;
                            const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=200&height=200&nologo=true`;

                            return (
                              <div
                                key={idx}
                                className="flex gap-4 items-center bg-white p-3 border border-neutral-100 rounded-md shadow-sm"
                              >
                                <div
                                  // 👇 On rend la zone cliquable pour activer le zoom
                                  onClick={() => setZoomedImage(imageUrl)}
                                  className="w-16 h-16 md:w-20 md:h-20 flex-shrink-0 overflow-hidden rounded border border-neutral-200 bg-neutral-50 relative cursor-zoom-in"
                                >
                                  <img
                                    src={imageUrl}
                                    alt={sugg.itemToBuy}
                                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src =
                                        "https://placehold.co/200x200/fcfaf5/c5a059?text=Suggestion\\nShopping";
                                    }}
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-xs md:text-sm text-black truncate">
                                    {sugg.itemToBuy}
                                  </p>
                                  <p className="text-neutral-500 text-[10px] md:text-xs mt-1 leading-snug line-clamp-2">
                                    {sugg.reason}
                                  </p>
                                  {sugg.brands && sugg.brands.length > 0 && (
                                    <div className="mt-2 md:mt-3 flex flex-wrap gap-2 items-center">
                                      {sugg.brands.map((brand, bIdx) => {
                                        const searchQuery = encodeURIComponent(
                                          `${brand} ${sugg.itemToBuy}`,
                                        );
                                        return (
                                          <a
                                            key={bIdx}
                                            href={`https://www.google.com/search?tbm=shop&q=${searchQuery}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[9px] md:text-[10px] bg-white hover:bg-[#C5A059] hover:text-white transition-colors px-2 py-1 rounded border border-neutral-200 text-neutral-700 font-medium flex items-center gap-1 shadow-sm"
                                          >
                                            {brand}{" "}
                                            <span className="text-[7px] md:text-[8px] opacity-70">
                                              ↗
                                            </span>
                                          </a>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  {index < looks.length - 1 && (
                    <hr className="border-t border-neutral-200 my-8" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 👇 NOUVEAU : La Lightbox pour afficher l'image en plein écran */}
      {zoomedImage && (
        <div
          className="fixed inset-0 bg-white/95 backdrop-blur-sm z-[60] flex items-center justify-center p-4 md:p-8 cursor-zoom-out animate-in fade-in duration-200"
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
