export default function DiamondLoader() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/80 backdrop-blur-md">
      {/* Le centre de l'animation */}
      <div className="relative flex items-center justify-center w-32 h-32 mb-4">
        {/* L'anneau fin (rappelant une chaîne en or) */}
        <div className="absolute w-16 h-16 rounded-full border border-[#C5A059] opacity-30 animate-ping"></div>

        {/* Le diamant principal (façon serti clos) */}
        <div className="absolute w-4 h-4 bg-white border border-[#C5A059] rotate-45 shadow-[0_0_15px_rgba(197,160,89,0.4)] animate-pulse"></div>

        {/* La pluie d'éclats (petits losanges dorés et argentés) */}
        <div
          className="absolute w-2 h-2 bg-[#C5A059] rotate-45 animate-bounce"
          style={{ top: "10%", left: "20%", animationDuration: "1.5s" }}
        ></div>
        <div
          className="absolute w-1.5 h-1.5 bg-[#C5A059] rotate-45 animate-bounce"
          style={{ top: "30%", right: "15%", animationDuration: "2s" }}
        ></div>
        <div
          className="absolute w-2 h-2 border border-[#C5A059] rotate-45 animate-bounce"
          style={{ bottom: "20%", left: "30%", animationDuration: "1.8s" }}
        ></div>
        <div
          className="absolute w-1.5 h-1.5 bg-neutral-300 rotate-45 animate-bounce"
          style={{ bottom: "40%", right: "30%", animationDuration: "2.2s" }}
        ></div>
        <div
          className="absolute w-1 h-1 bg-neutral-400 rotate-45 animate-bounce"
          style={{ top: "50%", left: "10%", animationDuration: "1.2s" }}
        ></div>
      </div>

      <p className="text-[#C5A059] font-serif tracking-widest uppercase text-xs animate-pulse mt-4">
        L'IA confectionne votre tenue...
      </p>
    </div>
  );
}
