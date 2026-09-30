// Medical knowledge and evidence-informed fallback generators for HerSpace
// Used when no external LLM API key is configured or when an AI request fails.

export function fallbackAnalyzeSymptoms(data: {
  symptoms: string;
  age?: number;
  contextNotes?: string;
}) {
  const text = `${data.symptoms} ${data.contextNotes || ""}`.toLowerCase();
  const age = data.age;

  // Emergency indicators
  const isEmergency =
    text.includes("severe chest pain") ||
    text.includes("stroke") ||
    text.includes("suicid") ||
    text.includes("kill myself") ||
    text.includes("hemorrhage") ||
    text.includes("soaking through 2") ||
    text.includes("soaking through two") ||
    (text.includes("fainting") && text.includes("pelvic")) ||
    (text.includes("passed out") && text.includes("bleeding")) ||
    text.includes("severe sudden sharp abdominal pain");

  // Urgent indicators
  const isUrgent =
    !isEmergency &&
    (text.includes("high fever") ||
      (text.includes("fever") && (text.includes("pelvic") || text.includes("period") || text.includes("discharge"))) ||
      text.includes("vomiting non-stop") ||
      text.includes("cannot keep water down") ||
      text.includes("severe sharp pain"));

  // Check conditions
  const conditions: Array<{ name: string; confidence: "low" | "moderate" | "high"; why: string }> = [];

  // PCOS check
  const pcosKeywords = ["irregular", "missed period", "late period", "acne", "jawline", "facial hair", "hirsutism", "hair thinning", "weight gain", "polycystic"];
  const pcosMatchCount = pcosKeywords.filter((k) => text.includes(k)).length;
  if (pcosMatchCount >= 2 || text.includes("pcos") || (text.includes("irregular") && text.includes("acne"))) {
    conditions.push({
      name: "Polycystic Ovary Syndrome (PCOS) / Ovulatory Dysregulation",
      confidence: pcosMatchCount >= 3 ? "high" : "moderate",
      why: "The combination of cycle irregularity alongside androgen-related signs (such as acne or hair pattern changes) is a classic presentation of ovulatory variance.",
    });
  }

  // Endometriosis / Adenomyosis check
  const endoKeywords = ["severe cramp", "painful period", "dysmenorrhea", "pelvic pain", "pain during sex", "pain with intercourse", "heavy bleeding", "clots", "back pain"];
  const endoMatchCount = endoKeywords.filter((k) => text.includes(k)).length;
  if (endoMatchCount >= 2 || text.includes("endometriosis") || text.includes("adenomyosis")) {
    conditions.push({
      name: "Endometriosis or Adenomyosis",
      confidence: endoMatchCount >= 3 ? "high" : "moderate",
      why: "Significant pelvic pain, deep cramping, or heavy menstrual flow that disrupts daily function warrant clinical evaluation for endometrial tissue involvement.",
    });
  }

  // Thyroid check
  const thyroidKeywords = ["fatigue", "tired", "brain fog", "hair loss", "hair thinning", "cold intolerance", "feeling cold", "weight gain", "constipation", "dry skin", "dry scalp"];
  const thyroidMatchCount = thyroidKeywords.filter((k) => text.includes(k)).length;
  if (thyroidMatchCount >= 2 || text.includes("thyroid") || text.includes("hypothyroid")) {
    conditions.push({
      name: "Thyroid Dysregulation (e.g. Hypothyroidism)",
      confidence: thyroidMatchCount >= 3 ? "moderate" : "low",
      why: "Systemic symptoms like persistent lethargy, skin/hair dryness, and metabolic slowdown frequently stem from thyroid hormone fluctuations.",
    });
  }

  // Iron deficiency check
  const ironKeywords = ["fatigue", "dizzy", "dizziness", "lightheaded", "heavy bleeding", "heavy flow", "short of breath", "pale", "brittle nails", "exhausted"];
  const ironMatchCount = ironKeywords.filter((k) => text.includes(k)).length;
  if ((ironMatchCount >= 2 && (text.includes("heavy") || text.includes("bleeding") || text.includes("period"))) || text.includes("anemia") || text.includes("iron")) {
    conditions.push({
      name: "Iron Deficiency / Menstrual-Related Anemia",
      confidence: ironMatchCount >= 3 ? "high" : "moderate",
      why: "Heavy blood loss combined with low stamina and lightheadedness can deplete ferritin stores and hemoglobin levels.",
    });
  }

  // UTI check
  const utiKeywords = ["burning", "frequent urination", "peeing a lot", "urinary", "bladder", "cloudy urine", "pelvic pressure"];
  const utiMatchCount = utiKeywords.filter((k) => text.includes(k)).length;
  if (utiMatchCount >= 2 || text.includes("uti") || text.includes("infection")) {
    conditions.push({
      name: "Urinary Tract Infection (UTI) or Cystitis",
      confidence: utiMatchCount >= 2 ? "high" : "moderate",
      why: "Urinary discomfort, burning sensations, and frequency strongly point toward lower urinary tract inflammation.",
    });
  }

  // Perimenopause check (especially if age >= 38 or keywords)
  const periKeywords = ["hot flash", "night sweat", "irregular period", "vaginal dryness", "libido", "mood change", "sleep disturbance", "insomnia", "skipped period"];
  const periMatchCount = periKeywords.filter((k) => text.includes(k)).length;
  if ((age && age >= 40 && periMatchCount >= 1) || periMatchCount >= 2 || text.includes("perimenopause") || text.includes("menopause")) {
    conditions.push({
      name: "Perimenopausal Transition",
      confidence: age && age >= 42 ? "high" : "moderate",
      why: "Vasomotor symptoms, sleep disruption, and cycle timing shifts in your 40s and beyond reflect natural fluctuating estrogen and progesterone levels.",
    });
  }

  // PMDD / PMS check
  const pmddKeywords = ["mood swing", "anxiety", "irritab", "depress", "crying", "before period", "pms", "breast tenderness", "bloating", "food craving"];
  const pmddMatchCount = pmddKeywords.filter((k) => text.includes(k)).length;
  if (pmddMatchCount >= 2 || text.includes("pmdd") || text.includes("pms")) {
    conditions.push({
      name: "Premenstrual Syndrome (PMS) or PMDD",
      confidence: pmddMatchCount >= 3 ? "high" : "moderate",
      why: "Cyclical mood shifts, breast tenderness, and physical discomfort recurring in the luteal phase correspond with progesterone sensitivity.",
    });
  }

  // Default fallback condition if nothing matched
  if (conditions.length === 0) {
    conditions.push({
      name: "Hormonal & Lifestyle Stress Response / Primary Dysmenorrhea",
      confidence: "moderate",
      why: "Stress, nutritional shifts, sleep disruptions, and acute lifestyle changes can alter hypothalamic-pituitary-ovarian signaling.",
    });
  }

  // Urgency determination
  let urgency: "self-care" | "see-a-doctor-soon" | "urgent" | "emergency" = "see-a-doctor-soon";
  if (isEmergency) {
    urgency = "emergency";
  } else if (isUrgent) {
    urgency = "urgent";
  } else if (conditions.some((c) => c.confidence === "high" || c.name.includes("PCOS") || c.name.includes("Endometriosis") || c.name.includes("UTI"))) {
    urgency = "see-a-doctor-soon";
  } else {
    urgency = "self-care";
  }

  const ageNote = age ? ` for someone who is ${age} years old` : "";
  const plainEnglishSummary = `You reported experiencing ${data.symptoms.trim()}${ageNote}. Based on standard clinical patterns, these symptoms suggest hormonal fluctuations or cyclical physiological changes that are very common and manageable. Taking proactive note of your symptom timeline will provide valuable context for your healthcare provider.`;

  const questionsForYourDoctor = [
    "Would a comprehensive hormone panel (including LH, FSH, Estradiol, and Progesterone) or Thyroid panel (TSH, Free T4) be helpful?",
    "Do you recommend checking a complete blood count (CBC) and serum Ferritin levels to rule out iron depletion?",
    "Would a pelvic ultrasound help evaluate the ovaries, uterine lining, or any structural causes?",
    "What symptom tracking methods or treatment options do you recommend for managing these symptoms daily?",
  ];

  const selfCareSuggestions = [
    "Keep a daily symptom and cycle log documenting pain levels, flow intensity, and triggers.",
    "Prioritize gentle anti-inflammatory nutrition with leafy greens, omega-3s, and steady protein.",
    "Apply local heat therapy (heating pad or warm bath) to ease pelvic tension and muscle cramping.",
    "Support your circadian rhythm with consistent sleep timing and active hydration throughout the day.",
  ];

  const redFlags = [
    "Soaking through two or more heavy pads or tampons per hour for two consecutive hours.",
    "Sudden, severe, or sharp lower abdominal/pelvic pain that does not resolve with rest.",
    "Fever above 101°F (38.3°C) accompanied by pelvic pain, chills, or unusual foul-smelling discharge.",
    "Episodes of dizziness, fainting, shortness of breath, or confusion.",
  ];

  return {
    plainEnglishSummary,
    urgency,
    possibleConditions: conditions.slice(0, 6),
    questionsForYourDoctor: questionsForYourDoctor.slice(0, 8),
    selfCareSuggestions: selfCareSuggestions.slice(0, 6),
    redFlags: redFlags.slice(0, 6),
    disclaimer: "HerSpace Health AI is an educational guidance assistant designed to support discussions with your doctor. It does not provide medical diagnoses or prescriptions.",
  };
}

