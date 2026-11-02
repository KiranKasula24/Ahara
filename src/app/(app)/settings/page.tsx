import Link from "next/link";
import { PageHeader } from "@/components/app-shell/PageHeader";
const items = [["/settings/profile", "Profile", "Name, timezone and account identity"], ["/settings/nutrition", "Nutrition", "Goals and default portion preferences"], ["/settings/appearance", "Appearance", "Display and motion preferences"], ["/settings/privacy", "Privacy & data", "Export, sign out and account deletion"]];
export default function SettingsPage() { return <><PageHeader eyebrow="Account" title="Settings" description="Manage your personal preferences and data controls." /><section className="settings-list">{items.map(([href, title, detail]) => <Link key={href} href={href}><span><b>{title}</b><small>{detail}</small></span><span aria-hidden="true">›</span></Link>)}</section></>; }
