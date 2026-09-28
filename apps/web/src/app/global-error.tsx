"use client";

// Catches errors thrown in the root layout itself (rare — regular error.tsx
// covers everything else). Must render its own <html>/<body> since the root
// layout is what failed.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en-ZA">
      <body style={{ fontFamily: "system-ui, sans-serif" }}>
        <div style={{ maxWidth: 480, margin: "96px auto", textAlign: "center", padding: "0 16px" }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1C1B1A" }}>Something Went Wrong</h1>
          <p style={{ marginTop: 12, fontSize: 14, color: "#6B6560" }}>
            The page failed to load entirely. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              borderRadius: 2,
              background: "#2C4A5E",
              color: "#F2EFE9",
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
