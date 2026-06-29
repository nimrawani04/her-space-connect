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
    date: string; end?: string | null; flow?: string | null; pain?: number | null; symptoms?: string | null;
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

  // Summary table
  const s = input.cycleSummary;
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Metric", "Value"]],
    body: [
      ["Cycles tracked", String(s.cycleCount)],
      ["Average cycle length", s.avgCycle ? `${s.avgCycle} days` : "—"],
      ["Average period length", s.avgPeriod ? `${s.avgPeriod} days` : "—"],
      ["Average flow", s.flow?.label ?? "—"],
      ["Regularity", s.regularity?.label ?? "—"],
      ["Longest cycle", s.longest ? `${s.longest} days` : "—"],
      ["Shortest cycle", s.shortest ? `${s.shortest} days` : "—"],
    ],
    theme: "striped",
    styles: { font: "helvetica", fontSize: 10 },
    headStyles: { fillColor: [120, 80, 60] },
  });
  y = (doc as any).lastAutoTable.finalY + 24;

  // Wellness averages
  doc.setFont("times", "italic"); doc.setFontSize(14);
  doc.text("Wellness averages", margin, y); y += 14;
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  const w = input.wellnessAverages;
  const lines = [
    `Sleep: ${w.sleepHours ? `${w.sleepHours} hrs/night avg` : "—"}`,
    `Water: ${w.waterGlasses ? `${w.waterGlasses} glasses/day avg` : "—"}`,
    `Energy: ${w.energyAvg ? `${w.energyAvg}/5 avg` : "—"}`,
    `Most reported moods: ${w.topMoods.length ? w.topMoods.join(", ") : "—"}`,
  ];
  for (const line of lines) { doc.text(line, margin, y); y += 14; }
  y += 8;

  // Cycle history
  if (input.cycleHistory.length) {
    doc.setFont("times", "italic"); doc.setFontSize(14);
    doc.text("Recent cycle history", margin, y); y += 6;
    autoTable(doc, {
      startY: y + 8,
      margin: { left: margin, right: margin },
      head: [["Start", "End", "Flow", "Pain (0–10)", "Symptoms"]],
      body: input.cycleHistory.slice(0, 20).map((r) => [r.date, r.end ?? "—", r.flow ?? "—", r.pain != null ? String(r.pain) : "—", r.symptoms ?? "—"]),
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