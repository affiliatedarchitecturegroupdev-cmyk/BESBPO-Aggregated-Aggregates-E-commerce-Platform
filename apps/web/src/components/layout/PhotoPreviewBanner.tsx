import { isPhotoPreview } from "@/lib/cms";

/** Shown only in the staff photo preview, so it's never mistaken for the public site. */
export function PhotoPreviewBanner() {
  if (!isPhotoPreview()) return null;
  return (
    <div className="sticky top-0 z-50 bg-ochre-gold px-4 py-2 text-center font-body text-xs text-basalt" role="status">
      <strong>Staff photo preview.</strong> Photos awaiting permission are shown with an orange tag. Only you can see them.{" "}
      {/* A full page load, so the layout (and this banner) re-render without the preview. */}
      <a href="/api/preview/photos?off" className="font-semibold underline">Exit preview</a>
    </div>
  );
}
