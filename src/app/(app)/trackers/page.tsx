import { PageHeader } from "@/components/app-shell/PageHeader";
import { CapabilityState } from "@/components/RouteStates";
export default function TrackersPage() { return <><PageHeader eyebrow="Your trackers" title="Trackers" description="Use custom trackers only for things you choose to record." /><CapabilityState title="No trackers yet" detail="Create a tracker after signing in. Tracker values are never pre-filled or fabricated." /></>; }
