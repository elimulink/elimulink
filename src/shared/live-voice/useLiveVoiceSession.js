import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVoiceConversation } from "./useVoiceConversation";
import { useScreenCaptureAnnotate } from "./useScreenCaptureAnnotate";
import { useCameraCaptureAnnotate } from "./useCameraCaptureAnnotate";

export default function useLiveVoiceSession({ language = "en-US", onUserTurn, onAskVision, settingsUid = null }) {
  const screenStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const objectUrlsRef = useRef(new Set());
  const liveContextRef = useRef({
    captures: [],
    cameraEnabled: false,
    cameraFacingMode: "environment",
    recordingScreen: false,
    screenSharing: false,
    shareSurface: "unknown",
    latestVisualCaptureType: "",
  });
  const isMountedRef = useRef(true);

  const [open, setOpen] = useState(false);
  const [recordingScreen, setRecordingScreen] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState("");
  const [captures, setCaptures] = useState([]);
  const [uploadedPhotoCapture, setUploadedPhotoCapture] = useState(null);
  const [visionPrompt, setVisionPrompt] = useState("");
  const [sessionError, setSessionError] = useState("");

  const {
    screenSharing,
    shareSurface,
    screenStream,
    rawCapture,
    highlightedCapture,
    captureError,
    captureLoading,
    beginScreenShare,
    endScreenShare,
    takeScreenshot: takeSharedScreenshot,
    autoHighlightScreenshot,
    clearCaptures: clearScreenCaptures,
  } = useScreenCaptureAnnotate({
    onAskVision,
  });

  const {
    mode,
    supported,
    muted,
    transcript,
    responseText,
    error,
    startVoiceChat,
    endVoiceChat,
    retryListen,
    interruptSpeaking,
    stopListening,
    submitTextTurn,
    setMuted,
  } = useVoiceConversation({
    language,
    autoRestartListening: true,
    onUserTurn,
    settingsUid,
    context: liveContextRef.current,
  });

  const {
    cameraEnabled,
    cameraFacing,
    torchEnabled,
    rawPhoto,
    highlightedPhoto,
    loading: cameraLoading,
    error: cameraError,
    stream: cameraStream,
    videoTrack,
    enableCamera,
    disableCamera,
    switchCamera: flipCameraFacing,
    capturePhoto,
    autoHighlightPhoto,
    toggleTorch,
    clearCameraCaptures,
  } = useCameraCaptureAnnotate({
    onAskVision,
  });

  const cameraSupported = useMemo(
    () =>
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getUserMedia),
    []
  );

  const screenShareSupported = useMemo(
    () =>
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getDisplayMedia),
    []
  );

  const screenRecordingSupported = useMemo(
    () =>
      typeof navigator !== "undefined" &&
      Boolean(navigator.mediaDevices?.getDisplayMedia) &&
      typeof MediaRecorder !== "undefined",
    []
  );

  const mobileBrowserRuntime = useMemo(
    () =>
      typeof navigator !== "undefined" &&
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || ""),
    []
  );

  useEffect(() => {
    const latestCapture = captures[captures.length - 1] || null;
    liveContextRef.current.captures = captures.slice(-6).map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      answer: item.answer || "",
      createdAt: item.createdAt,
    }));
    liveContextRef.current.cameraEnabled = cameraEnabled;
    liveContextRef.current.cameraFacingMode = cameraFacing;
    liveContextRef.current.recordingScreen = recordingScreen;
    liveContextRef.current.screenSharing = screenSharing;
    liveContextRef.current.shareSurface = shareSurface;
    liveContextRef.current.latestVisualCaptureType = latestCapture?.type || "";
  }, [cameraEnabled, cameraFacing, captures, recordingScreen, screenSharing, shareSurface]);

  const registerObjectUrl = useCallback((url) => {
    if (!url) return;
    objectUrlsRef.current.add(url);
  }, []);

  const unregisterObjectUrl = useCallback((url) => {
    if (!url) return;
    objectUrlsRef.current.delete(url);
    try {
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  }, []);

  const clearRecording = useCallback(() => {
    setRecordedBlob(null);
    setRecordedUrl((current) => {
      unregisterObjectUrl(current);
      return "";
    });
  }, [unregisterObjectUrl]);

  const stopScreenRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        // ignore
      }
    } else {
      const stream = screenStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // ignore
          }
        });
      }
      screenStreamRef.current = null;
      setRecordingScreen(false);
    }
  }, []);

  const addCapture = useCallback(
    (item) => {
      if (item?.previewUrl) registerObjectUrl(item.previewUrl);
      setCaptures((prev) => [...prev, item]);
    },
    [registerObjectUrl]
  );

  const resetSessionCaptures = useCallback(() => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
    setRecordedBlob(null);
    setRecordedUrl("");
    setCaptures([]);
    setUploadedPhotoCapture(null);
    clearScreenCaptures();
    clearCameraCaptures();
    setVisionPrompt("");
  }, [clearCameraCaptures, clearScreenCaptures]);

  const openSession = useCallback(() => {
    resetSessionCaptures();
    setSessionError("");
    setOpen(true);
    window.setTimeout(() => startVoiceChat(), 120);
  }, [resetSessionCaptures, startVoiceChat]);

  const endSession = useCallback(() => {
    endVoiceChat();
    disableCamera();
    stopScreenRecording();
    endScreenShare();
    resetSessionCaptures();
    setSessionError("");
    setOpen(false);
  }, [disableCamera, endScreenShare, endVoiceChat, resetSessionCaptures, stopScreenRecording]);

  const toggleMute = useCallback(() => {
    setMuted((value) => {
      const next = !value;
      if (value && open) {
        window.setTimeout(() => startVoiceChat(), 120);
      }
      return next;
    });
  }, [open, setMuted, startVoiceChat]);

  const toggleCamera = useCallback(async () => {
    if (cameraEnabled) {
      disableCamera();
      return;
    }
    await enableCamera();
  }, [cameraEnabled, disableCamera, enableCamera]);

  const switchCamera = useCallback(async () => {
    const nextFacing = await flipCameraFacing();
    if (cameraEnabled) {
      window.setTimeout(() => enableCamera(), 120);
    }
    return nextFacing;
  }, [cameraEnabled, enableCamera, flipCameraFacing]);

  const toggleScreenShare = useCallback(async () => {
    if (!screenShareSupported) {
      setSessionError("Screen share isn't available in this browser.");
      return false;
    }
    if (screenSharing) {
      endScreenShare();
      return true;
    }
    const stream = await beginScreenShare();
    return Boolean(stream);
  }, [beginScreenShare, endScreenShare, screenShareSupported, screenSharing]);

  const startScreenShare = useCallback(async () => {
    if (!screenShareSupported) {
      setSessionError("Screen share isn't available in this browser.");
      return null;
    }

    setSessionError("");
    return beginScreenShare();
  }, [beginScreenShare, screenShareSupported]);

  const takeScreenshot = useCallback(async () => {
    if (!screenSharing) {
      const stream = await beginScreenShare();
      if (!stream) return null;
    }

    clearCameraCaptures();
    setUploadedPhotoCapture(null);
    const capture = await takeSharedScreenshot();
    if (capture?.previewUrl) {
      addCapture(capture);
    }
    return capture;
  }, [addCapture, beginScreenShare, clearCameraCaptures, screenSharing, takeSharedScreenshot]);

  const takePhoto = useCallback(async () => {
    if (!cameraEnabled) {
      const stream = await enableCamera();
      if (!stream) return null;
    }
    clearScreenCaptures();
    setUploadedPhotoCapture(null);
    const capture = await capturePhoto();
    if (capture?.previewUrl) {
      addCapture(capture);
    }
    return capture;
  }, [addCapture, cameraEnabled, capturePhoto, clearScreenCaptures, enableCamera]);

  const uploadPhoto = useCallback(
    (file) =>
      new Promise((resolve) => {
        if (!file || !String(file.type || "").startsWith("image/")) {
          setSessionError("Please choose a valid image file.");
          resolve(null);
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result || "");
          if (!dataUrl) {
            setSessionError("Could not read that photo.");
            resolve(null);
            return;
          }

          const captureId = `upload-${Date.now()}`;
          const finalizeCapture = (width = 0, height = 0) => {
            clearScreenCaptures();
            clearCameraCaptures();
            const capture = {
              id: captureId,
              type: "uploaded-photo",
              title: file.name || "Uploaded photo",
              previewUrl: dataUrl,
              rawDataUrl: dataUrl,
              width,
              height,
              createdAt: Date.now(),
            };

            setUploadedPhotoCapture(capture);
            addCapture(capture);
            resolve(capture);
          };

          const image = new Image();
          image.onload = () => finalizeCapture(image.naturalWidth || 0, image.naturalHeight || 0);
          image.onerror = () => finalizeCapture(0, 0);
          image.src = dataUrl;
        };
        reader.onerror = () => {
          setSessionError("Could not read that photo.");
          resolve(null);
        };
        reader.readAsDataURL(file);
      }),
    [addCapture, clearCameraCaptures, clearScreenCaptures]
  );

  const highlightLatestCapture = useCallback(
    async (prompt) => {
      let result = null;
      if (rawPhoto?.rawDataUrl || uploadedPhotoCapture?.rawDataUrl) {
        const photoSource = rawPhoto?.rawDataUrl ? "camera photo" : "uploaded photo";
        result = await autoHighlightPhoto({
          prompt:
            prompt ||
            visionPrompt ||
            `Highlight the important object or area in this ${photoSource}.`,
          sourceCapture: rawPhoto?.rawDataUrl ? null : uploadedPhotoCapture,
        });
      } else if (screenSharing || rawCapture?.rawDataUrl) {
        result = await autoHighlightScreenshot({
          prompt:
            prompt ||
            visionPrompt ||
            "Show clearly what the user should tap or focus on next in this screenshot.",
        });
      }
      if (result?.previewUrl) {
        addCapture(result);
      }
      return result;
    },
    [
      addCapture,
      autoHighlightPhoto,
      autoHighlightScreenshot,
      rawCapture?.rawDataUrl,
      rawPhoto?.rawDataUrl,
      screenSharing,
      uploadedPhotoCapture?.rawDataUrl,
      visionPrompt,
    ]
  );

  const toggleScreenRecording = useCallback(async () => {
    if (!screenRecordingSupported) {
      setSessionError("Screen recording isn't available in this browser.");
      return false;
    }

    if (recordingScreen) {
      stopScreenRecording();
      return true;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      screenStreamRef.current = stream;
      recordingChunksRef.current = [];

      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
          ? "video/webm;codecs=vp9"
          : "video/webm",
      });

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, {
          type: recorder.mimeType || "video/webm",
        });
        const previewUrl = URL.createObjectURL(blob);
        registerObjectUrl(previewUrl);
        if (isMountedRef.current) {
          setRecordedBlob(blob);
          setRecordedUrl((current) => {
            if (current && current !== previewUrl) {
              unregisterObjectUrl(current);
            }
            return previewUrl;
          });
        }
        const stream = screenStreamRef.current;
        if (stream) {
          stream.getTracks().forEach((track) => {
            try {
              track.stop();
            } catch {
              // ignore
            }
          });
        }
        screenStreamRef.current = null;
        mediaRecorderRef.current = null;
        recordingChunksRef.current = [];
        if (isMountedRef.current) {
          setRecordingScreen(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecordingScreen(true);
      stream.getVideoTracks?.()[0]?.addEventListener("ended", () => {
        if (mediaRecorderRef.current?.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      });
      return true;
    } catch {
      setSessionError("Couldn't start screen recording.");
      return false;
    }
  }, [recordingScreen, registerObjectUrl, screenRecordingSupported, stopScreenRecording, unregisterObjectUrl]);

  const togglePrimaryTalk = useCallback(async () => {
    if (mode === "listening") {
      stopListening();
      return true;
    }

    if (mode === "speaking") {
      interruptSpeaking();
      return true;
    }

    if (mode === "thinking") {
      return false;
    }

    startVoiceChat();
    return true;
  }, [interruptSpeaking, mode, startVoiceChat, stopListening]);

  const submitTextMessage = useCallback(
    async (text) => {
      const normalized = `${text || ""}`.trim();
      if (!normalized) return false;
      return submitTextTurn(normalized);
    },
    [submitTextTurn]
  );

  const downloadRecording = useCallback(
    (filename = `elimulink-live-recording-${Date.now()}.webm`) => {
      if (!recordedBlob || !recordedUrl) return false;
      const link = document.createElement("a");
      link.href = recordedUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return true;
    },
    [recordedBlob, recordedUrl]
  );

  useEffect(() => {
    if (rawCapture?.id) {
      setCaptures((prev) => {
        if (prev.some((item) => item.id === rawCapture.id)) return prev;
        if (rawCapture.previewUrl) registerObjectUrl(rawCapture.previewUrl);
        return [...prev, rawCapture];
      });
    }
  }, [rawCapture, registerObjectUrl]);

  useEffect(() => {
    if (rawPhoto?.id) {
      setCaptures((prev) => {
        if (prev.some((item) => item.id === rawPhoto.id)) return prev;
        if (rawPhoto.previewUrl) registerObjectUrl(rawPhoto.previewUrl);
        return [...prev, rawPhoto];
      });
    }
  }, [rawPhoto, registerObjectUrl]);

  useEffect(() => {
    if (highlightedCapture?.id) {
      setCaptures((prev) => {
        const filtered = prev.filter((item) => item.id !== highlightedCapture.id);
        if (highlightedCapture.previewUrl) registerObjectUrl(highlightedCapture.previewUrl);
        return [...filtered, highlightedCapture];
      });
    }
  }, [highlightedCapture, registerObjectUrl]);

  useEffect(() => {
    if (highlightedPhoto?.id) {
      setCaptures((prev) => {
        const filtered = prev.filter((item) => item.id !== highlightedPhoto.id);
        if (highlightedPhoto.previewUrl) registerObjectUrl(highlightedPhoto.previewUrl);
        return [...filtered, highlightedPhoto];
      });
    }
  }, [highlightedPhoto, registerObjectUrl]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      endVoiceChat();
      disableCamera();
      stopScreenRecording();
      endScreenShare();
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrlsRef.current.clear();
    };
  }, [disableCamera, endScreenShare, endVoiceChat, stopScreenRecording]);

  return {
    open,
    mode,
    transcript,
    responseText,
    cameraEnabled,
    cameraStream,
    captures,
    muted,
    recordingScreen,
    recordedBlob,
    recordedUrl,
    screenSharing,
    shareSurface,
    screenShareStream: screenStream,
    torchSupported: Boolean(videoTrack?.getCapabilities?.()?.torch && cameraFacing === "environment"),
    torchEnabled,
    recognitionSupported: supported.speechRecognition,
    speechSynthesisSupported: supported.speechSynthesis,
    cameraSupported,
    screenShareSupported,
    screenRecordingSupported,
    mobileBrowserRuntime,
    cameraFacingMode: cameraFacing,
    rawCapture: rawCapture || rawPhoto,
    highlightedCapture: highlightedCapture || highlightedPhoto,
    highlightLoading: captureLoading || cameraLoading,
    visionPrompt,
    setVisionPrompt,
    lastError: sessionError || captureError || cameraError || error,
    dualCameraMode: "single-camera-fallback",
    openSession,
    endSession,
    startVoice: startVoiceChat,
    togglePrimaryTalk,
    submitTextMessage,
    toggleMute,
    toggleCamera,
    switchCamera,
    uploadPhoto,
    toggleTorch,
    startScreenShare,
    stopScreenShare: endScreenShare,
    toggleScreenShare,
    takePhoto,
    takeScreenshot,
    highlightLatestCapture,
    toggleScreenRecording,
    downloadRecording,
    clearRecording,
    interrupt: interruptSpeaking,
    retryListen,
  };
}
