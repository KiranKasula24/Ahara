import { PageHeader } from "@/components/app-shell/PageHeader";
import { ActivityExperience } from "@/components/activity/ActivityExperience";

export default function ActivityPage() {
  return (
    <>
      <PageHeader eyebrow="Activity" title="Movement and trackers" description="Log steps and workouts, and keep your own daily trackers." />
      <div className="activity-layout"><ActivityExperience /></div>
    </>
  );
}