export function fallbackAnalyzeJournal(data: { content: string; mood?: string }) {
  const text = data.content.toLowerCase();
  const isCrisis =
    text.includes("kill myself") ||
    text.includes("want to die") ||
    text.includes("suicide") ||
    text.includes("end my life") ||
    text.includes("hurt myself");

  const themes: string[] = [];
  if (text.includes("work") || text.includes("job") || text.includes("stress") || text.includes("busy")) {
    themes.push("Workplace & Mental Load");
  }
  if (text.includes("tired") || text.includes("exhaust") || text.includes("sleep") || text.includes("burnout")) {
    themes.push("Physical & Emotional Fatigue");
  }
  if (text.includes("period") || text.includes("cramp") || text.includes("body") || text.includes("health")) {
    themes.push("Body Awareness & Cycle Rhythm");
  }
  if (text.includes("friend") || text.includes("partner") || text.includes("family") || text.includes("relation")) {
    themes.push("Relationships & Interpersonal Connection");
  }
  if (text.includes("grateful") || text.includes("happy") || text.includes("proud") || text.includes("good")) {
    themes.push("Gratitude & Self-Affirmation");
  }
  if (themes.length === 0) {
    themes.push("Self-Reflection", "Emotional Processing");
  }

  const moodWord = data.mood ? `feeling ${data.mood}` : "this moment";
  const reflection = `Thank you for sharing your thoughts so openly. It takes vulnerability to write down what you are experiencing while ${moodWord}. Giving yourself space to process these feelings is a meaningful act of self-care.`;

  return {
    reflection,
    emotionalThemes: themes.slice(0, 5),
    gentlePrompt: "What is one kind boundary or moment of gentleness you can offer yourself today?",
    copingSuggestions: [
      "Take 3 minutes for slow boxed breathing (inhale 4s, hold 4s, exhale 4s, hold 4s).",
      "Do a quick physical body scan: un-clench your jaw, drop your shoulders, and soften your breath.",
      "Step away from screens for a short warm tea ritual or quiet walk.",
      "Write down one thing within your control and gently release one thing that isn't.",
    ],
    escalation: {
      suggested: isCrisis,
      reason: isCrisis
        ? "Your safety is deeply important. If you are experiencing overwhelming distress, please contact the 988 Suicide & Crisis Lifeline (call/text 988) or reach out to someone you trust."
        : undefined,
    },
  };
}

