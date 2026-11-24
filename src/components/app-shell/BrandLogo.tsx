import Image from "next/image";

export function BrandLogo({ variant = "mark", priority = false }: { variant?: "mark" | "lockup"; priority?: boolean }) {
  const isMark = variant === "mark";
  return <Image className={`brand-logo ${variant}`} src={isMark ? "/brand/ahara-mark.png" : "/brand/ahara-lockup.png"} alt={isMark ? "Ahara" : "Ahara — Fuel Better"} width={isMark ? 34 : 150} height={isMark ? 34 : 72} priority={priority} />;
}
