// app/page.tsx: the public home page (fura.dev).
import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { Logo } from "@/components/logo";

export default function Home() {
  return (
    <div className="overflow-x-hidden">
      <Nav />
      <Hero />
      <Steps />
      <Learns />
      <Outputs />
      <FAQ />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <header className="mx-auto max-w-6xl px-4 sm:px-6 h-20 flex items-center justify-between">
      <Logo />
      <nav className="flex items-center gap-2 sm:gap-5 text-[15px]">
        <Link href="/how-it-works" className="hidden sm:inline text-muted hover:text-ink">How it works</Link>
        <SignedOut>
          <Link href="/sign-in" className="text-muted hover:text-ink px-2">Sign in</Link>
          <Link href="/sign-up" className="btn-primary h-10 px-4">Start free</Link>
        </SignedOut>
        <SignedIn>
          <Link href="/dashboard" className="btn-primary h-10 px-4">Open Fura</Link>
        </SignedIn>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 lg:pt-16 pb-24 lg:pb-32 grid lg:grid-cols-[1.1fr_1fr] gap-14 items-center">
      <div>
        <h1 className="text-[46px] leading-[1] sm:text-[68px] xl:text-[84px] font-extrabold tracking-[-0.04em]">
          Scripts that sound like you wrote them.
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-muted max-w-[34ch] leading-relaxed">
          Upload a few of your videos. Fura learns your style from the way you talk, open and tell a story, then writes new scripts, hooks and ideas the same way.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link href="/sign-up" className="btn-primary h-12 px-7 text-base">Teach Fura your style</Link>
          <Link href="/how-it-works" className="btn-ghost h-12 px-6 text-base">See how it works</Link>
        </div>
        <p className="mt-5 text-sm text-muted">100 free credits every month. No card needed.</p>
      </div>
      <VoiceDemo />
    </section>
  );
}

// The hero picture: a clip → the phrases Fura notices → a script that reuses them.
function VoiceDemo() {
  const bars = [8, 14, 22, 12, 30, 18, 26, 10, 20, 34, 16, 24, 12, 28, 18, 9, 22, 14, 30, 12, 18, 26, 10, 16];
  return (
    <div className="relative" aria-hidden>
      <div className="panel p-5 shadow-[0_30px_60px_-30px_rgba(0,0,0,.25)]">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-coral" /> my-gym-rant.mp4
          </span>
          <span className="text-muted">0:48</span>
        </div>
        <div className="mt-4 flex items-center gap-[3px] h-10">
          {bars.map((h, i) => (
            <span key={i} className="wave-bar w-[5px] rounded-full bg-ink/80" style={{ height: h, animationDelay: `${i * 70}ms` }} />
          ))}
        </div>
        <p className="mt-4 text-[15px] leading-relaxed">
          &ldquo;<Mark>Okay real talk</Mark>, nobody tells you this about leg day. You&apos;re not lazy, you&apos;re just
          under-fed. <Mark>Trust the process</Mark>, bro.&rdquo;
        </p>
      </div>

      <div className="panel p-5 mt-4 ml-6 sm:ml-14">
        <p className="text-sm font-semibold text-muted">Your next script, written by Fura</p>
        <p className="mt-2 text-[15px] leading-relaxed">
          <Mark>Okay real talk</Mark>, you&apos;ve been skipping breakfast and blaming your genetics. Here&apos;s what
          happened when I ate before training for 30 days&hellip;
        </p>
      </div>
    </div>
  );
}

function Mark({ children }: { children: React.ReactNode }) {
  return <span className="bg-mark text-mark-ink font-semibold rounded px-1">{children}</span>;
}

