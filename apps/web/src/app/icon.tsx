import { ImageResponse } from "next/og";

// The site favicon / app icon (Next.js App Router convention), generated from
// the brand palette: a stacked grading-curve motif — a nod to the SANS
// particle-size curves behind what the platform sells — in Ochre Gold on
// Basalt, matching tailwind.config.ts.
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  const bars = [18, 28, 40, 52, 34]; // ascending-then-tapering grading-curve silhouette

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 3,
          background: "#1C1B1A",
          borderRadius: 12,
          padding: "10px 8px 8px",
        }}
      >
        {bars.map((height, i) => (
          <div
            key={i}
            style={{
              width: 7,
              height,
              background: "#C08A34",
              borderRadius: 1,
            }}
          />
        ))}
      </div>
    ),
    { ...size },
  );
}
