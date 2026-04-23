// PQ -> PDF renderer.
//
// Visual layout: a dark navy title band at the top with the document
// name, a row holding the PQ number, CE badge, and CAA logo, then the
// protocol question, guidance, remarks (Status of Implementation),
// answer (OCAA Final Response) + numbered evidence list, and an ICAO
// references footer.
//
// Only the four pieces of data requested end up on the page:
//   1. ICAO placeholder info (pqNo, CE, question, guidance, ICAO refs)
//   2. Status of Implementation (latest approved, else latest)
//   3. OCAA Final Response      (latest approved, else latest)
//   4. Approved evidence links
//
// Rendered server-side via @react-pdf/renderer. Never imported from
// client components.
/* eslint-disable jsx-a11y/alt-text */
import {
  Document,
  Font,
  Image,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import path from "node:path";
import type { EvidenceLink, FieldSubmission } from "@prisma/client";

import type { HydratedPQ } from "@/lib/types";
import {
  PDF_COLORS,
  PDF_FOOTER_PREFIX,
  PDF_HEADER,
  PDF_PENDING_PLACEHOLDER,
} from "./config";

// Calibri is proprietary (Microsoft); Carlito is a free font that is
// metric-compatible with Calibri (identical widths), so the layout
// looks the same with no licensing risk.
const FONT_DIR = path.join(process.cwd(), "public", "fonts", "carlito");
let fontsRegistered = false;
function ensureFonts() {
  if (fontsRegistered) return;
  Font.register({
    family: "Carlito",
    fonts: [
      { src: path.join(FONT_DIR, "Carlito-Regular.ttf"), fontWeight: "normal" },
      { src: path.join(FONT_DIR, "Carlito-Bold.ttf"), fontWeight: "bold" },
      {
        src: path.join(FONT_DIR, "Carlito-Italic.ttf"),
        fontWeight: "normal",
        fontStyle: "italic",
      },
      {
        src: path.join(FONT_DIR, "Carlito-BoldItalic.ttf"),
        fontWeight: "bold",
        fontStyle: "italic",
      },
    ],
  });
  // Disable hyphenation so words like "regulations" don't get split
  // mid-word, which looks unprofessional in compliance docs.
  Font.registerHyphenationCallback((word) => [word]);
  fontsRegistered = true;
}

const LOGO_PATH = path.join(
  process.cwd(),
  "public",
  "branding",
  "caa-logo-white.png"
);

const styles = StyleSheet.create({
  page: {
    fontFamily: "Carlito",
    fontSize: 10,
    color: PDF_COLORS.bodyText,
    backgroundColor: PDF_COLORS.bodyBg,
    paddingTop: 28,
    paddingBottom: 42,
    paddingHorizontal: 34,
    lineHeight: 1.35,
  },
  outerFrame: {
    borderWidth: 1,
    borderColor: PDF_COLORS.border,
    borderStyle: "solid",
  },
  titleBand: {
    backgroundColor: PDF_COLORS.headerBg,
    color: PDF_COLORS.headerText,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  titleLine: {
    fontSize: 12,
    fontWeight: "bold",
    color: PDF_COLORS.headerText,
    textAlign: "center",
  },
  officeLine: {
    fontSize: 11,
    fontWeight: "bold",
    color: PDF_COLORS.headerText,
    textAlign: "center",
    marginTop: 2,
  },
  idRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: PDF_COLORS.border,
    borderTopStyle: "solid",
  },
  idCell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: PDF_COLORS.border,
    borderRightStyle: "solid",
    alignItems: "center",
    justifyContent: "center",
  },
  idCellLast: {
    borderRightWidth: 0,
  },
  idCellText: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
  },
  logoWrap: {
    // Mirror the dark navy header so the white logo is visible.
    backgroundColor: PDF_COLORS.headerBg,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  logo: {
    width: 58,
    height: 58,
    objectFit: "contain",
  },
  questionRow: {
    borderTopWidth: 1,
    borderTopColor: PDF_COLORS.border,
    borderTopStyle: "solid",
    padding: 8,
  },
  questionText: {
    fontSize: 10,
    fontWeight: "bold",
  },
  subBand: {
    backgroundColor: PDF_COLORS.subBandBg,
    color: PDF_COLORS.subBandText,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: PDF_COLORS.border,
    borderTopStyle: "solid",
    alignItems: "center",
  },
  subBandText: {
    fontSize: 10,
    fontWeight: "bold",
    color: PDF_COLORS.subBandText,
  },
  body: {
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: PDF_COLORS.border,
    borderTopStyle: "solid",
  },
  bodyText: {
    fontSize: 10,
  },
  pending: {
    fontSize: 10,
    fontStyle: "italic",
    color: "#666666",
  },
  guidanceText: {
    fontSize: 10,
  },
  evidenceItem: {
    marginTop: 2,
    flexDirection: "row",
  },
  evidenceNumber: {
    fontWeight: "bold",
    width: 18,
  },
  evidenceBody: {
    flex: 1,
  },
  link: {
    color: PDF_COLORS.link,
    textDecoration: "underline",
  },
  icaoRefRow: {
    borderTopWidth: 1,
    borderTopColor: PDF_COLORS.border,
    borderTopStyle: "solid",
    padding: 6,
  },
  icaoRefText: {
    fontSize: 10,
  },
  icaoRefLabel: {
    fontSize: 11,
    fontWeight: "bold",
    fontFamily: "Carlito",
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 34,
    right: 34,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 9,
    color: "#555555",
  },
});

