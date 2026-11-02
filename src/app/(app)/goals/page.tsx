import { PageHeader } from "@/components/app-shell/PageHeader";
import { CapabilityState } from "@/components/RouteStates";
export default function GoalsPage() { return <><PageHeader eyebrow="Personal targets" title="Goals" description="Goals are personal estimates, not medical advice." /><CapabilityState title="Goal editing is being connected" detail="The database supports versioned intake goals. The final editing flow will validate safe ranges and preserve the historical goal used with prior logs." /></>; }
