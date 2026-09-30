import type { PhotoCredit } from "@/lib/cms";

/** The attribution a CC BY / CC BY-SA photo's licence requires: author, source and licence, each linked. */
export function PhotoCreditLine({ credit }: { credit: PhotoCredit }) {
  const link = "underline decoration-slate/40 hover:text-seam-blue";
  return (
    <p className="mt-1 font-mono text-[10px] text-slate">
      Photo:{" "}
      {credit.sourceUrl ? (
        <a href={credit.sourceUrl} target="_blank" rel="noopener noreferrer" className={link}>
          {credit.text}
        </a>
      ) : (
        credit.text
      )}
      {" · "}
      {credit.licenceUrl ? (
        <a href={credit.licenceUrl} target="_blank" rel="noopener noreferrer license" className={link}>
          {credit.licence}
        </a>
      ) : (
        credit.licence
      )}
    </p>
  );
}
