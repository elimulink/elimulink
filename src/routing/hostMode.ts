export type HostMode = "public" | "student" | "institution";
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
export function getResolvedHostMode(hostname: string, _envMode?: string): HostMode {
  return getAppMode(hostname);
}