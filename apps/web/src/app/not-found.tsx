import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <p className="font-mono text-xs uppercase tracking-widest text-seam-blue">404</p>
      <h1 className="mt-3 font-display text-3xl font-bold text-basalt">This layer doesn&apos;t exist</h1>
      <p className="mt-3 font-body text-sm text-slate">The page you were looking for has moved or never existed.</p>
      <div className="mt-8 flex justify-center gap-3">
        <Link href="/products" className="rounded-sm bg-basalt px-5 py-2.5 font-body text-sm font-semibold text-limestone hover:bg-seam-blue">
          Browse products
        </Link>
        <Link href="/" className="rounded-sm border border-basalt px-5 py-2.5 font-body text-sm text-basalt hover:bg-basalt hover:text-limestone">
          Home
        </Link>
      </div>
    </div>
  );
}
