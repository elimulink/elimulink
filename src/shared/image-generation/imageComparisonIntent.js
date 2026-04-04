const COMPARISON_BROAD_PATTERNS = [
  /poster/i,
  /branding/i,
  /brand concept/i,
  /hero image/i,
  /hero visual/i,
  /promo/i,
  /promotion/i,
  /marketing/i,
  /visual style/i,
  /style exploration/i,
  /style direction/i,
  /concept/i,
  /scene/i,
  /banner/i,
  /flyer/i,
  /cover/i,
  /thumbnail/i,
  /logo/i,
  /infographic/i,
  /campaign/i,
];

const COMPARISON_SPECIFIC_PATTERNS = [
  /passport/i,
  /screenshot/i,
  /diagram/i,
  /map/i,
  /exact/i,
  /specific/i,
  /same as/i,
  /edit/i,
  /refine/i,
  /change/i,
  /remove/i,
  /replace/i,
];

export function shouldOfferImageComparison(
  prompt,
  {
    isNewChat = false,
    hasExistingDirection = false,
    hasShownComparison = false,
  } = {},
) {
  const text = String(prompt || "").trim().toLowerCase();
  if (!text) return false;
  if (hasExistingDirection || hasShownComparison) return false;
  if (COMPARISON_SPECIFIC_PATTERNS.some((pattern) => pattern.test(text))) return false;

  const isBroadCreative =
    COMPARISON_BROAD_PATTERNS.some((pattern) => pattern.test(text)) ||
    text.length >= 70 ||
    /\b(?:creative|open-ended|explore|exploration|style|visual|mood|direction)\b/i.test(text);

  if (!isBroadCreative) return false;

  if (isNewChat) return true;
  return Math.random() < 0.35;
}
