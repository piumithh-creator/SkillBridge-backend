import PDFDocument from "pdfkit";
import type { Response } from "express";

export interface Column {
  label: string;
  width: number;
}

const BRAND = "#4F46E5";
const INK = "#0F172A";
const MUTED = "#64748B";

export class ReportWriter {
  readonly doc: PDFKit.PDFDocument;

  constructor(res: Response, filename: string, title: string, subtitle?: string) {
    this.doc = new PDFDocument({ margin: 48, size: "A4", info: { Title: title, Author: "SkillBridge" } });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    this.doc.pipe(res);

    this.doc.rect(0, 0, this.doc.page.width, 70).fill(BRAND);
    this.doc.fillColor("#FFFFFF").font("Helvetica-Bold").fontSize(20).text("SkillBridge", 48, 22);
    this.doc.font("Helvetica").fontSize(10).text(title, 48, 46);
    this.doc.fillColor(INK).moveDown(3);
    this.doc.y = 95;
    this.doc.font("Helvetica-Bold").fontSize(18).fillColor(INK).text(title, 48, 95);
    if (subtitle) this.doc.font("Helvetica").fontSize(10).fillColor(MUTED).text(subtitle);
    this.doc.fontSize(9).fillColor(MUTED).text(`Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC`);
    this.doc.moveDown();
  }

  heading(text: string): this {
    this.ensureSpace(40);
    this.doc.moveDown(0.6).font("Helvetica-Bold").fontSize(13).fillColor(BRAND).text(text);
    this.doc.moveDown(0.3).font("Helvetica").fontSize(10).fillColor(INK);
    return this;
  }

  kv(label: string, value: string | number): this {
    this.ensureSpace(18);
    this.doc.font("Helvetica-Bold").fontSize(10).fillColor(INK).text(`${label}: `, { continued: true });
    this.doc.font("Helvetica").text(String(value));
    return this;
  }

  paragraph(text: string): this {
    this.doc.font("Helvetica").fontSize(10).fillColor(INK).text(text);
    this.doc.moveDown(0.4);
    return this;
  }

  bullets(items: string[]): this {
    if (!items.length) return this.paragraph("None");
    items.forEach((i) => {
      this.ensureSpace(16);
      this.doc.font("Helvetica").fontSize(10).fillColor(INK).text(`•  ${i}`, { indent: 6 });
    });
    this.doc.moveDown(0.4);
    return this;
  }

  table(cols: Column[], rows: string[][]): this {
    const left = this.doc.page.margins.left;
    const row = (cells: string[], header: boolean) => {
      this.doc.font(header ? "Helvetica-Bold" : "Helvetica").fontSize(9);
      const h = Math.max(...cells.map((c, i) => this.doc.heightOfString(c, { width: cols[i].width - 6 }))) + 8;
      this.ensureSpace(h + 4);
      const y = this.doc.y;
      if (header) this.doc.rect(left, y, cols.reduce((s, c) => s + c.width, 0), h).fill("#EEF2FF");
      this.doc.fillColor(INK);
      let x = left;
      cells.forEach((c, i) => {
        this.doc.text(c, x + 3, y + 4, { width: cols[i].width - 6, lineBreak: true });
        x += cols[i].width;
      });
      this.doc.moveTo(left, y + h).lineTo(x, y + h).strokeColor("#E2E8F0").stroke();
      this.doc.x = left;
      this.doc.y = y + h;
    };
    row(cols.map((c) => c.label), true);
    if (!rows.length) this.paragraph("No records.");
    rows.forEach((r) => row(r, false));
    this.doc.moveDown();
    return this;
  }

  end(): void {
    this.doc.end();
  }

  private ensureSpace(needed: number) {
    if (this.doc.y + needed > this.doc.page.height - this.doc.page.margins.bottom) {
      this.doc.addPage();
      this.doc.x = this.doc.page.margins.left;
    }
  }
}
