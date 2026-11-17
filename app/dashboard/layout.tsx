"use client";
// app/dashboard/layout.tsx: the frame around every signed-in page: sidebar on desktop, top bar on phones.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Home, PenLine, Library, AudioLines, BookOpen } from "lucide-react";
import { Logo } from "@/components/logo";

const NAV = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/studio", label: "Studio", icon: PenLine },
  { href: "/dashboard/library", label: "Library", icon: Library },
  { href: "/onboarding", label: "Your style", icon: AudioLines },
  { href: "/how-it-works", label: "How it works", icon: BookOpen },
];

// Clerk's default avatar is colourful; show it in grayscale to match Fura's black-and-white look.
const AVATAR = { elements: { userButtonAvatarBox: "grayscale" } };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const isActive = (href: string) => (href === "/dashboard" ? path === href : path.startsWith(href));

  return (
    <div className="min-h-screen md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-60 shrink-0 border-r border-line bg-surface">
        <div className="sticky top-0 h-screen flex flex-col px-4 py-6">
        <div className="px-2"><Logo href="/dashboard" /></div>
        <nav className="mt-10 space-y-1 flex-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined}
              className={`flex items-center gap-3 rounded-xl px-3 h-11 text-[15px] font-medium transition ${isActive(href) ? "bg-soft text-ink font-semibold" : "text-muted hover:text-ink hover:bg-paper"}`}>
              <Icon className="w-[18px] h-[18px]" aria-hidden /> {label}
            </Link>
          ))}
        </nav>
        <div className="px-2 flex items-center gap-3 text-sm text-muted"><UserButton appearance={AVATAR} /> Account</div>
        </div>
      </aside>

      {/* Phone top bar */}
      <header className="md:hidden sticky top-0 z-20 bg-surface/90 backdrop-blur border-b border-line">
        <div className="flex items-center justify-between px-4 h-14">
          <Logo href="/dashboard" />
          <UserButton appearance={AVATAR} />
        </div>
        <nav className="flex gap-1 px-2 pb-2 overflow-x-auto">
          {NAV.map(({ href, label }) => (
            <Link key={href} href={href} aria-current={isActive(href) ? "page" : undefined}
              className={`shrink-0 rounded-full px-3 h-8 inline-flex items-center text-sm ${isActive(href) ? "bg-ink text-paper font-semibold" : "text-muted"}`}>
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="flex-1 min-w-0 px-4 sm:px-8 lg:px-12 py-8 lg:py-12">{children}</main>
    </div>
  );
}
