import React, { useEffect, useRef } from "react";

export default function CameraPreviewPanel({
  stream,
  cameraFacing = "environment",
  rawPhoto,
  highlightedPhoto,
  onCloseHighlight,
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current || !stream) return;
    videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-3xl bg-black ring-1 ring-white/10">
        <div className="aspect-[9/14] w-full bg-black sm:aspect-[16/10]">
          {stream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-white/50">
              Camera preview
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-3 text-sm text-white/70">
          <span>{cameraFacing === "user" ? "Front camera" : "Rear camera"}</span>
          <span>Live preview</span>
        </div>
      </div>

      {rawPhoto?.previewUrl ? (
        <div className="rounded-3xl bg-white/6 p-3 ring-1 ring-white/10">
          <div className="mb-2 text-sm font-semibold text-white">Captured photo</div>
          <img
            src={rawPhoto.previewUrl}
            alt="Captured photo"
            className="w-full rounded-2xl object-contain ring-1 ring-white/10"
          />
        </div>
      ) : null}

      {highlightedPhoto?.highlightedDataUrl ? (
        <div className="rounded-3xl bg-white/6 p-3 ring-1 ring-white/10">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-white">AI visual guidance</div>
            {onCloseHighlight ? (
              <button
                type="button"
                onClick={onCloseHighlight}
                className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80"
              >
                Close
              </button>
            ) : null}
          </div>

          <img
            src={highlightedPhoto.highlightedDataUrl}
            alt="AI highlighted photo"
            className="w-full rounded-2xl object-contain ring-1 ring-white/10"
          />
        </div>
      ) : null}
    </div>
  );
}
