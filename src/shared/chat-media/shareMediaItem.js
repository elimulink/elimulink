export async function shareMediaItem(item) {
  if (!item?.file || typeof navigator === "undefined") {
    throw new Error("Sharing is not supported on this device.");
  }

  const shareData = {
    title: item.name || (item.isScreenshot ? "Screenshot" : "Image"),
    text: item.isScreenshot ? "Screenshot from ElimuLink" : "Image from ElimuLink",
  };

  if (
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [item.file] })
  ) {
    await navigator.share({ ...shareData, files: [item.file] });
    return "Shared";
  }

  if (
    typeof navigator.clipboard?.write === "function" &&
    typeof window !== "undefined" &&
    typeof window.ClipboardItem === "function"
  ) {
    try {
      await navigator.clipboard.write([
        new window.ClipboardItem({
          [item.file.type || "image/png"]: item.file,
        }),
      ]);
      return "Copied to clipboard";
    } catch {
      // Fall through to readable fallback error below.
    }
  }

  throw new Error("Native sharing is unavailable here. Open the preview and use Download instead.");
}
