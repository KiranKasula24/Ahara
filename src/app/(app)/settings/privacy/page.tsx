"use client";

import Link from "next/link";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { ProfileDataControls } from "@/components/ProfileDataControls";
export default function PrivacySettingsPage() { return <><PageHeader eyebrow="Settings" title="Privacy & data" description="Your personal data stays separate from the shared food catalogue." /><ProfileDataControls onBack={() => {}} onExport={() => { window.location.assign("/export"); }} onDelete={() => {}} onCancel={() => {}} deleting={false} onSignOut={() => { window.location.assign("/login"); }} /><p className="muted"><Link href="/export">Open the full export page</Link>. Account deletion requires a signed-in server-authorized session.</p></>; }
