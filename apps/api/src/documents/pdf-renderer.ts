import PDFDocument from "pdfkit";
import { SELLER } from "../common/format";

/**
 * A printable document described as data: the order documents build one of
 * these (pure, unit-tested) and this renders it to an A4 PDF with PDFKit's
 * built-in Helvetica — no fonts or browser to ship.
 */
export type DocSpec = {
  title: string;
  subtitle?: string;
  sellerLines: string[]; // under the brand name, top left
  meta: [string, string][]; // top right: "Order number" → "AA-…"
  parties: { heading: string; lines: string[] }[]; // side by side
  table: { columns: { header: string; width: number; align?: "left" | "right" }[]; rows: string[][] };
  totals?: { label: string; value: string; strong?: boolean }[];
  notes?: string[];
  signatures?: string[]; // labelled lines to sign on (delivery note)
  footer: string;
};

const INK = "#1d1d1f";
const MUTED = "#5b6470";
const RULE = "#d9d4c9";
const BRAND = "#1f4e79";
const LEFT = 50;
const WIDTH = 495; // A4 width 595 - 2 × 50

export function renderPdf(spec: DocSpec): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", bufferPages: true, margins: { top: 50, bottom: 60, left: LEFT, right: LEFT }, info: { Title: spec.title, Author: SELLER.tradingName } });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Header: brand and seller on the left, title and meta on the right.
    doc.font("Helvetica-Bold").fontSize(15).fillColor(INK).text(SELLER.tradingName.toUpperCase(), LEFT, 50, { characterSpacing: 0.6 });
    doc.font("Helvetica").fontSize(8.5).fillColor(MUTED);
    for (const line of spec.sellerLines) doc.text(line, LEFT, doc.y + 1, { width: 250 });
    const leftBottom = doc.y;

    doc.font("Helvetica-Bold").fontSize(18).fillColor(BRAND).text(spec.title, 320, 48, { width: 225, align: "right" });
    if (spec.subtitle) doc.font("Helvetica").fontSize(8.5).fillColor(MUTED).text(spec.subtitle, 320, doc.y, { width: 225, align: "right" });
    let y = doc.y + 6;
    for (const [label, value] of spec.meta) {
      doc.font("Helvetica").fontSize(8.5).fillColor(MUTED).text(label, 320, y, { width: 100 });
      doc.font("Helvetica-Bold").fillColor(INK).text(value, 420, y, { width: 125, align: "right" });
      y = Math.max(doc.y, y + 11) + 1;
    }
    y = Math.max(leftBottom, y) + 18;
    rule(doc, y);

    // Parties side by side.
    y += 12;
    const colWidth = WIDTH / Math.max(spec.parties.length, 1);
    let partiesBottom = y;
    spec.parties.forEach((party, i) => {
      const x = LEFT + i * colWidth;
      doc.font("Helvetica-Bold").fontSize(8).fillColor(MUTED).text(party.heading.toUpperCase(), x, y, { width: colWidth - 12, characterSpacing: 0.5 });
      doc.font("Helvetica").fontSize(9.5).fillColor(INK);
      for (const line of party.lines) doc.text(line, x, doc.y + 2, { width: colWidth - 12 });
      partiesBottom = Math.max(partiesBottom, doc.y);
    });
    y = partiesBottom + 20;

    // Line-item table, repeating the header on a new page.
    const header = () => {
      doc.font("Helvetica-Bold").fontSize(8.5);
      const height = Math.max(...spec.table.columns.map((c) => doc.heightOfString(c.header, { width: c.width - 12 })));
      doc.rect(LEFT, y - 5, WIDTH, height + 10).fill("#f4f1ea");
      let x = LEFT + 6;
      doc.fillColor(INK);
      for (const c of spec.table.columns) {
        doc.text(c.header, x, y, { width: c.width - 12, align: c.align ?? "left" });
        x += c.width;
      }
      y += height + 11;
    };
    header();
    for (const row of spec.table.rows) {
      doc.font("Helvetica").fontSize(9.5);
      const height = Math.max(...row.map((cell, i) => doc.heightOfString(cell, { width: spec.table.columns[i].width - 12 })));
      if (y + height > doc.page.height - 120) {
        doc.addPage();
        y = 50;
        header();
      }
      let x = LEFT + 6;
      doc.fillColor(INK);
      row.forEach((cell, i) => {
        const c = spec.table.columns[i];
        doc.text(cell, x, y, { width: c.width - 12, align: c.align ?? "left" });
        x += c.width;
      });
      y += height + 6;
      rule(doc, y - 3);
    }

    // Totals, right-aligned.
    if (spec.totals?.length) {
      y += 6;
      for (const t of spec.totals) {
        doc.font(t.strong ? "Helvetica-Bold" : "Helvetica").fontSize(t.strong ? 11 : 9.5).fillColor(t.strong ? INK : MUTED);
        doc.text(t.label, 300, y, { width: 140 });
        doc.fillColor(INK).text(t.value, 440, y, { width: 105, align: "right" });
        y += t.strong ? 17 : 14;
      }
    }

    // Notes.
    if (spec.notes?.length) {
      y += 14;
      if (y > doc.page.height - 160) {
        doc.addPage();
        y = 50;
      }
      doc.font("Helvetica").fontSize(8.5).fillColor(MUTED);
      for (const note of spec.notes) {
        doc.text(note, LEFT, y, { width: WIDTH });
        y = doc.y + 5;
      }
    }

    // Signature lines (delivery note).
    if (spec.signatures?.length) {
      y += 22;
      if (y > doc.page.height - 60 - spec.signatures.length * 34) {
        doc.addPage();
        y = 60;
      }
      const half = WIDTH / 2;
      spec.signatures.forEach((label, i) => {
        const x = LEFT + (i % 2) * half;
        const rowY = y + Math.floor(i / 2) * 36;
        doc.moveTo(x, rowY + 18).lineTo(x + half - 20, rowY + 18).strokeColor(INK).lineWidth(0.6).stroke();
        doc.font("Helvetica").fontSize(8).fillColor(MUTED).text(label, x, rowY + 22, { width: half - 20 });
      });
    }

    // Footer on every page.
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      // Writing inside the bottom margin would otherwise start a new page.
      doc.page.margins.bottom = 0;
      const bottom = doc.page.height - 40;
      doc.font("Helvetica").fontSize(7.5).fillColor(MUTED);
      doc.text(`${spec.footer}  ·  Page ${i + 1} of ${range.count}`, LEFT, bottom, { width: WIDTH, align: "center", lineBreak: false });
    }
    doc.end();
  });
}

function rule(doc: PDFKit.PDFDocument, y: number) {
  doc.moveTo(LEFT, y).lineTo(LEFT + WIDTH, y).strokeColor(RULE).lineWidth(0.5).stroke();
}
