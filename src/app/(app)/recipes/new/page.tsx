import Link from "next/link";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { CapabilityState } from "@/components/RouteStates";
export default function NewRecipePage() { return <><PageHeader eyebrow="Personal recipes" title="Create recipe" description="Ingredient quantities and yield must be available before a recipe total can be calculated." /><CapabilityState title="Recipe creation is not enabled" detail="The recipe tables and frozen-log behaviour need to be verified first. Ahara will not create an unbacked recipe draft." href="/recipes" action="Back to recipes" /></>; }
