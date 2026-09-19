"use client";

import { useState } from "react";

export default function ZoomableImage({ imageUrl, name }) {
  const [isZoomed, setIsZoomed] = useState(false);

  // S'il n'y a pas d'image, on affiche le bloc vide classique
  if (!imageUrl) {
    return (
      <div className="flex-1 bg-neutral-50 mb-4 flex items-center justify-center text-xs text-neutral-400 group-hover:bg-neutral-100 transition-colors">
        (Sans image)
      </div>
    );
  }

  return (
    <>
      {/* 1. L'image miniature dans la grille (cliquable) */}
      <div
        onClick={() => setIsZoomed(true)}
        className="flex-1 bg-cover bg-center mb-4 bg-neutral-50 cursor-zoom-in"
        style={{ backgroundImage: `url(${imageUrl})` }}
        title={`Agrandir ${name}`}
      />

      {/* 2. Le Modal plein écran qui s'ouvre au clic */}
      {isZoomed && (
        <div
          className="fixed inset-0 bg-white/95 backdrop-blur-sm z-[100] flex items-center justify-center p-4 md:p-12 cursor-zoom-out"
          onClick={() => setIsZoomed(false)}
        >
          <button
            className="absolute top-6 right-6 md:top-12 md:right-12 text-5xl text-neutral-400 hover:text-black transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setIsZoomed(false);
            }}
          >
            &times;
          </button>

          <img
            src={imageUrl}
            alt={name}
            className="max-w-full max-h-full object-contain shadow-2xl border border-neutral-200"
          />
        </div>
      )}
    </>
  );
}
