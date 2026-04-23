// PDF report configuration. Edit the strings below (or set the matching
// env vars) to change what appears on the generated PDF without
// touching the renderer.
//
// Everything here is imported server-side only (the PDF is rendered in
// a route handler), so the values never reach the client bundle.

// The top title band is composed from up to three parts:
//
//     "{auditName}"  (optionally with " - {auditMonth} {auditYear}" appended
//                     when either is set via env var)
//     "{officeLine}"
//
// Each part can be overridden at deploy time via an env var so we don't
// have to edit source when the title or dating changes. auditMonth and
// auditYear default to empty so the title reads cleanly out of the box;
// set them explicitly when a dated run is needed.
const env = (key: string) => {
  const v = process.env[key];
  return v && v.trim() ? v.trim() : null;
};

export const PDF_HEADER = {
  auditName: env("AUDIT_NAME") ?? "Final USOAP Response Document",
  auditMonth: env("AUDIT_MONTH")?.toUpperCase() ?? "",
  auditYear: env("AUDIT_YEAR") ?? "",
  officeLine:
    env("AUDIT_OFFICE") ?? "CAA/DGCAR PERSONNEL LICENSING OFFICE (FSD)",
};

// Used in the page footer as "{prefix} {pqNo}".
export const PDF_FOOTER_PREFIX = env("AUDIT_FOOTER_PREFIX") ?? "PQ";

// Placeholder shown when a field has no value yet. Applied to status
// of implementation, OCAA final response, and the evidence list.
export const PDF_PENDING_PLACEHOLDER = "Pending";

// Hex colors that match the overall look of the reference template.
export const PDF_COLORS = {
  // Dark navy header stripe at the very top of the page.
  headerBg: "#1F3758",
  headerText: "#FFFFFF",
  // Sub-section band ("Guidance for ICAO Review", "Status of
  // Implementation", etc.). Same navy so section labels feel uniform.
  subBandBg: "#2F4A7B",
  subBandText: "#FFFFFF",
  border: "#8A8A8A",
  bodyBg: "#FFFFFF",
  bodyText: "#111111",
  link: "#1A5FB4",
};
