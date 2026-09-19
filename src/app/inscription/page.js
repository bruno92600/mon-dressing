import { SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function InscriptionPage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dressing");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#FAFAFA] p-6">
      <div className="text-center mb-12">
        <h1 className="text-5xl md:text-6xl font-serif mb-4 text-[#C5A059] uppercase tracking-widest">
          Mon Dressing
        </h1>
        <p className="text-neutral-500 tracking-wide font-serif italic text-lg">
          Votre styliste personnel propulsé par l'IA.
        </p>
      </div>

      {/* On utilise SignUp ici, et on lui dit que le bouton "Se connecter" renvoie vers l'accueil "/" */}
      <div className="shadow-2xl rounded-2xl overflow-hidden">
        <SignUp routing="hash" signInUrl="/" />
      </div>
    </main>
  );
}