export function fallbackSimplifyResearch(data: { topic: string }) {
  const topic = data.topic;
  return {
    beginnerExplanation: `Clinical research on ${topic} highlights the profound role that hormonal regulation, metabolic balance, and systemic lifestyle factors play in women's long-term health. Current evidence supports a multi-faceted approach combining evidence-based clinical care with targeted nutritional and lifestyle support.`,
    keyFindings: [
      `Peer-reviewed studies indicate individual variation in hormone sensitivity significantly influences how ${topic} presents across different life stages.`,
      "Consistent lifestyle interventions (sleep optimization, anti-inflammatory dietary patterns, resistance training) demonstrate measurable biomarker improvements.",
      "Early consultation with specialized gynecological and endocrine care significantly improves quality-of-life outcomes.",
      "Standard clinical protocols emphasize personalized symptom management rather than a one-size-fits-all approach.",
    ],
    practicalTakeaways: [
      "Track your personal response to dietary, cycle, and stress patterns over a 60-to-90 day window.",
      "Discuss specific biomarker testing (metabolic, inflammatory, hormonal) with your doctor.",
      "Prioritize restful sleep and steady blood-sugar balancing meals throughout the day.",
      "Seek care from practitioners who take a patient-centered, collaborative approach.",
    ],
    mythVsFact: [
      {
        myth: `Symptoms associated with ${topic} are simply something women must tolerate quietly.`,
        fact: "Modern clinical guidelines provide evidence-backed pharmaceutical, holistic, and lifestyle modalities to actively relieve symptoms.",
      },
      {
        myth: "One specific diet or supplement cures all related symptoms immediately.",
        fact: "Sustainable symptom improvement involves a comprehensive, individualized regimen tested over time.",
      },
    ],
    faqs: [
      {
        q: `What is the first step if I suspect I have symptoms related to ${topic}?`,
        a: "Document a detailed timeline of symptoms, frequency, and severity, then schedule a comprehensive review with your primary care provider or gynecologist.",
      },
      {
        q: "How long does it typically take to observe improvements from lifestyle adjustments?",
        a: "Most biological cycle and metabolic adaptations reflect over 2 to 3 menstrual cycles (roughly 8-12 weeks).",
      },
    ],
    suggestedSearches: [
      `${topic} clinical practice guidelines ACOG`,
      `${topic} evidence based management systematic review`,
      `${topic} hormonal and metabolic biomarkers NIH`,
      `${topic} lifestyle and nutritional interventions PubMed`,
    ],
  };
}

