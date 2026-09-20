"use client";

import { useState } from "react";
import { saveItem, analyzeImageWithAI } from "../actions";
import { CldUploadWidget } from "next-cloudinary";
import { useRouter } from "next/navigation";

export default function AddPieceModal() {
  const router = useRouter();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Haut");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 👇 Nouvel état pour stocker le message d'erreur
  const [errorMessage, setErrorMessage] = useState("");

  const resetForm = () => {
    setImageUrl("");
    setName("");
    setCategory("Haut");
    setIsAnalyzing(false);
    setErrorMessage(""); // On nettoie l'erreur
    setIsModalOpen(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("name", name);
    formData.append("category", category);
    formData.append("imageUrl", imageUrl);

    await saveItem(formData);

    resetForm();
    router.refresh();
  };

  const handleUploadSuccess = async (result) => {
    if (!result || !result.info || !result.info.secure_url) return;

    const uploadedUrl = result.info.secure_url;
    setImageUrl(uploadedUrl);
    setErrorMessage(""); // On efface les anciennes erreurs au nouvel upload

    setIsAnalyzing(true);
    try {
      const aiResult = await analyzeImageWithAI(uploadedUrl);
      if (aiResult) {
        if (aiResult.name) setName(aiResult.name);
        if (aiResult.category) setCategory(aiResult.category);
      }
    } catch (error) {
      console.error("Erreur lors de l'auto-tagging :", error);
      // 👇 Si l'IA plante (quota ou autre), on affiche notre beau message
      setErrorMessage("L'IA se repose, veuillez réessayer dans 20 secondes.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="text-xs uppercase tracking-widest bg-black text-white px-4 py-2 hover:bg-[#C5A059] transition-colors cursor-pointer shadow-md"
      >
        + Ajouter
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md p-8 shadow-2xl relative">
            <button
              onClick={resetForm}
              className="absolute top-4 right-4 text-neutral-400 hover:text-black text-xl"
            >
              &times;
            </button>
            <h2 className="text-2xl font-serif uppercase tracking-widest mb-6">
              Nouvelle Pièce
            </h2>

            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="mb-2">
                <CldUploadWidget
                  uploadPreset="dressing_preset"
                  options={{ sources: ["local", "camera"] }}
                  onSuccess={(result) => handleUploadSuccess(result)}
                >
                  {({ open }) => {
                    return (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          open();
                        }}
                        className={`w-full border-2 border-dashed p-4 text-center transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[160px] relative ${
                          isAnalyzing
                            ? "border-[#C5A059] bg-[#C5A059]/5"
                            : errorMessage
                              ? "border-red-400 bg-red-50"
                              : "border-neutral-300 hover:border-black"
                        }`}
                      >
                        {imageUrl ? (
                          <>
                            <img
                              src={imageUrl}
                              alt="Aperçu"
                              className="max-h-32 object-contain"
                            />
                            {isAnalyzing && (
                              <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center text-[#C5A059]">
                                <div className="w-8 h-8 border-2 border-[#C5A059] border-t-transparent rounded-full animate-spin mb-2"></div>
                                <span className="text-xs uppercase tracking-widest font-bold">
                                  L'IA analyse...
                                </span>
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-sm text-neutral-400">
                            📸 Cliquez pour ajouter ou prendre une photo
                          </span>
                        )}
                      </button>
                    );
                  }}
                </CldUploadWidget>

                {/* 👇 Affichage chic du message d'erreur s'il y en a un */}
                {errorMessage && (
                  <p className="text-red-500 text-[10px] uppercase tracking-widest text-center mt-3 font-bold">
                    ⚠️ {errorMessage}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-neutral-500 mb-1">
                  Nom de l'article
                </label>
                <input
                  name="name"
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isAnalyzing}
                  placeholder={
                    errorMessage
                      ? "Saisissez manuellement..."
                      : "L'IA s'en occupe..."
                  }
                  className="w-full border-b border-black py-2 outline-none focus:border-[#C5A059] transition-colors disabled:text-neutral-400 disabled:border-neutral-200"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-neutral-500 mb-1 mt-4">
                  Catégorie
                </label>
                <select
                  name="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={isAnalyzing}
                  className="w-full border-b border-black py-2 outline-none focus:border-[#C5A059] transition-colors bg-white disabled:text-neutral-400 disabled:border-neutral-200"
                >
                  <option>Haut</option>
                  <option>Bas</option>
                  <option>Chaussures</option>
                  <option>Maroquinerie</option>
                  <option>Accessoire</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={!imageUrl || isAnalyzing}
                className="mt-6 bg-black text-white py-4 text-xs uppercase tracking-widest hover:bg-[#C5A059] transition-colors disabled:bg-neutral-300 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? "Analyse en cours..." : "Sauvegarder la pièce"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
