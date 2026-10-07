import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type DoctorReportCondition = {
  name: string;
  confidence: string;
  why: string;
};

export type DoctorReportData = {
  patientName?: string;
  patientAge?: string | number;
  reportedSymptoms: string;
  urgency: string;
  plainEnglishSummary: string;
  possibleConditions: DoctorReportCondition[];
  questionsForDoctor: string[];
  selfCareSuggestions: string[];
  redFlags: string[];
  disclaimer: string;
};

export function buildDoctorReportPdf(data: DoctorReportData): Blob {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 44;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Colors
  const primaryColor: [number, number, number] = [164, 82, 100]; // Rich HerSpace Rose
  const darkTextColor: [number, number, number] = [34, 30, 32];
  const mutedTextColor: [number, number, number] = [105, 100, 102];
  const borderColor: [number, number, number] = [224, 218, 220];
  const lightBgColor: [number, number, number] = [252, 249, 248];

  // Top Accent Header Bar
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 6, "F");

  // Header Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...darkTextColor);
  doc.text("HERSPACE · CLINICAL SYMPTOM INTAKE REPORT", margin, y + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...mutedTextColor);
  doc.text(
    "Confidential Doctor-Ready Health Summary & Patient Appointment Guide",
    margin,
    y + 24
  );

  y += 36;

  // Horizontal Rule
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(1);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  // Patient & Clinical Intake Details Table
  const formattedDate = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const patientDisplay = (data.patientName && data.patientName.trim()) || "HerSpace Member";
  const ageDisplay = data.patientAge ? `${data.patientAge} years` : "Not specified";
  const urgencyLabel = data.urgency.replace(/-/g, " ").toUpperCase();

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "plain",
    body: [
      [
        { content: "Patient Name:", styles: { fontStyle: "bold", textColor: mutedTextColor } },
        { content: patientDisplay, styles: { fontStyle: "bold", textColor: darkTextColor } },
        { content: "Assessment Date:", styles: { fontStyle: "bold", textColor: mutedTextColor } },
        { content: formattedDate, styles: { textColor: darkTextColor } },
      ],
      [
        { content: "Patient Age:", styles: { fontStyle: "bold", textColor: mutedTextColor } },
        { content: ageDisplay, styles: { textColor: darkTextColor } },
        { content: "Urgency Level:", styles: { fontStyle: "bold", textColor: mutedTextColor } },
        {
          content: urgencyLabel,
          styles: {
            fontStyle: "bold",
            textColor:
              data.urgency === "emergency" || data.urgency === "urgent"
                ? [190, 18, 60]
                : [15, 118, 110],
          },
        },
      ],
    ],
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 85 },
      1: { cellWidth: 170 },
      2: { cellWidth: 105 },
      3: { cellWidth: 160 },
    },
  });

  y = (doc as any).lastAutoTable.finalY + 14;

  // Helper function to check page overflow and add page if needed
  function checkPageBreak(neededHeight: number) {
    if (y + neededHeight > pageHeight - margin - 30) {
      doc.addPage();
      y = margin + 10;
      doc.setFillColor(...primaryColor);
      doc.rect(0, 0, pageWidth, 5, "F");
    }
  }

  // Helper function for section headings
  function renderSectionHeading(title: string) {
    checkPageBreak(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.text(title, margin, y);
    y += 4;
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.75);
    doc.line(margin, y, pageWidth - margin, y);
    y += 12;
  }

  // 1. CHIEF COMPLAINT / REPORTED SYMPTOMS
  renderSectionHeading("1. CHIEF COMPLAINT & PATIENT-REPORTED OBSERVATIONS");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...darkTextColor);

  const symptomLines = doc.splitTextToSize(data.reportedSymptoms, contentWidth - 16);
  const symptomBoxHeight = symptomLines.length * 13 + 14;
  checkPageBreak(symptomBoxHeight);

  // Background box for symptoms
  doc.setFillColor(...lightBgColor);
  doc.setDrawColor(...borderColor);
  doc.roundedRect(margin, y, contentWidth, symptomBoxHeight, 4, 4, "FD");

  doc.text(symptomLines, margin + 8, y + 14);
  y += symptomBoxHeight + 14;

  // 2. CLINICAL SYNTHESIS
  renderSectionHeading("2. CLINICAL ASSESSMENT SYNTHESIS");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...darkTextColor);

  const summaryLines = doc.splitTextToSize(data.plainEnglishSummary, contentWidth);
  checkPageBreak(summaryLines.length * 13 + 10);
  doc.text(summaryLines, margin, y);
  y += summaryLines.length * 13 + 14;

  // 3. DIFFERENTIAL POSSIBILITIES TABLE
  if (data.possibleConditions.length > 0) {
    renderSectionHeading("3. DIFFERENTIAL PATTERNS & POSSIBILITIES TO DISCUSS");

    const conditionRows = data.possibleConditions.map((c) => [
      c.name,
      c.confidence ? c.confidence.toUpperCase() : "CONSIDER",
      c.why,
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Condition / Pattern", "Confidence", "Clinical Context & Rationale"]],
      body: conditionRows,
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 8.5,
        cellPadding: 6,
        textColor: darkTextColor,
        lineColor: borderColor,
        lineWidth: 0.5,
      },
      headStyles: {
        fillColor: [88, 52, 64],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 140, fontStyle: "bold" },
        1: { cellWidth: 80, fontStyle: "bold" },
        2: { cellWidth: "auto" },
      },
    });

    y = (doc as any).lastAutoTable.finalY + 14;
  }

  // 4. QUESTIONS FOR THE CLINICIAN
  if (data.questionsForDoctor.length > 0) {
    renderSectionHeading("4. RECOMMENDED QUESTIONS FOR YOUR APPOINTMENT");

    data.questionsForDoctor.forEach((q, idx) => {
      const qNum = `[${idx + 1}] `;
      const fullText = `${qNum}${q}`;
      const qLines = doc.splitTextToSize(fullText, contentWidth - 10);
      checkPageBreak(qLines.length * 13 + 6);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...primaryColor);
      doc.text(qNum, margin + 4, y);

      const numWidth = doc.getTextWidth(qNum);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...darkTextColor);
      doc.text(doc.splitTextToSize(q, contentWidth - 10 - numWidth), margin + 4 + numWidth, y);

      y += qLines.length * 13 + 4;
    });

    y += 8;
  }

  // 5. GENTLE SELF-CARE SUGGESTIONS
  if (data.selfCareSuggestions.length > 0) {
    renderSectionHeading("5. SUPPORTIVE HABITS & PRE-APPOINTMENT CONSIDERATIONS");

    data.selfCareSuggestions.forEach((s) => {
      const bullet = "•  ";
      const sLines = doc.splitTextToSize(`${bullet}${s}`, contentWidth - 10);
      checkPageBreak(sLines.length * 12 + 4);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...darkTextColor);
      doc.text(sLines, margin + 6, y);
      y += sLines.length * 12 + 3;
    });

    y += 8;
  }

  // 6. RED FLAGS WARNING (if any)
  if (data.redFlags && data.redFlags.length > 0) {
    checkPageBreak(60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(190, 18, 60); // Red
    doc.text("⚠️ RED FLAGS — SEEK PROMPT OR EMERGENCY CARE IF PRESENT", margin, y);
    y += 4;
    doc.setDrawColor(244, 114, 182);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    data.redFlags.forEach((rf) => {
      const rfLines = doc.splitTextToSize(`• ${rf}`, contentWidth - 16);
      checkPageBreak(rfLines.length * 12 + 4);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(159, 18, 57);
      doc.text(rfLines, margin + 6, y);
      y += rfLines.length * 12 + 2;
    });

    y += 10;
  }

  // 7. MEDICAL DISCLAIMER
  checkPageBreak(45);
  doc.setFillColor(245, 245, 245);
  doc.setDrawColor(...borderColor);
  const disclaimerLines = doc.splitTextToSize(
    `CLINICAL DISCLAIMER: ${
      data.disclaimer ||
      "This document is an educational AI health summary generated via HerSpace to assist in patient-clinician conversations. It does not replace professional medical diagnosis, laboratory testing, prescription, or emergency medical treatment."
    }`,
    contentWidth - 16
  );
  const disclaimerHeight = disclaimerLines.length * 10 + 12;

  doc.roundedRect(margin, y, contentWidth, disclaimerHeight, 3, 3, "FD");
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(115, 110, 112);
  doc.text(disclaimerLines, margin + 8, y + 9);
  y += disclaimerHeight + 10;

  // Add Page Numbers and Footer to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...mutedTextColor);
    doc.text(
      `HerSpace Health Network · Doctor-Ready Report · Confidential Patient Document`,
      margin,
      pageHeight - 20
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin - 45, pageHeight - 20);
  }

  return doc.output("blob");
}
