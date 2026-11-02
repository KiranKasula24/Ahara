import Link from "next/link";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { CapabilityState } from "@/components/RouteStates";
export default async function FoodDetailPage({ params }: { params: Promise<{ foodId: string }> }) { const { foodId } = await params; return <><PageHeader eyebrow="Food details" title="Food information" description="Nutrition detail is only shown when its source data is available." action={<Link className="button primary" href="/add">Add food</Link>} /><CapabilityState title="Food detail lookup is not available yet" detail={`The selected catalogue record (${foodId}) can still be found and logged through Add food. No missing nutrient is shown as zero.`} href="/add" action="Return to search" /></>; }
