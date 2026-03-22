export async function shareMediaItem(item) {
  if (!item?.file || typeof navigator === "undefined" || typeof navigator.share !== "function") {
    throw new Error("Sharing is not supported on this device.");
  }

  const shareData = {
    title: item.name || (item.isScreenshot ? "Screenshot" : "Image"),
    text: item.isScreenshot ? "Screenshot from ElimuLink" : "Image from ElimuLink",
  };

  if (typeof navigator.canShare === "function" && navigator.canShare({ files: [item.file] })) {
    await navigator.share({ ...shareData, files: [item.file] });
    return;
  }

  throw new Error("File sharing is not supported on this device.");
}
