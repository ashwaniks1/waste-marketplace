import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/Button";

export default function CustomerHomePage() {
  return (
    <>
      <AppHeader title="Home" role="customer" />
      <div className="space-y-4 px-4 pt-6">
        <p className="text-lg font-medium text-slate-800">Turn your waste into cash</p>
        <p className="text-sm text-slate-600">
          List what you are selling — nearby buyers can accept and arrange pickup.
        </p>
        <Link href="/customer/listings/new" className="block">
          <Button className="h-14 w-full text-base">Sell waste</Button>
        </Link>
        <Link
          href="/customer/listings"
          className="flex h-14 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 shadow-sm"
        >
          My listings
        </Link>
        <Link
          href="/customer/profile"
          className="flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold text-teal-800"
        >
          Profile
        </Link>
      </div>
    </>
  );
}
