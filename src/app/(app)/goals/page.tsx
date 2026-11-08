import { PageHeader } from "@/components/app-shell/PageHeader";
import { GoalSetupForm } from "@/components/goals/GoalSetupForm";
export default function GoalsPage() { return <><PageHeader eyebrow="Personal targets" title="Goals" description="Set food and activity targets that work for you." /><GoalSetupForm compact /></>; }
