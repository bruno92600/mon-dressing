"use client";

import { useState, useEffect } from "react";
import { generateTravelSuitcase, saveTravelSuitcase } from "../actions";
import DiamondLoader from "@/components/DiamondLoader";
import { toast } from "sonner";

export default function TravelForm({ allItems }) {
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState(3);
  const [departureDate, setDepartureDate] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [suitcase, setSuitcase] = useState(null);
  const [activeTab, setActiveTab] = useState("capsule");

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Date par défaut à J+7
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setDepartureDate(nextWeek.toISOString().split("T")[0]);
  }, []);

  if (!isMounted) return null;

  // Calcul du nombre de jours avant le départ pour la notification
  const getDaysBeforeDeparture = (dateStr) => {
    if (!dateStr) return null;
    const diffTime = new Date(dateStr) - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysLeft = getDaysBeforeDeparture(
    suitcase?.departureDate || departureDate,
  );

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!destination) return toast.error("Veuillez indiquer une destination.");

    setIsLoading(true);
    setSuitcase(null);
    try {
      const result = await generateTravelSuitcase(
        destination,
        days,
        departureDate,
      );
      setSuitcase(result);
      toast.success("Valise saisonnière prête !");
    } catch (error) {
      toast.error("Erreur : " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 👇 MISE À JOUR : Envoi de la ville et de la date à Prisma
  const handleSave = async () => {
    if (!suitcase) return;
    setIsSaving(true);
    try {
      // 👇 AJOUT : On transmet les prévisions météo (dailyForecasts) à la fonction de sauvegarde
      await saveTravelSuitcase(
        suitcase.title,
        suitcase.suitcaseItemIds,
        suitcase.cityName,
        suitcase.departureDate,
        suitcase.dailyForecasts,
      );
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
        className="bg-white border border-neutral-200 p-6 md:p-8 grid grid-cols-1 md:grid-cols-4 gap-6 items-end mb-12 shadow-sm"
      >
        <div className="md:col-span-2">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
            Destination
          </label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Ex: Reykjavik, Lisbonne..."
            className="w-full border-b border-neutral-300 py-2 outline-none focus:border-black transition-colors"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
            Date de départ
          </label>
          <input
            type="date"
            value={departureDate}
            onChange={(e) => setDepartureDate(e.target.value)}
            className="w-full border-b border-neutral-300 py-2 outline-none focus:border-black transition-colors text-xs"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
            Durée (jours)
          </label>
          <input
            type="number"
            min="1"
            max="14"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="w-full border-b border-neutral-300 py-2 outline-none focus:border-black transition-colors"
          />
        </div>

        <div className="md:col-span-4 flex justify-end mt-2">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full md:w-auto bg-black text-white text-xs uppercase tracking-widest py-3 px-8 hover:bg-[#C5A059] transition-colors shadow-md disabled:bg-neutral-800"
          >
            {isLoading
              ? "Analyse saisonnière..."
              : "Préparer ma valise intelligente"}
          </button>
        </div>
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

          {daysLeft !== null && daysLeft <= 7 && daysLeft >= 0 && (
            <div className="bg-[#fcfaf5] border border-[#C5A059]/40 p-4 mb-8 rounded-sm flex items-center gap-3">
              <span className="text-xl">🔔</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#C5A059]">
                  Rappel de voyage imminent
                </p>
                <p className="text-xs text-neutral-600 mt-0.5">
                  {daysLeft === 0
                    ? "C'est le grand jour ! Voici votre valise préparée."
                    : `Votre départ est dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}. Voici vos recommandations vestimentaires adaptées à la saison !`}
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-serif text-black mb-1">
                {suitcase.title}
              </h2>
              <p className="text-neutral-500 text-xs uppercase tracking-widest">
                {suitcase.cityName} • Départ le{" "}
                {new Date(suitcase.departureDate).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
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
              Aperçu météo
            </button>
          </div>

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

          {/* 👇 MISE À JOUR : Gestion des voyages à plus de 14 jours */}
          {activeTab === "meteo" && (
            <div className="animate-in fade-in duration-300">
              {suitcase.dailyForecasts ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {suitcase.dailyForecasts.map((day, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-neutral-200 p-5 rounded-sm shadow-sm flex flex-col justify-between gap-4"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[11px] uppercase tracking-widest text-[#C5A059] font-bold">
                            {day.date}
                          </p>
                          <p className="text-xs text-neutral-500 mt-1 capitalize font-medium">
                            {day.condition}
                          </p>
                        </div>
                        <span className="text-2xl">{day.icon}</span>
                      </div>

                      <div className="flex justify-between items-end border-t border-neutral-100 pt-3">
                        <div>
                          <span className="text-xs text-neutral-400 block">
                            Prob. pluie
                          </span>
                          <span className="text-xs font-semibold text-neutral-700">
                            💧 {day.rainProb}%
                          </span>
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
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-[#fcfaf5] border border-neutral-200 p-8 text-center shadow-inner">
                  <p className="text-2xl mb-3">📅</p>
                  <p className="text-sm text-neutral-500 max-w-md mx-auto">
                    Les prévisions détaillées jour par jour (pluie, soleil,
                    ciel) sont disponibles 14 jours avant le départ. L'IA a
                    composé votre valise selon les normales saisonnières.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
