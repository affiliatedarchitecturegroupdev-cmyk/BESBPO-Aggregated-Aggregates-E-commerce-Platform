"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Error boundary for every page below the root layout. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <p className="font-display text-5xl font-bold text-basalt/20">!</p>
      <h1 className="mt-4 font-display text-2xl font-bold text-basalt">Something Went Wrong</h1>
      <p className="mt-3 font-body text-sm text-slate">
        We hit an unexpected error loading this page. Try again, or head back to the homepage.
      </p>
      <div className="mt-8 flex gap-4">
        <button
          type="button"
          onClick={reset}
          className="rounded-sm bg-seam-blue px-5 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-basalt"
        >
          Try Again
        </button>
        <Link href="/" className="rounded-sm border border-basalt px-5 py-2.5 font-body text-sm text-basalt hover:bg-basalt hover:text-limestone">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
