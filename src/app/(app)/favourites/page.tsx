import Link from "next/link";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { CapabilityState } from "@/components/RouteStates";
export default function FavouritesPage() { return <><PageHeader eyebrow="Quick access" title="Favourites" description="Keep frequently logged foods within reach." action={<Link className="button primary" href="/add">Find food</Link>} /><CapabilityState title="No favourite foods yet" detail="Favourite a food after you find it in the catalogue. Favourites are private to your account." href="/add" action="Search foods" /></>; }
