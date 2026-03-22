export async function startCameraStream({
  facingMode = "environment",
  audio = false,
} = {}) {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera is not supported on this device/browser.");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode,
    },
    audio,
  });

  return stream;
}

export function stopCameraStream(stream) {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
}

export async function capturePhotoFromStream(stream) {
  if (!stream) {
    throw new Error("No active camera stream available.");
  }

  const video = document.createElement("video");
  video.srcObject = stream;
  video.playsInline = true;
  video.muted = true;

  await video.play();

  await new Promise((resolve) => {
    if (video.readyState >= 2) {
      resolve();
    } else {
      video.onloadeddata = () => resolve();
    }
  });

  const width = video.videoWidth || 1280;
  const height = video.videoHeight || 720;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, width, height);

  const dataUrl = canvas.toDataURL("image/png");

  video.pause();
  video.srcObject = null;

  return {
    width,
    height,
    dataUrl,
    blob: await dataUrlToBlob(dataUrl),
  };
}

async function dataUrlToBlob(dataUrl) {
  const response = await fetch(dataUrl);
  return await response.blob();
}

export async function tryToggleTorch(track, enabled) {
  if (!track?.getCapabilities || !track?.applyConstraints) {
    return false;
  }

  const capabilities = track.getCapabilities();
  if (!capabilities.torch) {
    return false;
  }

  try {
    await track.applyConstraints({
      advanced: [{ torch: enabled }],
    });
    return true;
  } catch {
    return false;
  }
}
