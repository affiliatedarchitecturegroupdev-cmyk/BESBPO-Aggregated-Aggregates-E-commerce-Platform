"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { captureProof } from "@/app/deliveries/actions";
import { FormMessage, inputClass, SubmitButton } from "@/components/account/Forms";

/** Shrinks a phone photo to at most 1600px on its long side (JPEG), so it uploads quickly on site. */
async function shrink(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
    return blob ? new File([blob], "delivery-photo.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

/**
 * The receiver signs on the driver's phone. A photo of the drop and the
 * phone's location are optional (the location only if the driver allows it).
 */
export function PodForm({ token }: { token: string }) {
  const [state, action] = useFormState(captureProof, null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [signed, setSigned] = useState(false);
  const [signature, setSignature] = useState("");
  const [where, setWhere] = useState<{ latitude: string; longitude: string } | null>(null);
  const [locating, setLocating] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const c = canvas.current!;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1C1B1A";
  }, []);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = true;
    canvas.current!.setPointerCapture(e.pointerId);
    const ctx = canvas.current!.getContext("2d")!;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvas.current!.getContext("2d")!;
    const p = point(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setSigned(true);
  };
  const end = () => {
    drawing.current = false;
    if (signed) setSignature(canvas.current!.toDataURL("image/png"));
  };
  const clear = () => {
    const c = canvas.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setSigned(false);
    setSignature("");
  };
  const locate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setWhere({ latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };
  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !photoInput.current) return;
    const small = await shrink(file);
    const list = new DataTransfer();
    list.items.add(small);
    photoInput.current.files = list.files;
  };

  if (state?.success) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="signature" value={signature} />
      {where && (
        <>
          <input type="hidden" name="latitude" value={where.latitude} />
          <input type="hidden" name="longitude" value={where.longitude} />
        </>
      )}
      <label className="block">
        <span className="font-mono text-[10px] uppercase text-slate">Received by (full name) *</span>
        <input name="receivedBy" required minLength={2} maxLength={120} autoComplete="off" className={inputClass} />
      </label>
      <div>
        <span className="font-mono text-[10px] uppercase text-slate">Signature *</span>
        <canvas
          ref={canvas}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="mt-1 h-40 w-full touch-none rounded-sm border border-basalt/30 bg-white"
          aria-label="Sign here"
        />
        <button type="button" onClick={clear} className="mt-1 font-body text-xs text-seam-blue hover:underline">Clear signature</button>
      </div>
      <label className="block">
        <span className="font-mono text-[10px] uppercase text-slate">Anything wrong? Shortages, damage, wrong product (optional)</span>
        <textarea name="exceptions" maxLength={1000} rows={2} className={inputClass} />
      </label>
      <label className="block">
        <span className="font-mono text-[10px] uppercase text-slate">Photo of the delivery (optional)</span>
        <input ref={photoInput} name="photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={onPhoto} className="mt-1 block w-full font-body text-sm" />
      </label>
      <div className="flex flex-wrap items-center gap-3 font-body text-xs text-slate">
        <button type="button" onClick={locate} disabled={locating} className="rounded-sm border border-basalt/20 px-3 py-1.5 text-basalt hover:bg-limestone disabled:opacity-50">
          {where ? "Location added" : locating ? "Finding location…" : "Add this phone's location"}
        </button>
        <span>Optional — it records where the delivery was signed for.</span>
      </div>
      {signed && signature ? <SubmitButton>Confirm delivery</SubmitButton> : <p className="font-body text-xs text-slate">Ask the receiver to sign above to confirm.</p>}
    </form>
  );
}
