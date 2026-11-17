import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen grid place-items-center px-4 text-center">
      <div>
        <p className="text-7xl font-extrabold tracking-tight">404</p>
        <p className="mt-3 text-muted">This page doesn&apos;t exist.</p>
        <Link href="/" className="btn-primary mt-8">Go to the home page</Link>
      </div>
    </main>
  );
}
