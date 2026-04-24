import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-wm-border bg-wm-secondary py-12 text-gray-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Waste Marketplace</p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-400">
              Industrial materials exchange for procurement, revenue recovery, and governed logistics execution.
            </p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm font-medium">
            <Link href="/login" className="text-gray-300 transition hover:text-white">
              Login
            </Link>
            <Link href="/signup" className="text-gray-300 transition hover:text-white">
              Create account
            </Link>
            <a href="#marketplace" className="text-gray-300 transition hover:text-white">
              Marketplace
            </a>
            <a href="#how-it-works" className="text-gray-300 transition hover:text-white">
              How it works
            </a>
          </div>
        </div>
        <p className="mt-10 text-xs text-gray-500">
          © {new Date().getFullYear()} Waste Marketplace. Enterprise features provisioned per MSA.
        </p>
      </div>
    </footer>
  );
}
