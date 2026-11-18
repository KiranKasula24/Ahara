import type { IntakeState } from "@/lib/day-status";

type Props = { fraction: number; state: IntakeState; label: string; sublabel: string };

export function IntakeRing({ fraction, state, label, sublabel }: Props) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, fraction));
  return (
    <svg className="tx-ring" viewBox="0 0 132 132" role="img" aria-label={`${label}. ${sublabel}`}>
      <circle className="tx-ring-track" cx="66" cy="66" r={radius} fill="none" strokeWidth="12" />
      {clamped > 0 && (
        <circle
          className={`tx-ring-fill ${state}`}
          cx="66" cy="66" r={radius} fill="none" strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${clamped * circumference} ${circumference}`}
          transform="rotate(-90 66 66)"
        />
      )}
      <text className="tx-ring-text" x="66" y="66" textAnchor="middle" fontSize="22" fontWeight="800">{label}</text>
      <text className="tx-ring-sub" x="66" y="86" textAnchor="middle" fontSize="11">{sublabel}</text>
    </svg>
  );
}
