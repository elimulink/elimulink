export const INSTITUTION_MOBILE_SETTINGS_LINKS = {
  helpCenter: "https://elimulink.com/help",
  termsOfUse: "https://elimulink.com/terms",
  privacyPolicy: "https://elimulink.com/privacy",
  billingPortal: "https://elimulink.com/account/billing",
};

export function openInstitutionMobileSettingsLink(url) {
  const target = String(url || "").trim();
  if (!target || typeof window === "undefined") return;

  const opened = window.open(target, "_blank", "noopener,noreferrer");
  if (!opened) {
    window.location.assign(target);
  }
}
