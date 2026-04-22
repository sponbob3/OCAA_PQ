// PDF report configuration. Edit the strings below (or set the matching
// env vars) to change what appears on the generated ICVM PDF without
// touching the renderer.
//
// Everything here is imported server-side only (the PDF is rendered in
// a route handler), so the values never reach the client bundle.

// The top title band is composed from three parts:
//
//     "{auditName} - {auditMonth} {auditYear}"
//     "{officeLine}"
//
// Each part can be overridden at deploy time via an env var so we don't
// have to edit source when a new ICVM audit rolls around. The month and
// year default to the server's current locale month/year so a freshly
// cloned repo never prints a stale date like "NOVEMBER 2023" - but for
// a real audit they should always be set explicitly in the environment.
const monthName = () =>
  new Date().toLocaleString("en-US", { month: "long" }).toUpperCase();
const yearValue = () => String(new Date().getFullYear());

const env = (key: string) => {
  const v = process.env[key];
  return v && v.trim() ? v.trim() : null;
};

export const PDF_HEADER = {
  auditName: env("AUDIT_NAME") ?? "ICAO ICVM",
  auditMonth: (env("AUDIT_MONTH") ?? monthName()).toUpperCase(),
  auditYear: env("AUDIT_YEAR") ?? yearValue(),
  officeLine:
    env("AUDIT_OFFICE") ?? "CAA/DGCAR PERSONNEL LICENSING OFFICE (FSD)",
};

// Used in the page footer as "ICVM PQ {pqNo}".
export const PDF_FOOTER_PREFIX = env("AUDIT_FOOTER_PREFIX") ?? "ICVM PQ";

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
