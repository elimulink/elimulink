export async function startScreenCapture() {
  if (!navigator.mediaDevices?.getDisplayMedia) {
    throw new Error("Screen capture is not supported on this device/browser.");
  }

  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      cursor: "always",
      displaySurface: "browser",
      preferCurrentTab: true,
    },
    audio: false,
  });

  return stream;
}

export function stopScreenCapture(stream) {
  if (!stream) return;
  stream.getTracks().forEach((track) => track.stop());
}

export async function captureFrameFromStream(stream) {
  if (!stream) {
    throw new Error("No active screen stream available.");
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

export async function dataUrlToBlob(dataUrl) {
  const response = await fetch(dataUrl);
  return await response.blob();
}
