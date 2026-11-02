import Link from "next/link";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { CapabilityState } from "@/components/RouteStates";
export default function RecipeDetailPage() { return <><PageHeader eyebrow="Personal recipe" title="Recipe details" description="Saved recipes will display ingredient provenance and per-serving completeness." /><CapabilityState title="Recipe details are not enabled" detail="No recipe data is fabricated here. Once recipe persistence is verified, this page will show only your saved recipe data." href="/recipes" action="Back to recipes" /></>; }
