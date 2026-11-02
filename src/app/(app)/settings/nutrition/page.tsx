import Link from "next/link";
import { PageHeader } from "@/components/app-shell/PageHeader";
export default function NutritionSettingsPage() { return <><PageHeader eyebrow="Settings" title="Nutrition preferences" description="Preferences affect future choices, never past frozen entries." /><section className="form-card"><h2>Personal targets</h2><p className="muted">Versioned nutrition goal editing is available from the Goals section. Targets are estimates, not medical advice.</p><Link href="/goals" className="button secondary">Open goals</Link></section></>; }
