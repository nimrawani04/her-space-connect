import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type PregnancyReportRow = {
  log_date: string;
  weight_kg: number | null;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  blood_sugar: number | null;
  water_glasses: number | null;
  sleep_hours: number | null;
  mood: string | null;
  exercise: string | null;
  notes: string | null;
  symptoms: Record<string, number>;
};

export type PregnancyReportInput = {
  patientName: string;
  weekStart: string;
  weekEnd: string;
  gestationalAge: string;
  dueDate: string | null;
  rows: PregnancyReportRow[];
};

const displayDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString();
const formatNumber = (value: number | null, suffix = "") => value == null ? "—" : `${value}${suffix}`;
const average = (values: Array<number | null>) => {
  const present = values.filter((value): value is number => value != null);
  return present.length ? Math.round((present.reduce((sum, value) => sum + value, 0) / present.length) * 10) / 10 : null;
};

export function buildPregnancyWeeklyPdf(input: PregnancyReportInput): Blob {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 44;
  const pageBottom = 742;
  let y = margin;

  doc.setFont("times", "bold");
  doc.setFontSize(21);
  doc.text("HerSpace · Weekly Pregnancy Summary", margin, y);
  y += 23;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(90);
  doc.text(`Prepared for ${input.patientName} · ${displayDate(input.weekStart)}–${displayDate(input.weekEnd)}`, margin, y);
  y += 15;
  doc.text(`${input.gestationalAge}${input.dueDate ? ` · Estimated due date ${displayDate(input.dueDate)}` : ""}`, margin, y);
  y += 24;
  doc.setTextColor(25);

  const highBp = input.rows.some((row) => (row.bp_systolic ?? 0) >= 140 || (row.bp_diastolic ?? 0) >= 90);
  const symptomEntries = input.rows.flatMap((row) => Object.entries(row.symptoms));
  const severeSymptoms = Array.from(new Set(symptomEntries.filter(([, severity]) => severity >= 3).map(([symptom]) => symptom)));

  doc.setFont("times", "bold");
  doc.setFontSize(14);
  doc.text("Clinical overview", margin, y);
  y += 9;
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Days logged", "Avg weight", "Avg blood sugar", "Avg sleep", "Avg hydration"]],
    body: [[
      String(input.rows.length),
      formatNumber(average(input.rows.map((row) => row.weight_kg)), " kg"),
      formatNumber(average(input.rows.map((row) => row.blood_sugar)), " mg/dL"),
      formatNumber(average(input.rows.map((row) => row.sleep_hours)), " hr"),
      formatNumber(average(input.rows.map((row) => row.water_glasses)), " glasses"),
    ]],
    theme: "grid",
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 6 },
    headStyles: { fillColor: [154, 79, 63] },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;

  if (highBp || severeSymptoms.length) {
    doc.setFont("times", "bold");
    doc.setFontSize(13);
    doc.text("Review flags", margin, y);
    y += 15;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    if (highBp) {
      doc.text("• At least one blood pressure reading was at or above 140/90.", margin, y);
      y += 14;
    }
    if (severeSymptoms.length) {
      const lines = doc.splitTextToSize(`• Severe symptoms logged: ${severeSymptoms.join(", ")}.`, 515);
      doc.text(lines, margin, y);
      y += lines.length * 12 + 4;
    }
    y += 5;
  }

  doc.setFont("times", "bold");
  doc.setFontSize(13);
  doc.text("Daily vitals and symptoms", margin, y);
  y += 7;
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Date", "Weight", "BP", "Sugar", "Sleep", "Symptoms"]],
    body: input.rows.map((row) => [
      displayDate(row.log_date),
      formatNumber(row.weight_kg),
      row.bp_systolic != null && row.bp_diastolic != null ? `${row.bp_systolic}/${row.bp_diastolic}` : "—",
      formatNumber(row.blood_sugar),
      formatNumber(row.sleep_hours),
      Object.entries(row.symptoms).map(([name, severity]) => `${name} (${severity}/3)`).join(", ") || "—",
    ]),
    theme: "grid",
    styles: { font: "helvetica", fontSize: 7.8, cellPadding: 5, overflow: "linebreak" },
    headStyles: { fillColor: [154, 79, 63] },
    columnStyles: { 5: { cellWidth: 150 } },
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;

  const symptomSummary = new Map<string, { count: number; total: number; highest: number }>();
  for (const [symptom, severity] of symptomEntries) {
    const current = symptomSummary.get(symptom) ?? { count: 0, total: 0, highest: 0 };
    symptomSummary.set(symptom, {
      count: current.count + 1,
      total: current.total + severity,
      highest: Math.max(current.highest, severity),
    });
  }
  if (symptomSummary.size) {
    if (y > 650) { doc.addPage(); y = margin; }
    doc.setFont("times", "bold");
    doc.setFontSize(13);
    doc.text("Symptom pattern", margin, y);
    y += 7;
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Symptom", "Days reported", "Average severity", "Highest severity"]],
      body: Array.from(symptomSummary.entries()).map(([name, value]) => [
        name,
        String(value.count),
        `${(value.total / value.count).toFixed(1)} / 3`,
        `${value.highest} / 3`,
      ]),
      theme: "striped",
      styles: { font: "helvetica", fontSize: 8.5 },
      headStyles: { fillColor: [154, 79, 63] },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 18;
  }

  const notes = input.rows.filter((row) => row.mood || row.exercise || row.notes);
  if (notes.length) {
    if (y > 650) { doc.addPage(); y = margin; }
    doc.setFont("times", "bold");
    doc.setFontSize(13);
    doc.text("Context and notes", margin, y);
    y += 15;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    for (const row of notes) {
      const detail = [row.mood ? `Mood: ${row.mood}` : "", row.exercise ? `Activity: ${row.exercise}` : "", row.notes ?? ""].filter(Boolean).join(" · ");
      const lines = doc.splitTextToSize(`${displayDate(row.log_date)} — ${detail}`, 515);
      if (y + lines.length * 11 > pageBottom) { doc.addPage(); y = margin; }
      doc.text(lines, margin, y);
      y += lines.length * 11 + 5;
    }
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(120);
    doc.text("Patient-entered data. This summary supports, but does not replace, clinical assessment.", margin, 775);
    doc.text(`Page ${page} / ${pageCount}`, 520, 775);
  }

  return doc.output("blob");
}