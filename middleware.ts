// middleware.ts: runs before every page load.
// Pages under /dashboard and /onboarding need you to be signed in; Clerk sends you to /sign-in if not.
// (API routes check sign-in themselves in lib/route.ts so they can answer with JSON.)
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const needsLogin = createRouteMatcher(["/dashboard(.*)", "/onboarding(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (needsLogin(req)) await auth.protect();
});

export const config = {
  matcher: ["/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico)).*)", "/(api|trpc)(.*)"],
};