function Steps() {
  const steps = [
    ["Tell Fura who you are", "Your niche, where you post, and who watches you."],
    ["Upload 3 or more clips", "Any videos or voice notes where you talk. Fura transcribes them and finds your patterns."],
    ["Write in your style", "Ask for a script, hooks or ideas. Every result uses your words, pace and catchphrases."],
  ];
  return (
    <section className="border-y border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight max-w-[22ch]">Set up once. Takes about five minutes.</h2>
        <ol className="mt-12 grid md:grid-cols-3 gap-10">
          {steps.map(([title, text], i) => (
            <li key={title}>
              <span className="text-5xl font-extrabold text-ink/15">{i + 1}</span>
              <h3 className="mt-3 text-xl font-bold">{title}</h3>
              <p className="mt-2 text-muted leading-relaxed">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// What Fura notices in your clips, shown with an example creator.
function Learns() {
  const traits = [
    ["Catchphrases", "“okay real talk”, “no excuses, just reps”"],
    ["How you open", "A blunt question, then a confession about your own mistake"],
    ["Pacing", "Short punchy lines, fast cuts, one pause before the big point"],
    ["How you talk to viewers", "Like an older brother at the gym: “bro”, “you guys”"],
    ["Words you love", "honestly, lowkey, reps, budget"],
    ["Real lines", "“You're not lazy, you're just under-fed.”"],
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-24 grid lg:grid-cols-[1fr_1.4fr] gap-12 items-start">
      <div className="lg:sticky lg:top-10">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight max-w-[16ch]">What Fura picks up from your clips</h2>
        <p className="mt-4 text-lg text-muted leading-relaxed max-w-[42ch]">
          Fura builds a short style profile from your videos. Every script, hook and idea starts from it, so nothing sounds generic.
        </p>
      </div>
      <dl className="grid sm:grid-cols-2 gap-px bg-line rounded-2xl overflow-hidden border border-line">
        {traits.map(([name, example]) => (
          <div key={name} className="bg-surface p-6">
            <dt className="font-bold">{name}</dt>
            <dd className="mt-2 text-muted leading-relaxed">{example}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Outputs() {
  const items = [
    { name: "Scripts", text: "Short-form or long-form, with a hook, body and outro. Can research the web for real facts first." },
    { name: "Hooks", text: "Seven ways to open your video, each under five seconds to say." },
    { name: "Ideas", text: "Ten video ideas that fit your niche and your audience, ready to turn into scripts." },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 py-24">
      <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">What Fura writes for you</h2>
      <div className="mt-10 divide-y divide-line border-y border-line">
        {items.map((item) => (
          <div key={item.name} className="py-7 grid sm:grid-cols-[220px_1fr] gap-2 sm:gap-10">
            <h3 className="text-2xl font-bold">{item.name}</h3>
            <p className="text-lg text-muted leading-relaxed max-w-[60ch]">{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

const FAQS = [
  ["How many clips do I need?", "Three is enough to start, ten is ideal. Use clips where you talk a lot: vlogs, rants, explainers, podcasts. Each file can be up to 50 MB."],
  ["What does it cost?", "Nothing. You get 100 free credits every month and no card is needed. A script uses 2 credits, a set of hooks or ideas uses 1."],
  ["Will it sound like AI wrote it?", "That's the whole point of Fura. It writes from your real lines, your catchphrases and your pace, and it's told to avoid the phrases AI tools overuse. Read it out loud and edit anything that feels off."],
  ["Does it work if I mix languages?", "Yes. Fura detects the language in each clip. If you switch between languages, like Hindi and English, it notices and keeps that mix in what it writes."],
  ["Who can see my clips?", "Only you. Clips go into private storage that only Fura's server can open, and they're used only to learn your style."],
  ["Can it use real facts?", "Yes. Tick “Research the web first” when you write a script. Fura looks up current facts and lists the sources under the script."],
  ["Can I change my style later?", "Any time. Upload more clips from “Your style” and Fura rebuilds your profile with the new ones."],
];

function FAQ() {
  return (
    <section className="border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-24 grid lg:grid-cols-[1fr_1.4fr] gap-12 items-start">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Questions creators ask</h2>
        <div className="divide-y divide-line border-y border-line">
          {FAQS.map(([q, a]) => (
            <details key={q} className="group py-5">
              <summary className="flex justify-between items-center gap-6 cursor-pointer list-none text-lg font-semibold [&::-webkit-details-marker]:hidden">
                {q}
                <span aria-hidden className="grid place-items-center w-8 h-8 shrink-0 rounded-full border border-line text-xl leading-none transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-muted leading-relaxed max-w-[62ch]">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-ink text-paper">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20 flex flex-col md:flex-row md:items-end justify-between gap-10">
        <div>
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight max-w-[16ch]">Stop staring at a blank page.</h2>
          <Link href="/sign-up" className="btn mt-8 bg-paper text-ink hover:opacity-90">Start free</Link>
        </div>
        <div className="text-sm opacity-70 space-y-2">
          <Link href="/how-it-works" className="block hover:opacity-100 underline underline-offset-4">How Fura works, step by step</Link>
          <p>© {new Date().getFullYear()} Fura · fura.dev</p>
        </div>
      </div>
    </footer>
  );
}