// Props are kept loose so the route handler can just pass the rows it
// already fetched without mapping to a bespoke shape.
export type PQReportProps = {
  pq: HydratedPQ;
  statusOfImplementation: FieldSubmission | null;
  ocaaFinalResponse: FieldSubmission | null;
  approvedEvidence: EvidenceLink[];
};

function PendingOrText({ value }: { value: string | null | undefined }) {
  if (!value || value.trim() === "") {
    return <Text style={styles.pending}>{PDF_PENDING_PLACEHOLDER}</Text>;
  }
  return <Text style={styles.bodyText}>{value}</Text>;
}

export function PQReport({
  pq,
  statusOfImplementation,
  ocaaFinalResponse,
  approvedEvidence,
}: PQReportProps) {
  ensureFonts();

  const icaoRefLine = pq.icaoReferences.filter((r) => r && r.trim()).join(", ");

  // Title composition: always render auditName; only append
  // " - MONTH YEAR" when either is configured via env vars, otherwise
  // the title band is just the document name and the office line.
  const datedSuffix = [PDF_HEADER.auditMonth, PDF_HEADER.auditYear]
    .filter((p) => p && p.trim())
    .join(" ")
    .trim();
  const titleText = datedSuffix
    ? `${PDF_HEADER.auditName} - ${datedSuffix}`
    : PDF_HEADER.auditName;

  return (
    <Document
      title={`${PDF_HEADER.auditName} - PQ ${pq.pqNo}`}
      author="CAA Oman - DGCAR PEL Office"
      subject={`Protocol Question ${pq.pqNo}`}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.outerFrame}>
          <View style={styles.titleBand}>
            <Text style={styles.titleLine}>{titleText}</Text>
            <Text style={styles.officeLine}>{PDF_HEADER.officeLine}</Text>
          </View>

          {/* PQ no / CE / logo row */}
          <View style={styles.idRow}>
            <View style={styles.idCell}>
              <Text style={styles.idCellText}>{pq.pqNo}</Text>
            </View>
            <View style={styles.idCell}>
              <Text style={styles.idCellText}>{pq.ce ?? ""}</Text>
            </View>
            <View style={[styles.idCell, styles.idCellLast, styles.logoWrap]}>
              <Image src={LOGO_PATH} style={styles.logo} />
            </View>
          </View>

          {/* Protocol question */}
          <View style={styles.questionRow}>
            <Text style={styles.questionText}>
              {pq.question ?? PDF_PENDING_PLACEHOLDER}
            </Text>
          </View>

          {/*
           * Sub-section labels match the data fields exactly, so it's
           * obvious what lives in each block:
           *   - Guidance for ICAO Review  -> ProtocolQuestion.guidance
           *   - Status of Implementation  -> latest approved-or-newest
           *                                  STATUS_OF_IMPLEMENTATION
           *                                  submission
           *   - OCAA Final Response       -> latest approved-or-newest
           *                                  OCAA_FINAL_RESPONSE submission
           *   - Evidences                 -> approved EvidenceLink rows
           *   - ICAO REF                  -> ProtocolQuestion.icaoReferences
           * The ICAO template's "Section A / Remarks for ICAO Auditor /
           * Evidence and Reference" wording was formatting inspiration
           * only and is intentionally not reused.
           */}

          {/* Guidance for ICAO Review */}
          <View style={styles.subBand}>
            <Text style={styles.subBandText}>Guidance for ICAO Review</Text>
          </View>
          <View style={styles.body}>
            {pq.guidance.length === 0 ? (
              <Text style={styles.pending}>{PDF_PENDING_PLACEHOLDER}</Text>
            ) : (
              // The source cells already carry their own prefix
              // ("1)", "2)", "a)", "b)"...), so render each as plain
              // text with a small indent for the lettered sub-items so
              // they visually nest under the numeric parent.
              pq.guidance.map((g, i) => {
                const isSub = /^\s*[a-z]\)/i.test(g);
                return (
                  <Text
                    key={i}
                    style={[
                      styles.guidanceText,
                      { marginBottom: 2, marginLeft: isSub ? 14 : 0 },
                    ]}
                  >
                    {g}
                  </Text>
                );
              })
            )}
          </View>

          {/* Status of Implementation */}
          <View style={styles.subBand}>
            <Text style={styles.subBandText}>Status of Implementation</Text>
          </View>
          <View style={styles.body}>
            <PendingOrText value={statusOfImplementation?.value} />
          </View>

          {/* OCAA Final Response */}
          <View style={styles.subBand}>
            <Text style={styles.subBandText}>OCAA Final Response</Text>
          </View>
          <View style={styles.body}>
            <PendingOrText value={ocaaFinalResponse?.value} />
          </View>

          {/* Evidences */}
          <View style={styles.subBand}>
            <Text style={styles.subBandText}>Evidences</Text>
          </View>
          <View style={styles.body}>
            {approvedEvidence.length === 0 ? (
              <Text style={styles.pending}>{PDF_PENDING_PLACEHOLDER}</Text>
            ) : (
              approvedEvidence.map((e, i) => (
                <View key={e.id} style={styles.evidenceItem}>
                  <Text style={styles.evidenceNumber}>{i + 1}.</Text>
                  <View style={styles.evidenceBody}>
                    <Link src={e.url} style={styles.link}>
                      {e.label || e.url}
                    </Link>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* ICAO references footer strip */}
          <View style={styles.icaoRefRow}>
            <Text style={styles.icaoRefText}>
              <Text style={styles.icaoRefLabel}>ICAO REF: </Text>
              {icaoRefLine || PDF_PENDING_PLACEHOLDER}
            </Text>
          </View>
        </View>

        {/* Page footer */}
        <View style={styles.footer} fixed>
          <Text>
            {PDF_FOOTER_PREFIX} {pq.pqNo}
          </Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}