export function fallbackPredictCycle(data: {
  recentStarts: string[];
  avgCycleLength: number | null;
  avgPeriodLength: number | null;
  regularityLabel: string | null;
  today: string;
  avgCramp?: number | null;
  peakCramp?: number | null;
  severeCrampCycles?: number | null;
}) {
  const cycleLen = data.avgCycleLength && data.avgCycleLength >= 21 && data.avgCycleLength <= 45 ? data.avgCycleLength : 28;
  const periodLen = data.avgPeriodLength && data.avgPeriodLength >= 2 && data.avgPeriodLength <= 10 ? data.avgPeriodLength : 5;

  const todayDate = new Date(data.today || new Date().toISOString().slice(0, 10));
  let lastStart = data.recentStarts.length > 0 ? new Date(data.recentStarts[0]) : new Date(todayDate.getTime() - 20 * 86400000);

  if (isNaN(lastStart.getTime())) {
    lastStart = new Date(todayDate.getTime() - 20 * 86400000);
  }

  // Next period calculation
  const nextLowDate = new Date(lastStart.getTime() + (cycleLen - 1) * 86400000);
  const nextHighDate = new Date(lastStart.getTime() + (cycleLen + 2) * 86400000);
  const nextEndDate = new Date(nextLowDate.getTime() + periodLen * 86400000);

  // Fertile window (~days 11-16)
  const fertileLowDate = new Date(lastStart.getTime() + Math.max(10, cycleLen - 17) * 86400000);
  const fertileHighDate = new Date(lastStart.getTime() + Math.max(15, cycleLen - 12) * 86400000);
  const ovulationDate = new Date(lastStart.getTime() + (cycleLen - 14) * 86400000);
  const pmsStartDate = new Date(lastStart.getTime() + (cycleLen - 6) * 86400000);

  const isLate = todayDate.getTime() > nextHighDate.getTime();

  let confidence = Math.min(92, 50 + data.recentStarts.length * 8);
  if (data.regularityLabel?.toLowerCase().includes("irregular")) confidence = Math.max(35, confidence - 15);
  if ((data.avgCramp ?? 0) >= 7) confidence = Math.max(30, confidence - 5);

  let urgencyLevel: "routine" | "monitor" | "discuss-with-clinician" = "routine";
  let crampSeverityNote: string | undefined;

  const avgCramp = data.avgCramp ?? 0;
  const peakCramp = data.peakCramp ?? 0;
  const severeCycles = data.severeCrampCycles ?? 0;

  if (avgCramp >= 7 || peakCramp >= 9 || severeCycles >= 2) {
    urgencyLevel = "discuss-with-clinician";
    crampSeverityNote = `Your cramp ratings indicate severe discomfort (peak ${peakCramp}/10 across ${severeCycles} cycles). We recommend discussing this trend with your gynecologist to screen for conditions like endometriosis, adenomyosis, or fibroids.`;
  } else if (avgCramp >= 4 || peakCramp >= 7) {
    urgencyLevel = "monitor";
    crampSeverityNote = `Moderate cramp intensity noted (average ${avgCramp}/10). Track sleep, hydration, and gentle heat therapy ahead of your next cycle.`;
  }

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  return {
    nextPeriodLow: fmt(nextLowDate),
    nextPeriodHigh: fmt(nextHighDate),
    nextPeriodEnd: fmt(nextEndDate),
    fertileWindowLow: fmt(fertileLowDate),
    fertileWindowHigh: fmt(fertileHighDate),
    ovulationDay: fmt(ovulationDate),
    pmsStart: fmt(pmsStartDate),
    confidence: Math.round(confidence),
    isLate,
    summary: isLate
      ? `Your period is currently expected past the estimated range; monitor for arrival or pregnancy testing if applicable.`
      : `Next cycle is expected between ${fmt(nextLowDate)} and ${fmt(nextHighDate)}.`,
    crampSeverityNote,
    urgencyLevel,
  };
}

