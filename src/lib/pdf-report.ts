import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type ReportInput = {
  generatedFor: string;
  cycleSummary: {
    cycleCount: number;
    avgCycle: number | null;
    avgPeriod: number | null;
    flow: { label: string } | null;
    regularity: { label: string } | null;
    longest: number | null;
    shortest: number | null;
  };
  cycleHistory: Array<{
    date: string;
    end?: string | null;
    flow?: string | null;
    pain?: number | null;
    cramp?: number | null;
    bloodColor?: string | null;
    clotting?: string | null;
    symptoms?: string | null;
    notes?: string | null;
  }>;
  insights: string[];
  doctorQuestions: string[];
  symptomTrends: Array<{ symptom: string; freqPct: number; avgSeverity: number }>;
  wellnessAverages: { sleepHours: number | null; waterGlasses: number | null; energyAvg: number | null; topMoods: string[] };
};

export function buildHealthPdf(input: ReportInput): Blob {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 48;
  let y = margin;

  doc.setFont("times", "italic");
  doc.setFontSize(22);
  doc.text("HerSpace · Cycle & Wellness Report", margin, y);
  y += 24;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(`Prepared for ${input.generatedFor} · Generated ${new Date().toLocaleDateString()}`, margin, y);
  y += 22;
  doc.setTextColor(20);

  // Summary table — only include metrics with real values
  const s = input.cycleSummary;
  const summaryRows: [string, string][] = [];
  summaryRows.push(["Cycles tracked", String(s.cycleCount)]);
  if (s.avgCycle) summaryRows.push(["Average cycle length", `${s.avgCycle} days`]);
  if (s.avgPeriod) summaryRows.push(["Average period length", `${s.avgPeriod} days`]);
  if (s.flow?.label) summaryRows.push(["Average flow", s.flow.label]);
  if (s.regularity?.label) summaryRows.push(["Regularity", s.regularity.label]);
  if (s.longest) summaryRows.push(["Longest cycle", `${s.longest} days`]);
  if (s.shortest) summaryRows.push(["Shortest cycle", `${s.shortest} days`]);
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Metric", "Value"]],
    body: summaryRows,
    theme: "striped",
    styles: { font: "helvetica", fontSize: 10 },
    headStyles: { fillColor: [120, 80, 60] },
  });
  y = (doc as any).lastAutoTable.finalY + 24;

  // Wellness averages — only render lines with logged values
  const w = input.wellnessAverages;
  const wlines: string[] = [];
  if (w.sleepHours) wlines.push(`Sleep: ${w.sleepHours} hrs/night avg`);
  if (w.waterGlasses) wlines.push(`Water: ${w.waterGlasses} glasses/day avg`);
  if (w.energyAvg) wlines.push(`Energy: ${w.energyAvg}/5 avg`);
  if (w.topMoods.length) wlines.push(`Most reported moods: ${w.topMoods.join(", ")}`);
  if (wlines.length) {
    doc.setFont("times", "italic"); doc.setFontSize(14);
    doc.text("Wellness averages", margin, y); y += 14;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    for (const line of wlines) { doc.text(line, margin, y); y += 14; }
    y += 8;
  }

  // Cycle history — dynamic columns: drop any column where every entry is blank
  if (input.cycleHistory.length) {
    const rows = input.cycleHistory.slice(0, 20);
    type Col = { key: string; label: string; get: (r: typeof rows[number]) => string };
    const allCols: Col[] = [
      { key: "date", label: "Start", get: (r) => r.date },
      { key: "end", label: "End", get: (r) => r.end ?? "" },
      { key: "flow", label: "Flow", get: (r) => r.flow ?? "" },
      { key: "bloodColor", label: "Blood color", get: (r) => r.bloodColor ?? "" },
      { key: "clotting", label: "Clotting", get: (r) => r.clotting ?? "" },
      { key: "pain", label: "Pain (0–10)", get: (r) => (r.pain != null ? String(r.pain) : "") },
      { key: "cramp", label: "Cramps (0–10)", get: (r) => (r.cramp != null ? String(r.cramp) : "") },
      { key: "symptoms", label: "Symptoms", get: (r) => r.symptoms ?? "" },
      { key: "notes", label: "Notes", get: (r) => r.notes ?? "" },
    ];
    const cols = allCols.filter((c) => c.key === "date" || rows.some((r) => c.get(r).trim() !== ""));
    doc.setFont("times", "italic"); doc.setFontSize(14);
    doc.text("Recent cycle history", margin, y); y += 6;
    autoTable(doc, {
      startY: y + 8,
      margin: { left: margin, right: margin },
      head: [cols.map((c) => c.label)],
      body: rows.map((r) => cols.map((c) => c.get(r) || "—")),
      theme: "grid",
      styles: { font: "helvetica", fontSize: 9 },
      headStyles: { fillColor: [120, 80, 60] },
    });
    y = (doc as any).lastAutoTable.finalY + 20;
  }

  // Symptom trends
  if (input.symptomTrends.length) {
    if (y > 680) { doc.addPage(); y = margin; }
    doc.setFont("times", "italic"); doc.setFontSize(14);
    doc.text("Top symptom patterns", margin, y); y += 6;
    autoTable(doc, {
      startY: y + 8,
      margin: { left: margin, right: margin },
      head: [["Symptom", "Days logged %", "Avg severity (1–3)"]],
      body: input.symptomTrends.slice(0, 12).map((t) => [t.symptom, `${t.freqPct.toFixed(0)}%`, t.avgSeverity.toFixed(1)]),
      theme: "grid",
      styles: { font: "helvetica", fontSize: 9 },
      headStyles: { fillColor: [120, 80, 60] },
    });
    y = (doc as any).lastAutoTable.finalY + 20;
  }

  // Insights
  if (input.insights.length) {
    if (y > 680) { doc.addPage(); y = margin; }
    doc.setFont("times", "italic"); doc.setFontSize(14);
    doc.text("AI-detected patterns", margin, y); y += 16;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    for (const i of input.insights) {
      const wrapped = doc.splitTextToSize(`• ${i}`, 520);
      if (y + wrapped.length * 12 > 760) { doc.addPage(); y = margin; }
      doc.text(wrapped, margin, y); y += wrapped.length * 12 + 4;
    }
    y += 8;
  }

  // Doctor questions
  if (input.doctorQuestions.length) {
    if (y > 680) { doc.addPage(); y = margin; }
    doc.setFont("times", "italic"); doc.setFontSize(14);
    doc.text("Questions for your clinician", margin, y); y += 16;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    for (const q of input.doctorQuestions) {
      const wrapped = doc.splitTextToSize(`• ${q}`, 520);
      if (y + wrapped.length * 12 > 760) { doc.addPage(); y = margin; }
      doc.text(wrapped, margin, y); y += wrapped.length * 12 + 4;
    }
  }

  // Footer disclaimer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(8); doc.setTextColor(140);
    doc.text("Educational only — not a medical diagnosis. Bring this to your clinician for discussion.", margin, 780);
    doc.text(`Page ${p} / ${pageCount}`, 540, 780);
  }

  return doc.output("blob");
}