import { AppHeader } from "@/components/AppHeader";
import { DriverEarningsContent } from "@/components/driver/DriverEarningsContent";

export default function DriverEarningsPage() {
  return (
    <>
      <AppHeader title="Earnings" backHref="/driver" role="driver" />
      <DriverEarningsContent />
    </>
  );
}
