export type HostMode = "public" | "student" | "institution";

function isLocalLikeHost(hostname: string): boolean {
  const host = (hostname || "").toLowerCase();
  if (!host) return false;
  if (host === "localhost" || host === "127.0.0.1") return true;
  if (host.endsWith(".localhost")) return true;
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host);
}

function modeFromPath(pathname: string): HostMode | null {
  const path = String(pathname || "").toLowerCase();
  if (path === "/institution" || path.startsWith("/institution/")) return "institution";
  if (path === "/student" || path.startsWith("/student/")) return "student";
  return null;
}

// Single source of truth for runtime app mode based on hostname only.
export function getAppMode(hostname: string): HostMode {
  const host = (hostname || "").toLowerCase();
  const isStudentHost =
    host.startsWith("student.") ||
    host.includes("elimulink-student") ||
    host.includes("elimulink-student.web.app") ||
    host.includes("elimulink-student.firebaseapp.com");
  if (isStudentHost) return "student";
  const isInstitutionHost =
    host.startsWith("institution.") ||
    host.includes("elimulink-institution") ||
    host.includes("elimulink-institution.web.app") ||
    host.includes("elimulink-institution.firebaseapp.com");
  if (isInstitutionHost) return "institution";
  return "public";
}
export function getHostMode(hostname: string): HostMode {
  return getAppMode(hostname);
}
export function getResolvedHostMode(hostname: string, pathname = "", _envMode?: string): HostMode {
  const pathMode = modeFromPath(pathname);
  if (pathMode && isLocalLikeHost(hostname)) return pathMode;
  return getAppMode(hostname);
}
