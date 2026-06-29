import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type PredictionRunPdf = {
  id: string;
  predicted_at: string;
  next_period_low: string | null;
  next_period_high: string | null;
  next_period_end: string | null;
  fertile_window_low: string | null;
  fertile_window_high: string | null;
  ovulation_day: string | null;
  pms_start: string | null;
  confidence: number | null;
  is_late: boolean | null;
  summary: string | null;
  cycles_used: number;
  data_start: string | null;
  data_end: string | null;
  recent_starts: string[];
  avg_cycle_length: number | null;
  avg_period_length: number | null;
  regularity_label: string | null;
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
function daysBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export function buildPredictionRunPdf(run: PredictionRunPdf, generatedFor: string): Blob {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 48;
  let y = margin;

  // Header
  doc.setFont("times", "italic");
  doc.setFontSize(22);
  doc.text("HerSpace · Cycle Prediction Report", margin, y);
  y += 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(
    `Prepared for ${generatedFor} · Prediction run ${fmtDateTime(run.predicted_at)} · Exported ${new Date().toLocaleDateString()}`,
    margin,
    y,
  );
  y += 18;
  doc.setTextColor(20);

  if (run.summary) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(run.summary, 515);
    doc.text(lines, margin, y);
    y += lines.length * 12 + 10;
    doc.setFont("helvetica", "normal");
  }

  // Months & period starts used
  const starts = [...(run.recent_starts ?? [])].sort();
  const groups = new Map<string, string[]>();
  for (const d of starts) {
    const key = new Date(d).toLocaleDateString(undefined, { month: "long", year: "numeric" });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(d);
  }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Month", "Period start dates"]],
    body: Array.from(groups.entries()).map(([m, dates]) => [
      m,
      dates.map((d) => fmtDate(d)).join(",  "),
    ]),
    theme: "striped",
    styles: { font: "helvetica", fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [120, 80, 60] },
  });
  y = (doc as any).lastAutoTable.finalY + 18;

  // Gaps between consecutive starts
  const gaps: number[] = [];
  for (let i = 1; i < starts.length; i++) {
    gaps.push(Math.round((new Date(starts[i]).getTime() - new Date(starts[i - 1]).getTime()) / 86400000));
  }

  // Average cycle calculations
  const dataWindow =
    run.data_start && run.data_end
      ? `${fmtDate(run.data_start)} → ${fmtDate(run.data_end)}`
      : "—";

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Average cycle calculations", "Value"]],
    body: [
      ["Period starts used", String(run.cycles_used)],
      ["Data window", dataWindow],
      ["Average cycle length", run.avg_cycle_length ? `${Math.round(Number(run.avg_cycle_length))} days` : "—"],
      ["Average period length", run.avg_period_length ? `${Math.round(Number(run.avg_period_length))} days` : "—"],
      ["Regularity", run.regularity_label ?? "—"],
      ["Cycles measured (gaps)", String(Math.max(starts.length - 1, 0))],
      [
        "Gap range between starts",
        gaps.length > 0 ? `${Math.min(...gaps)} – ${Math.max(...gaps)} days` : "—",
      ],
      ["Recent gap sequence", gaps.length > 0 ? gaps.slice(-8).join(" · ") + " d" : "—"],
      ["Model confidence", `${Math.round(run.confidence ?? 0)}%`],
    ],
    theme: "striped",
    styles: { font: "helvetica", fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [120, 80, 60] },
  });
  y = (doc as any).lastAutoTable.finalY + 18;

  // Fertility-window parameters
  const fwLen = daysBetween(run.fertile_window_low, run.fertile_window_high);
  const fwLenDisplay = fwLen !== null ? `${fwLen + 1} days` : "—";
  const ovOffset =
    run.ovulation_day && run.fertile_window_low
      ? daysBetween(run.fertile_window_low, run.ovulation_day)
      : null;
  const periodToOv =
    run.ovulation_day && run.next_period_low
      ? daysBetween(run.ovulation_day, run.next_period_low)
      : null;
  const pmsLead =
    run.pms_start && run.next_period_low
      ? daysBetween(run.pms_start, run.next_period_low)
      : null;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Fertility & cycle window parameters", "Value"]],
    body: [
      ["Next period (start of window)", fmtDate(run.next_period_low)],
      ["Next period (end of window)", fmtDate(run.next_period_high)],
      ["Expected period end", fmtDate(run.next_period_end)],
      ["Fertile window start", fmtDate(run.fertile_window_low)],
      ["Fertile window end", fmtDate(run.fertile_window_high)],
      ["Fertile window length", fwLenDisplay],
      ["Ovulation day", fmtDate(run.ovulation_day)],
      ["Ovulation offset in window", ovOffset !== null ? `Day ${ovOffset + 1} of window` : "—"],
      ["Ovulation → next period (luteal)", periodToOv !== null ? `${periodToOv} days` : "—"],
      ["PMS phase starts", fmtDate(run.pms_start)],
      ["PMS lead time before period", pmsLead !== null ? `${pmsLead} days` : "—"],
      ["Period status", run.is_late ? "Currently late" : "On schedule"],
    ],
    theme: "striped",
    styles: { font: "helvetica", fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [120, 80, 60] },
  });
  y = (doc as any).lastAutoTable.finalY + 22;

  // Footer note
  if (y > 720) { doc.addPage(); y = margin; }
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(120);
  const disclaimer =
    "Educational estimate only — not a medical diagnosis. Cycle predictions improve with more logged history. " +
    "Share this with a clinician if your cycles change suddenly or your period is more than 7 days late.";
  doc.text(doc.splitTextToSize(disclaimer, 515), margin, y);

  return doc.output("blob");
}