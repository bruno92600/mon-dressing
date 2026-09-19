import { clerkMiddleware } from "@clerk/nextjs/server";

// On lance le middleware à vide. Son seul but est d'initialiser
// la session Clerk pour que auth() fonctionne dans nos pages.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Indique à Next.js de lancer ce middleware partout, SAUF sur les fichiers statiques (images, CSS)
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
