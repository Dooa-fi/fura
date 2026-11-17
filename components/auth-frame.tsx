import { Logo } from "./logo";

// Shared frame for the sign-in and sign-up pages.
export function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen grid place-items-center px-4 py-12">
      <div className="flex flex-col items-center gap-8">
        <Logo />
        {children}
      </div>
    </main>
  );
}
