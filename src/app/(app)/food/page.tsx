import Link from "next/link";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { CapabilityState } from "@/components/RouteStates";
export default function FoodPage() { return <><PageHeader eyebrow="Reference catalogue" title="Foods" description="Search the catalogue to view source and available serving information." action={<Link className="button primary" href="/add">Search foods</Link>} /><CapabilityState title="Use search to explore foods" detail="Catalogue results are available from the Add food flow once you sign in. Each result remains separate so you can choose the right variant." href="/add" action="Find a food" /></>; }
