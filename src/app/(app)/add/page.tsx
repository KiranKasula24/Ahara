import { Suspense } from "react";
import { AddFoodExperience } from "@/components/food/AddFoodExperience";

export default function AddPage() {
  return (
    <Suspense fallback={<div className="skeleton-stack"><div /><div /></div>}>
      <AddFoodExperience />
    </Suspense>
  );
}
