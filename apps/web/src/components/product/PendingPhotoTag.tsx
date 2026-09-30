/** Marks a photo that only staff can see (photo preview) until its source gives permission. */
export function PendingPhotoTag({ className = "" }: { className?: string }) {
  return (
    <span className={`pointer-events-none absolute left-1.5 top-1.5 rounded-sm bg-ochre-gold px-1.5 py-0.5 font-mono text-[9px] uppercase text-basalt ${className}`}>
      Awaiting permission
    </span>
  );
}
