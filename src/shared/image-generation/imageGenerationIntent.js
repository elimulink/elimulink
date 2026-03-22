const IMAGE_GENERATION_PATTERNS = [
  /^(?:generate|create|make|draw|design|illustrate|render)\s+(?:an?\s+)?(?:image|picture|photo|illustration|graphic|visual)\s+(?:of|for)?\s*(.+)$/i,
  /^(?:generate|create|make|design)\s+(?:a|an)\s+(logo|poster|banner|flyer|cover|thumbnail|icon|wallpaper)\b.*$/i,
  /^(?:logo|poster|banner|flyer|cover|thumbnail|icon|wallpaper)\s*:\s*(.+)$/i,
];

export function isImageGenerationPrompt(text) {
  const value = String(text || "").trim();
  if (!value) return false;
  return IMAGE_GENERATION_PATTERNS.some((pattern) => pattern.test(value));
}
