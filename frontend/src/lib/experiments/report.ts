import type { SimParameter } from "@/lib/physics/engine";
import type { SeriesData } from "@/lib/physics/useSimModule";
import { renderChartPng } from "./chartImage";
import { errorPercent, type GuidedExperiment, type ResultRow } from "./guided";
import type { Observation } from "./observations";

export interface ReportInput {
  experiment: GuidedExperiment;
  /** Parameters of the run being reported (value and unit as the engine reports them). */
  parameters: SimParameter[];
  /** Formula-versus-simulation results of the current run. */
  results: ResultRow[];
  observations: Observation[];
  notes: string;
  series: SeriesData | null;
}

/**
 * The PDF's built-in Helvetica has no Greek letters or subscripts, so those
 * are written out in plain ASCII (theta, mu_s, ...). Anything else outside
 * Latin-1 is dropped rather than printed as garbage.
 */
export function pdfText(text: string): string {
  const map: Record<string, string> = {
    θ: "theta",
    ω: "omega",
    α: "alpha",
    μ: "mu",
    Σ: "Sum",
    Δ: "Delta",
    π: "pi",
    ΔKE: "dKE",
    "₀": "0",
    "₁": "1",
    "₂": "2",
    ₛ: "s",
    ₖ: "k",
    "′": "'",
    "−": "-",
    "≤": "<=",
    "≥": ">=",
    "√": "sqrt",
    "²": "^2",
    "³": "^3",
    "°": " deg",
    "·": "*",
    "½": "1/2",
    "×": "x",
    "→": "->",
    ˣ: "x",
    ₓ: "x",
    "—": "-",
    "–": "-",
  };
  let out = "";
  for (const ch of text) {
    if (map[ch] !== undefined) out += map[ch];
    else if (ch.charCodeAt(0) < 128) out += ch;
    else if (ch.charCodeAt(0) <= 255) out += ch; // Latin-1 is available
    // else: dropped
  }
  return out;
}

const fmt = (v: number | null, digits: number) =>
  v === null || !Number.isFinite(v) ? "-" : v.toFixed(digits);

export async function generateReport(input: ReportInput): Promise<void> {
  // jsPDF is loaded only when a report is requested, keeping the main bundle small.
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const PAGE_W = 210;
  const PAGE_H = 297;
  const M = 16;
  const W = PAGE_W - 2 * M;
  let y = M;

  const ensure = (need: number) => {
    if (y + need > PAGE_H - 18) {
      doc.addPage();
      y = M;
    }
  };
  const heading = (text: string) => {
    ensure(14);
    y += 3;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(29, 78, 216);
    doc.text(pdfText(text), M, y);
    doc.setDrawColor(209, 213, 219);
    doc.line(M, y + 1.8, M + W, y + 1.8);
    doc.setTextColor(17, 24, 39);
    y += 7;
  };
  const paragraph = (
    text: string,
    opts: { size?: number; font?: "helvetica" | "courier"; bold?: boolean } = {},
  ) => {
    doc.setFont(opts.font ?? "helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size ?? 10);
    doc.setTextColor(17, 24, 39);
    const lines = doc.splitTextToSize(pdfText(text), W) as string[];
    for (const line of lines) {
      ensure(5);
      doc.text(line, M, y);
      y += 4.6;
    }
    y += 1.5;
  };
  const row = (cells: string[], widths: number[], bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(9.5);
    const wrapped = cells.map(
      (c, i) => doc.splitTextToSize(pdfText(c), (widths[i] ?? 30) - 2) as string[],
    );
    const height = Math.max(...wrapped.map((w) => w.length)) * 4.4 + 2;
    ensure(height);
    let x = M;
    wrapped.forEach((lines, i) => {
      lines.forEach((line, j) => doc.text(line, x + 1, y + 3.6 + j * 4.4));
      x += widths[i] ?? 30;
    });
    doc.setDrawColor(229, 231, 235);
    doc.line(M, y + height, M + W, y + height);
    y += height;
  };

  // ---- title block -------------------------------------------------------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(17, 24, 39);
  doc.text("KINETIQ Experiment Report", M, y + 6);
  y += 14;
  doc.setFontSize(14);
  doc.text(pdfText(input.experiment.title), M, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(75, 85, 99);
  doc.text(
    `Generated ${new Date().toLocaleString()}  |  All values computed by the C++ physics engine`,
    M,
    y,
  );
  y += 4;

  // ---- text sections -------------------------------------------------------
  heading("Objective");
  paragraph(input.experiment.objective);
  heading("Theory");
  input.experiment.theory.forEach((t) => paragraph(t));
  heading("Relevant equations");
  input.experiment.equations.forEach((e) => paragraph(e.plain, { font: "courier", size: 10 }));

  // ---- conditions ------------------------------------------------------------
  heading("Initial conditions and parameters");
  const pw = [W * 0.5, W * 0.3, W * 0.2];
  row(["Parameter", "Value", "Unit"], pw, true);
  input.parameters.forEach((p) =>
    row([p.label, String(Number(p.value.toPrecision(6))), p.unit], pw),
  );

  // ---- results ----------------------------------------------------------------
  heading("Calculated results (current run)");
  const rw = [W * 0.36, W * 0.2, W * 0.2, W * 0.12, W * 0.12];
  row(["Quantity", "Formula", "Simulated", "Error %", "Unit"], rw, true);
  input.results.forEach((r) => {
    const e = errorPercent(r);
    row(
      [
        r.label,
        fmt(r.formula, r.digits),
        fmt(r.measured, r.digits),
        e === null ? "-" : e.toFixed(4),
        r.unit,
      ],
      rw,
    );
  });

  // ---- observations --------------------------------------------------------------
  heading(
    `Observations (${input.observations.length} recorded run${input.observations.length === 1 ? "" : "s"})`,
  );
  if (input.observations.length === 0) {
    paragraph("No runs were recorded for this report.");
  } else {
    input.observations.forEach((o, i) => {
      ensure(10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(`Run ${i + 1}`, M, y);
      y += 4.6;
      paragraph(
        o.conditions
          .map((c) => `${c.label} = ${Number(c.value.toPrecision(5))} ${c.unit}`.trim())
          .join(";  "),
        { size: 9 },
      );
      o.results.forEach((r) => {
        const e = errorPercent(r);
        paragraph(
          `${r.label}: formula ${fmt(r.formula, r.digits)}, simulated ${fmt(r.measured, r.digits)} ${r.unit}${e === null ? "" : ` (difference ${e.toFixed(4)}%)`}`,
          { size: 9 },
        );
      });
    });
  }

  // ---- graphs --------------------------------------------------------------------
  heading("Graphs");
  let drawn = 0;
  for (const spec of input.experiment.charts) {
    const png = renderChartPng(input.series, spec);
    if (!png) continue;
    const h = (W * 340) / 900;
    ensure(h + 4);
    doc.addImage(png, "PNG", M, y, W, h);
    y += h + 4;
    drawn += 1;
  }
  if (drawn === 0)
    paragraph("Run the simulation before generating the report to include its graphs.");

  // ---- notes ------------------------------------------------------------------------
  heading("Student notes and conclusion");
  paragraph(input.notes.trim() ? input.notes : "(none written)");

  // ---- footer on every page -----------------------------------------------------------
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(107, 114, 128);
    doc.text(`KINETIQ - ${pdfText(input.experiment.title)}`, M, PAGE_H - 10);
    doc.text(`Page ${i} of ${pages}`, PAGE_W - M, PAGE_H - 10, { align: "right" });
  }

  doc.save(`kinetiq-${input.experiment.id}-report.pdf`);
}
