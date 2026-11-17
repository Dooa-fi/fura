import Link from "next/link";

// The Fura mark + name. Colour follows the text colour, so it works in light and dark mode.
export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 font-bold text-xl tracking-tight" aria-label="Fura home">
      <span className="logo-mark w-7 h-7" aria-hidden />
      fura
    </Link>
  );
}
