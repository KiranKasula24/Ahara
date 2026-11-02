import Link from "next/link";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { CapabilityState } from "@/components/RouteStates";
export default function HistoryPage() { return <><PageHeader eyebrow="Food history" title="Past days" description="Browse previous diary dates without changing their frozen nutrition snapshots." action={<Link className="button secondary" href="/log">Open diary</Link>} /><CapabilityState title="Choose a date in your diary" detail="The diary supports browsing your saved entries by date. A calendar history view will appear once the date index is connected." href="/log" action="Open food diary" /></>; }
