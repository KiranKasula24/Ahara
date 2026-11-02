import Link from "next/link";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { CapabilityState } from "@/components/RouteStates";
export default function RecipesPage() { return <><PageHeader eyebrow="Personal recipes" title="Recipes" description="Build recipes from foods with known source data." action={<Link className="button primary" href="/recipes/new">Create recipe</Link>} /><CapabilityState title="Recipes are not available yet" detail="Recipe persistence and nutrition roll-ups need a verified database contract before they can be saved safely. Existing food logging remains available." /></>; }
