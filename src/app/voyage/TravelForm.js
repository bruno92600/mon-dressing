"use client";

import { useState } from "react";
import { generateTravelSuitcase, saveTravelSuitcase } from "../actions";
import DiamondLoader from "@/components/DiamondLoader";
import { toast } from "sonner";

export default function TravelForm({ allItems }) {
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState(3);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [suitcase, setSuitcase] = useState(null);
  const [activeTab, setActiveTab] = useState("capsule"); // "capsule" ou "meteo"

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!destination) return toast.error("Veuillez indiquer une destination.");

    setIsLoading(true);
    setSuitcase(null);
    try {
      const result = await generateTravelSuitcase(destination, days);
      setSuitcase(result);
      toast.success("Valise prête !");
    } catch (error) {
      toast.error("Erreur : " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!suitcase) return;
    setIsSaving(true);
    try {
      await saveTravelSuitcase(suitcase.title, suitcase.suitcaseItemIds);
      toast.success("Valise sauvegardée dans vos tenues !");
    } catch (error) {
      toast.error("Erreur lors de la sauvegarde : " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form
        onSubmit={handleGenerate}
        className="bg-white border border-neutral-200 p-6 md:p-8 flex flex-col md:flex-row gap-6 items-end mb-12 shadow-sm"
      >
        <div className="w-full flex-1">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
            Destination
          </label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Ex: Madrid, Rome, Tokyo..."
            className="w-full border-b border-neutral-300 py-2 outline-none focus:border-black transition-colors"
          />
        </div>

        <div className="w-full md:w-32">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
            Durée (jours)
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="w-full border-b border-neutral-300 py-2 outline-none focus:border-black transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full md:w-auto bg-black text-white text-xs uppercase tracking-widest py-3 px-8 hover:bg-[#C5A059] transition-colors shadow-md disabled:bg-neutral-800 whitespace-nowrap"
        >
          {isLoading ? "Préparation..." : "Créer ma valise"}
        </button>
      </form>

      {isLoading && (
        <div className="mt-12">
          <DiamondLoader />
        </div>
      )}

      {!isLoading && suitcase && (
        <div className="animate-in slide-in-from-bottom-4 duration-500 bg-white border border-neutral-200 p-6 md:p-12 shadow-md relative">
          <button
            onClick={() => setSuitcase(null)}
            className="absolute top-6 right-6 text-2xl text-neutral-400 hover:text-black"
          >
            &times;
          </button>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-serif text-black mb-1">
                {suitcase.title}
              </h2>
              <p className="text-neutral-500 text-xs uppercase tracking-widest">
                {suitcase.cityName}
              </p>
            </div>

            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-black text-white text-xs uppercase tracking-widest py-3 px-6 hover:bg-[#C5A059] transition-colors disabled:bg-neutral-800"
            >
              {isSaving ? "Sauvegarde..." : "Sauvegarder la valise"}
            </button>
          </div>

          <p className="text-neutral-600 leading-relaxed mb-8 max-w-2xl text-sm md:text-base">
            {suitcase.description}
          </p>

          {/* NAVIGATION PAR ONGLET (Capsule / Météo du séjour) */}
          <div className="flex gap-8 border-b border-neutral-200 mb-8 text-xs uppercase tracking-widest font-bold">
            <button
              onClick={() => setActiveTab("capsule")}
              className={`pb-3 border-b-2 transition-colors ${activeTab === "capsule" ? "border-black text-black" : "border-transparent text-neutral-400 hover:text-black"}`}
            >
              Garde-robe capsule ({suitcase.suitcaseItemIds.length} pièces)
            </button>
            <button
              onClick={() => setActiveTab("meteo")}
              className={`pb-3 border-b-2 transition-colors ${activeTab === "meteo" ? "border-black text-black" : "border-transparent text-neutral-400 hover:text-black"}`}
            >
              Météo du séjour ({suitcase.dailyForecasts?.length || 0} jours)
            </button>
          </div>

          {/* CONTENU ONGLET 1 : CAPSULE */}
          {activeTab === "capsule" && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 animate-in fade-in duration-300">
              {suitcase.suitcaseItemIds.map((id) => {
                const item = allItems.find((i) => i.id === id);
                if (!item) return null;
                return (
                  <div key={item.id} className="flex flex-col gap-2">
                    <div
                      className="aspect-[3/4] bg-cover bg-center bg-neutral-50 border border-neutral-100"
                      style={{ backgroundImage: `url(${item.imageUrl})` }}
                    />
                    <p className="text-[10px] uppercase tracking-widest text-neutral-400">
                      {item.category}
                    </p>
                    <p className="text-xs font-serif text-black truncate">
                      {item.name}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* CONTENU ONGLET 2 : MÉTÉO JOUR PAR JOUR */}
          {activeTab === "meteo" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-in fade-in duration-300">
              {suitcase.dailyForecasts &&
                suitcase.dailyForecasts.map((day, idx) => (
                  <div
                    key={idx}
                    className="bg-[#fcfaf5] border border-neutral-200 p-4 rounded-sm flex justify-between items-center"
                  >
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-[#C5A059] font-bold">
                        {day.date}
                      </p>
                      <p className="text-xs text-neutral-600 mt-1">
                        Prévision optimale
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-serif text-black">
                        {day.max}°C
                      </span>
                      <span className="text-xs text-neutral-400 block">
                        Min {day.min}°C
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
