import { AppHeader } from "@/components/AppHeader";
import { DriverMyJobsContent } from "@/components/driver/DriverMyJobsContent";

export default function DriverJobsPage() {
  return (
    <>
      <AppHeader title="My jobs" backHref="/driver" role="driver" />
      <DriverMyJobsContent />
    </>
  );
}
