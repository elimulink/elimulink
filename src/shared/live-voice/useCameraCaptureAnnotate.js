import { useCallback, useMemo, useRef, useState } from "react";
import {
  capturePhotoFromStream,
  startCameraStream,
  stopCameraStream,
  tryToggleTorch,
} from "./cameraCaptureUtils";
import { renderHighlightedImage } from "./highlightRenderer";

export function useCameraCaptureAnnotate({ onAskVision } = {}) {
  const streamRef = useRef(null);

  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraFacing, setCameraFacing] = useState("environment");
  const [torchEnabled, setTorchEnabled] = useState(false);

  const [rawPhoto, setRawPhoto] = useState(null);
  const [highlightedPhoto, setHighlightedPhoto] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const videoTrack = useMemo(() => {
    return streamRef.current?.getVideoTracks?.()[0] || null;
  }, [cameraEnabled, cameraFacing]);

  const enableCamera = useCallback(async () => {
    setError("");
    try {
      const stream = await startCameraStream({
        facingMode: cameraFacing,
        audio: false,
      });

      streamRef.current = stream;
      setCameraEnabled(true);

      const [track] = stream.getVideoTracks();
      if (track) {
        track.onended = () => {
          setCameraEnabled(false);
          streamRef.current = null;
          setTorchEnabled(false);
        };
      }

      return stream;
    } catch (err) {
      setError(err.message || "Failed to enable camera.");
      return null;
    }
  }, [cameraFacing]);

  const disableCamera = useCallback(() => {
    stopCameraStream(streamRef.current);
    streamRef.current = null;
    setCameraEnabled(false);
    setTorchEnabled(false);
  }, []);

  const switchCamera = useCallback(async () => {
    const nextFacing = cameraFacing === "user" ? "environment" : "user";
    disableCamera();
    setCameraFacing(nextFacing);
    return nextFacing;
  }, [cameraFacing, disableCamera]);

  const capturePhoto = useCallback(async () => {
    if (!streamRef.current) {
      setError("No active camera available.");
      return null;
    }

    setLoading(true);
    setError("");

    try {
      const frame = await capturePhotoFromStream(streamRef.current);
      const capture = {
        id: `photo-${Date.now()}`,
        type: "camera-photo",
        title: cameraFacing === "user" ? "Selfie photo" : "Rear photo",
        previewUrl: frame.dataUrl,
        rawDataUrl: frame.dataUrl,
        width: frame.width,
        height: frame.height,
        createdAt: Date.now(),
      };

      setRawPhoto(capture);
      setLoading(false);
      return capture;
    } catch (err) {
      setLoading(false);
      setError(err.message || "Failed to capture photo.");
      return null;
    }
  }, [cameraFacing]);

  const autoHighlightPhoto = useCallback(
    async ({ prompt, sourceCapture = null } = {}) => {
      const targetPhoto = sourceCapture?.rawDataUrl ? sourceCapture : rawPhoto;

      if (!targetPhoto?.rawDataUrl) {
        setError("No captured photo available to analyze.");
        return null;
      }

      setLoading(true);
      setError("");

      try {
        let highlights = [];
        let answer = "";

        if (onAskVision) {
          const result = await onAskVision({
            imageDataUrl: targetPhoto.rawDataUrl,
            prompt:
              prompt ||
              "Analyze this camera photo and highlight the object or area the user should focus on.",
          });

          highlights = Array.isArray(result?.highlights) ? result.highlights : [];
          answer = String(result?.answer || "").trim();
        }

        if (!highlights.length) {
          highlights = [
            {
              type: "circle",
              x: Math.round((targetPhoto.width || 1280) * 0.5),
              y: Math.round((targetPhoto.height || 720) * 0.42),
              radius: Math.round(Math.min(targetPhoto.width || 1280, targetPhoto.height || 720) * 0.12),
              label: "Look here",
              color: "#20b8ff",
            },
          ];
        }

        const rendered = await renderHighlightedImage({
          imageUrl: targetPhoto.rawDataUrl,
          highlights,
          dimOutside: false,
        });

        const output = {
          id: `photo-highlight-${Date.now()}`,
          type: targetPhoto.type === "uploaded-photo" ? "highlighted-uploaded-photo" : "highlighted-camera-photo",
          title: targetPhoto.type === "uploaded-photo" ? "AI photo guidance" : "AI camera guidance",
          previewUrl: rendered.dataUrl,
          rawDataUrl: targetPhoto.rawDataUrl,
          highlightedDataUrl: rendered.dataUrl,
          width: targetPhoto.width || rendered.width,
          height: targetPhoto.height || rendered.height,
          highlights,
          answer,
          createdAt: Date.now(),
        };

        setHighlightedPhoto(output);
        setLoading(false);
        return output;
      } catch (err) {
        setLoading(false);
        setError(err.message || "Failed to highlight photo.");
        return null;
      }
    },
    [onAskVision, rawPhoto]
  );

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks?.()[0];
    if (!track) {
      setError("No active rear camera track available.");
      return false;
    }

    const next = !torchEnabled;
    const success = await tryToggleTorch(track, next);
    if (success) {
      setTorchEnabled(next);
      return true;
    }

    setError("Torch/flashlight is not supported on this device/browser.");
    return false;
  }, [torchEnabled]);

  const clearCameraCaptures = useCallback(() => {
    setRawPhoto(null);
    setHighlightedPhoto(null);
    setError("");
  }, []);

  return {
    cameraEnabled,
    cameraFacing,
    torchEnabled,
    rawPhoto,
    highlightedPhoto,
    loading,
    error,
    stream: streamRef.current,
    videoTrack,
    enableCamera,
    disableCamera,
    switchCamera,
    capturePhoto,
    autoHighlightPhoto,
    toggleTorch,
    clearCameraCaptures,
  };
}
