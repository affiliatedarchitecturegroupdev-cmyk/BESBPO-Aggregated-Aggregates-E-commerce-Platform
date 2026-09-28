export function SocialShareButtons({ productName, productUrl }: { productName: string; productUrl: string }) {
  const encodedUrl = encodeURIComponent(productUrl);
  const encodedText = encodeURIComponent(productName);

  const shareLinks = [
    { label: "WhatsApp", href: `https://wa.me/?text=${encodedText}%20${encodedUrl}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { label: "X", href: `https://x.com/intent/tweet?text=${encodedText}&url=${encodedUrl}` },
    { label: "Email", href: `mailto:?subject=${encodedText}&body=${encodedUrl}` },
  ];

  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[11px] uppercase tracking-widest text-slate">Share</span>
      {shareLinks.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-body text-xs text-seam-blue hover:underline"
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}
