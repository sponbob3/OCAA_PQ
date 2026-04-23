// GET /api/pqs/[pqNo]/pdf
//
// Renders the Final USOAP Response Document for a PQ as a PDF and
// streams it back. Data sources (mirrors the PQ detail page exactly):
//   - ProtocolQuestion row: pqNo, ce, question, guidance, icaoReferences
//   - Status of Implementation: latest approved submission, else latest
//   - OCAA Final Response:      latest approved submission, else latest
//   - Evidence links:           approved only
//
// The renderer runs server-side; @react-pdf/renderer needs Node APIs
// (fs access to the font + logo files), so this route is pinned to the
// Node runtime rather than the edge runtime.
import { renderToStream } from "@react-pdf/renderer";
import React from "react";

import { prisma } from "@/lib/db";
import { hydratePQ } from "@/lib/types";
import { PQReport } from "@/lib/pdf/PQReport";
import { pickApprovedEvidence, pickFieldValue } from "@/lib/pdf/select";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ pqNo: string }> }
) {
  const { pqNo } = await params;

  const row = await prisma.protocolQuestion.findUnique({
    where: { pqNo },
    include: {
      evidenceLinks: {
        orderBy: { createdAt: "asc" },
      },
      fieldSubmissions: {
        where: {
          fieldKey: { in: ["STATUS_OF_IMPLEMENTATION", "OCAA_FINAL_RESPONSE"] },
        },
        orderBy: [{ seq: "desc" }],
      },
    },
  });

  if (!row) {
    return new Response("PQ not found", { status: 404 });
  }

  const pq = hydratePQ(row);
  const statusOfImplementation = pickFieldValue(
    row.fieldSubmissions,
    "STATUS_OF_IMPLEMENTATION"
  );
  const ocaaFinalResponse = pickFieldValue(
    row.fieldSubmissions,
    "OCAA_FINAL_RESPONSE"
  );
  const approvedEvidence = pickApprovedEvidence(row.evidenceLinks);

  const stream = await renderToStream(
    <PQReport
      pq={pq}
      statusOfImplementation={statusOfImplementation}
      ocaaFinalResponse={ocaaFinalResponse}
      approvedEvidence={approvedEvidence}
    />
  );

  // renderToStream returns a Node Readable; Next expects a Web stream.
  // The WHATWG stream wrapper handles the conversion.
  const webStream = nodeToWeb(stream);

  return new Response(webStream, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="USOAP-Response-PQ-${pq.pqNo}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}

// Convert a Node Readable into a WHATWG ReadableStream so the Next
// Response can consume it directly. @react-pdf/renderer's stream is a
// Node stream; Next route handlers need Web streams in the Response
// body. We adapt manually to avoid dragging in the `stream/web`
// import-style inconsistencies between bundling environments.
function nodeToWeb(node: NodeJS.ReadableStream): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      node.on("data", (chunk: Buffer | string) => {
        const buf =
          typeof chunk === "string" ? Buffer.from(chunk, "utf8") : chunk;
        controller.enqueue(new Uint8Array(buf));
      });
      node.on("end", () => controller.close());
      node.on("error", (err) => controller.error(err));
    },
    cancel() {
      // Best-effort teardown; pdfkit streams are plain Readables.
      const maybeDestroy = (node as unknown as { destroy?: () => void })
        .destroy;
      if (typeof maybeDestroy === "function") maybeDestroy.call(node);
    },
  });
}
