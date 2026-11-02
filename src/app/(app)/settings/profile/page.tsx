import { PageHeader } from "@/components/app-shell/PageHeader";
import { CapabilityState } from "@/components/RouteStates";
export default function ProfileSettingsPage() { return <><PageHeader eyebrow="Settings" title="Profile" description="Your timezone determines the local date used for food logs." /><CapabilityState title="Profile editing is being finalized" detail="Display name and timezone persistence need a dedicated form with validation. The database remains the authority for your log's local date." /></>; }
