import { ImageResponse } from "next/og";

export const dynamic = "force-static";

const variants = {
  "icon-192.png": { size: 192, maskable: false },
  "icon-512.png": { size: 512, maskable: false },
  "icon-maskable-512.png": { size: 512, maskable: true },
  "apple-touch-icon.png": { size: 180, maskable: false },
} as const;

export function generateStaticParams() {
  return Object.keys(variants).map((name) => ({ name }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const variant = variants[name as keyof typeof variants];
  if (!variant) return new Response("Not found", { status: 404 });
  const { size, maskable } = variant;
  const tile = maskable ? size : Math.round(size * 0.84);
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: size, height: size, alignItems: "center", justifyContent: "center", background: "#090909" }}>
        <div
          style={{
            display: "flex",
            width: tile,
            height: tile,
            alignItems: "center",
            justifyContent: "center",
            background: "#ff6a00",
            borderRadius: maskable ? 0 : Math.round(size * 0.2),
            color: "#090909",
            fontSize: Math.round(size * (maskable ? 0.44 : 0.56)),
            fontWeight: 700,
          }}
        >
          A
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
