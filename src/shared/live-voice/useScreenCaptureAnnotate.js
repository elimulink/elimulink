import { useCallback, useRef, useState } from "react";
import {
  captureFrameFromStream,
  startScreenCapture,
  stopScreenCapture,
} from "./screenCaptureUtils";
import { renderHighlightedImage } from "./highlightRenderer";

export function useScreenCaptureAnnotate({ onAskVision } = {}) {
  const screenStreamRef = useRef(null);

  const [screenSharing, setScreenSharing] = useState(false);
  const [shareSurface, setShareSurface] = useState("unknown");
  const [rawCapture, setRawCapture] = useState(null);
  const [highlightedCapture, setHighlightedCapture] = useState(null);
  const [captureError, setCaptureError] = useState("");
  const [captureLoading, setCaptureLoading] = useState(false);

  const beginScreenShare = useCallback(async () => {
    setCaptureError("");
    try {
      const stream = await startScreenCapture();
      screenStreamRef.current = stream;
      setScreenSharing(true);

      const [track] = stream.getVideoTracks();
      const settings = track?.getSettings?.() || {};
      setShareSurface(settings.displaySurface || "unknown");
      if (track) {
        track.onended = () => {
          setScreenSharing(false);
          setShareSurface("unknown");
          screenStreamRef.current = null;
        };
      }
      return stream;
    } catch (error) {
      setCaptureError(error.message || "Failed to start screen sharing.");
      return null;
    }
  }, []);

  const endScreenShare = useCallback(() => {
    stopScreenCapture(screenStreamRef.current);
    screenStreamRef.current = null;
    setScreenSharing(false);
    setShareSurface("unknown");
  }, []);

  const takeScreenshot = useCallback(async () => {
    if (!screenStreamRef.current) {
      setCaptureError("No active shared screen to capture.");
      return null;
    }

    setCaptureLoading(true);
    setCaptureError("");

    try {
      const frame = await captureFrameFromStream(screenStreamRef.current);

      const capture = {
        id: `cap-${Date.now()}`,
        type: "screenshot",
        title: "Screenshot",
        previewUrl: frame.dataUrl,
        rawDataUrl: frame.dataUrl,
        width: frame.width,
        height: frame.height,
        createdAt: Date.now(),
      };

      setRawCapture(capture);
      setCaptureLoading(false);
      return capture;
    } catch (error) {
      setCaptureLoading(false);
      setCaptureError(error.message || "Failed to take screenshot.");
      return null;
    }
  }, []);

  const autoHighlightScreenshot = useCallback(
    async ({ prompt } = {}) => {
      if (!rawCapture?.rawDataUrl) {
        setCaptureError("No screenshot available to analyze.");
        return null;
      }

      setCaptureLoading(true);
      setCaptureError("");

      try {
        let highlights = [];

        if (onAskVision) {
          const result = await onAskVision({
            imageDataUrl: rawCapture.rawDataUrl,
            prompt:
              prompt ||
              "Analyze this screenshot and return highlight regions showing what the user should tap or focus on.",
          });

          highlights = Array.isArray(result?.highlights) ? result.highlights : [];
        }

        if (!highlights.length) {
          highlights = [
            {
              type: "box",
              x: Math.round(rawCapture.width * 0.58),
              y: Math.round(rawCapture.height * 0.18),
              width: Math.round(rawCapture.width * 0.18),
              height: Math.round(rawCapture.height * 0.12),
              label: "Tap here",
              color: "#20b8ff",
            },
          ];
        }

        const rendered = await renderHighlightedImage({
          imageUrl: rawCapture.rawDataUrl,
          highlights,
          dimOutside: false,
        });

        const output = {
          id: `hl-${Date.now()}`,
          type: "highlighted-screenshot",
          title: "AI Highlight",
          previewUrl: rendered.dataUrl,
          rawDataUrl: rawCapture.rawDataUrl,
          highlightedDataUrl: rendered.dataUrl,
          highlights,
          createdAt: Date.now(),
        };

        setHighlightedCapture(output);
        setCaptureLoading(false);
        return output;
      } catch (error) {
        setCaptureLoading(false);
        setCaptureError(error.message || "Failed to highlight screenshot.");
        return null;
      }
    },
    [onAskVision, rawCapture]
  );

  const clearCaptures = useCallback(() => {
    setRawCapture(null);
    setHighlightedCapture(null);
    setCaptureError("");
  }, []);

  return {
    screenSharing,
    shareSurface,
    screenStream: screenStreamRef.current,
    rawCapture,
    highlightedCapture,
    captureError,
    captureLoading,
    beginScreenShare,
    endScreenShare,
    takeScreenshot,
    autoHighlightScreenshot,
    clearCaptures,
  };
}
