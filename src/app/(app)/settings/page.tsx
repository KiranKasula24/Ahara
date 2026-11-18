import Link from "next/link";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { SignOutButton } from "@/components/app-shell/SignOutButton";

const items = [
  ["/settings/profile", "Profile", "Name and time zone"],
  ["/goals", "Goals", "Daily food and activity targets"],
  ["/favourites", "Favourites", "Foods you saved for quick logging"],
  ["/settings/privacy", "Privacy & data", "Export your data or delete your account"],
];

export default function SettingsPage() {
  return (
    <>
      <PageHeader eyebrow="Account" title="Profile" description="Manage your details and your data." />
      <section className="settings-list">
        {items.map(([href, title, detail]) => (
          <Link key={href} href={href}>
            <span><b>{title}</b><small>{detail}</small></span>
            <span aria-hidden="true">›</span>
          </Link>
        ))}
      </section>
      <div className="settings-actions"><SignOutButton /></div>
    </>
  );
}
