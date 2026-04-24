import Link from "next/link";

const nav = [
  { href: "#marketplace", label: "Marketplace" },
  { href: "#sell", label: "Sell Waste" },
  { href: "#buy", label: "Buy Materials" },
  { href: "#logistics", label: "Logistics" },
  { href: "#how-it-works", label: "How it works" },
] as const;

export function MarketingNavbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-wm-border bg-wm-card/95 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 py-3 sm:py-4">
          <Link href="/" className="flex shrink-0 items-center gap-3 text-wm-secondary">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-wm-primary text-lg font-bold text-white shadow-sm">
              W
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-wide text-wm-primary">Waste Marketplace</p>
              <p className="truncate text-xs text-gray-600">Industrial materials exchange</p>
            </div>
          </Link>

          <nav
            className="order-3 flex w-full basis-full flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm font-medium text-gray-600 md:order-2 md:flex-1 md:basis-auto md:gap-x-6"
            aria-label="Primary"
          >
            {nav.map((item) => (
              <a key={item.href} href={item.href} className="whitespace-nowrap transition hover:text-wm-secondary">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="order-2 flex shrink-0 items-center gap-2 sm:gap-3 md:order-3">
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
              Create account
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