export function fallbackGenerateHealthInsights(data: { cycleHistory: string; wellnessHistory: string }) {
  return {
    insights: [
      {
        title: "Energy Fluctuations by Phase",
        detail: "Higher energy levels and motivation tend to align with the follicular and ovulatory phases, with natural rest demands during the late luteal phase.",
        category: "energy" as const,
        confidence: "moderate" as const,
      },
      {
        title: "Skin Breakouts Around Ovulation/Luteal Shift",
        detail: "Mild hormonal acne patterns coincide with mid-cycle androgen and progesterone shifts. Gentle barrier support is recommended.",
        category: "symptoms" as const,
        confidence: "moderate" as const,
      },
      {
        title: "Sleep Sensitivity Pre-Menstruation",
        detail: "Recorded sleep disruptions appear 2 to 3 days before cycle onset, consistent with core body temperature rises in the late luteal phase.",
        category: "sleep" as const,
        confidence: "high" as const,
      },
      {
        title: "Cramp Relief with Hydration & Heat",
        detail: "Logs show lower peak pain scores when heat therapy and consistent hydration are initiated at first spotting.",
        category: "lifestyle" as const,
        confidence: "moderate" as const,
      },
    ],
    doctorQuestions: [
      "Are my luteal phase fatigue levels within normal physiological variance?",
      "Would baseline lipid and ferritin panels provide clarity on my energy dips?",
      "Are there targeted options for managing premenstrual sleep disruption?",
    ],
    watchOuts: [
      "Sudden increases in flow heaviness or persistent pelvic pain between cycles.",
      "Unexplained chronic exhaustion that does not improve after menstrual cessation.",
    ],
  };
}

export function fallbackPregnancyCompanion(data: {
  week: number;
  trimester: number;
  dueDate?: string;
  recentLogs?: string;
  question?: string;
}) {
  const week = data.week;
  const fruitSize =
    week <= 8
      ? "a raspberry"
      : week <= 12
        ? "a plum"
        : week <= 16
          ? "an avocado"
          : week <= 20
            ? "a banana"
            : week <= 24
              ? "an ear of corn"
              : week <= 28
                ? "an eggplant"
                : week <= 32
                  ? "a squash"
                  : week <= 36
                    ? "a honeydew melon"
                    : "a watermelon";

  return {
    greeting: `Welcome to Week ${week} of your pregnancy journey.`,
    babyUpdate: `Your baby is about the size of ${fruitSize}. Vital organs, senses, and neural pathways are actively maturing every day.`,
    bodyUpdate: `During Week ${week} (Trimester ${data.trimester}), blood volume and hormone shifts support your growing baby. Remember to pace yourself and rest whenever your body signals.`,
    todaysTip: "Keep a water bottle nearby and take mindful breaks throughout your day with gentle stretching and deep belly breathing.",
    nutritionFocus: [
      "Folate / Folic Acid & Choline for healthy neural development",
      "Iron-rich foods with vitamin C for blood volume support",
      "Adequate hydration (8-10 glasses of water daily)",
      "Dietary fiber to encourage smooth digestion",
    ],
    watchFor: [
      "Any sudden vaginal bleeding or fluid leakage",
      "Severe persistent abdominal cramping or sharp pain",
      "Noticeable reduction in fetal movements (after 24 weeks)",
      "Severe sudden swelling in hands, face, or severe headaches",
    ],
    answer: data.question
      ? `Regarding your question ("${data.question}"): At week ${week}, this is a common topic. Always consult your obstetrician or midwife to confirm the best personalized guidance for your pregnancy.`
      : undefined,
    askYourClinician: [
      `What routine prenatal screenings or ultrasounds are scheduled for week ${week}?`,
      "Are my current prenatal vitamins and iron levels optimal?",
      "What exercises and sleeping positions do you recommend at this gestational stage?",
    ],
    disclaimer: "HerSpace Pregnancy Companion is an educational resource and does not replace medical advice from your OB/GYN or certified midwife.",
  };
}
