import { oauthProviders, type OAuthProviderKey } from "@/lib/oauth";

/**
 * The five provider buttons beside the email form (six ways in, with email).
 * Each shows the provider's own logo and wordmark from its brand pack
 * (PAYMENT_ASSETS.md, "Sign-in logos"). A provider the API has no
 * credentials for yet is shown, greyed out, as "coming soon".
 */
const MARKS: Record<OAuthProviderKey, { images: { src: string; className: string }[]; text?: string }> = {
  google: {
    images: [
      { src: "/sign-in-logos/google-symbol.svg", className: "h-5 w-5" },
      { src: "/sign-in-logos/google-wordmark.svg", className: "h-5" },
    ],
  },
  microsoft: { images: [{ src: "/sign-in-logos/microsoft.svg", className: "h-5" }] },
  x: { images: [{ src: "/sign-in-logos/x.svg", className: "h-4" }] },
  facebook: { images: [{ src: "/sign-in-logos/facebook.png", className: "h-5 w-5" }], text: "Facebook" },
  instagram: {
    images: [
      { src: "/sign-in-logos/instagram-symbol.svg", className: "h-5 w-5" },
      { src: "/sign-in-logos/instagram-wordmark.svg", className: "h-5" },
    ],
  },
};

export async function SocialSignIn({ next }: { next: string }) {
  const providers = await oauthProviders();
  return (
    <div>
      <ul className="grid gap-2">
        {providers.map((p) => {
          const mark = MARKS[p.provider];
          const content = (
            <>
              <span className="font-body text-sm text-slate">Continue with</span>
              <span className="inline-flex items-center gap-1.5">
                {mark.images.map((image) => (
                  // eslint-disable-next-line @next/next/no-img-element -- provider brand mark
                  <img key={image.src} src={image.src} alt="" className={`${image.className} w-auto`} />
                ))}
                {mark.text && <span className="font-body text-sm font-semibold text-basalt">{mark.text}</span>}
              </span>
              <span className="sr-only">{p.label}</span>
              {!p.enabled && <span className="ml-auto font-mono text-[10px] uppercase text-slate">Coming soon</span>}
            </>
          );
          const base = "flex h-11 w-full items-center gap-2.5 rounded-sm border px-4";
          return (
            <li key={p.provider}>
              {p.enabled ? (
                <a
                  href={`/api/auth/oauth/${p.provider}/start?next=${encodeURIComponent(next)}`}
                  className={`${base} border-basalt/20 bg-white hover:border-seam-blue hover:bg-limestone/40`}
                  data-oauth={p.provider}
                >
                  {content}
                </a>
              ) : (
                <span aria-disabled="true" className={`${base} cursor-not-allowed border-basalt/10 bg-limestone/40 opacity-60 grayscale`} data-oauth={p.provider}>
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 font-body text-[11px] text-slate">
        We only receive your name, account ID and email address (if the provider shares it). We never post on your behalf.
      </p>
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="my-6 flex items-center gap-3 font-mono text-[11px] uppercase text-slate" role="separator">
      <span className="h-px flex-1 bg-basalt/10" />
      or use your email
      <span className="h-px flex-1 bg-basalt/10" />
    </div>
  );
}
