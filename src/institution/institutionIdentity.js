function clean(value) {
  return String(value || "").trim();
}

function firstNonEmpty(values = []) {
  for (const value of values) {
    const next = clean(value);
    if (next) return next;
  }
  return "";
}

function getEmailLocalPart(email) {
  const cleaned = clean(email);
  if (!cleaned) return "";
  return cleaned.includes("@") ? clean(cleaned.split("@")[0]) : cleaned;
}

export function resolveInstitutionDisplayName(profile, user, { preferUsername = true, fallback = "Guest Scholar" } = {}) {
  const username = preferUsername ? firstNonEmpty([profile?.username, user?.username]) : "";
  return firstNonEmpty([
    username,
    profile?.displayName,
    profile?.fullName,
    profile?.name,
    user?.displayName,
    user?.fullName,
    user?.name,
    getEmailLocalPart(profile?.email),
    getEmailLocalPart(user?.email),
    fallback,
  ]) || fallback;
}
