import { PageHeader } from "@/components/app-shell/PageHeader";
import { InsightsExperience } from "@/components/insights/InsightsExperience";

export default function InsightsPage() {
  return (
    <>
      <PageHeader eyebrow="Insights" title="Your eating patterns" description="Based only on what you logged. Days you didn’t log are left out, not counted as zero." />
      <InsightsExperience />
    </>
  );
}
