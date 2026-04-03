const IMAGE_GENERATION_PATTERNS = [
  /^(?:generate|create|make|draw|design|illustrate|render)\s+(?:an?\s+)?(?:image|picture|photo|illustration|graphic|visual)\s+(?:of|for)?\s*(.+)$/i,
  /^(?:generate|create|make|design)\s+(?:a|an)\s+(logo|poster|banner|flyer|cover|thumbnail|icon|wallpaper)\b.*$/i,
  /^(?:generate|create|make|draw|design|illustrate|render|show me)\s+(?:an?\s+)?(?:map|diagram|chart|poster|banner|flyer|infographic|logo)\b.*$/i,
  /^(?:draw|show me|create|make)\s+.+\b(?:diagram|map|poster|chart|illustration)\b.*$/i,
  /^(?:logo|poster|banner|flyer|cover|thumbnail|icon|wallpaper)\s*:\s*(.+)$/i,
];

const IMAGE_EDIT_FOLLOW_UP_PATTERNS = [
  /^(?:make it|make this|make the image|make the diagram)\s+.+$/i,
  /^(?:add|remove|use|change|replace|simplify)\s+.+$/i,
  /\b(?:add labels|add arrows|make it simpler|make it realistic|make it exam-style|use white background|remove the background|make it cleaner|simplify the diagram)\b/i,
  /\b(?:simpler|realistic|exam-style|white background|remove background|add labels|add arrows|cleaner)\b/i,
];

export function isImageGenerationPrompt(text) {
  const value = String(text || "").trim();
  if (!value) return false;
  return IMAGE_GENERATION_PATTERNS.some((pattern) => pattern.test(value));
}

export function isImageEditFollowUpPrompt(text) {
  const value = String(text || "").trim();
  if (!value) return false;
  if (isImageGenerationPrompt(value)) return false;
  return IMAGE_EDIT_FOLLOW_UP_PATTERNS.some((pattern) => pattern.test(value));
}
