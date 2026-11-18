import { Suspense } from "react";
import { TodayDashboard } from "@/components/dashboard/TodayDashboard";

export default function TodayPage() {
  return (
    <Suspense fallback={<div className="skeleton-stack"><div /><div /><div /></div>}>
      <TodayDashboard />
    </Suspense>
  );
}
