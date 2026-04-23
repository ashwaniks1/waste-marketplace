import Link from "next/link";

export function MarketingNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-wm-border bg-wm-card/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3 text-wm-secondary">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-wm-primary text-lg font-bold text-white shadow-sm">
            W
          </span>
          <div>
            <p className="text-sm font-semibold tracking-wide text-wm-primary">Waste Marketplace</p>
            <p className="text-xs text-gray-600">Recycle, resell, reuse</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-gray-600 md:flex">
          <a href="#how-it-works" className="transition hover:text-wm-secondary">
            How it works
          </a>
          <a href="#categories" className="transition hover:text-wm-secondary">
            Categories
          </a>
          <a href="#why-us" className="transition hover:text-wm-secondary">
            Why us
          </a>
          <a href="#preview" className="transition hover:text-wm-secondary">
            Preview
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-wm-secondary transition hover:bg-gray-50"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="rounded-xl bg-[#22C55E] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
          >
            Sign up
          </Link>
        </div>
      </div>
    </header>
  );
}
