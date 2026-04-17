import Link from "next/link";

export function MarketingNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/80 bg-slate-950/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 text-white">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/90 text-lg font-bold shadow-lg shadow-emerald-500/20">
            W
          </span>
          <div>
            <p className="text-sm font-semibold tracking-[0.18em] uppercase text-emerald-200">Waste Marketplace</p>
            <p className="text-xs text-slate-300">Recycle, resell, reuse</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-slate-200 md:flex">
          <a href="#how-it-works" className="transition hover:text-white">
            How it works
          </a>
          <a href="#sellers" className="transition hover:text-white">
            Sellers
          </a>
          <a href="#buyers" className="transition hover:text-white">
            Buyers
          </a>
          <a href="#drivers" className="transition hover:text-white">
            Drivers
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login" className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/15">
            Login
          </Link>
          <Link href="/signup" className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400">
            Signup
          </Link>
        </div>
      </div>
    </header>
  );
}
