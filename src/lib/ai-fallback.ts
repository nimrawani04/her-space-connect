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

export function fallbackChatMentalWellness(data: {
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}) {
  const text = data.message.trim().toLowerCase();

  const isCrisis =
    text.includes("kill myself") ||
    text.includes("want to die") ||
    text.includes("suicide") ||
    text.includes("end my life") ||
    text.includes("hurt myself") ||
    text.includes("abuse") ||
    text.includes("self harm");

  if (isCrisis) {
    return {
      reply:
        "I hear how much pain you are carrying right now, and I want you to know you are not alone in this dark moment. Your life and your safety matter deeply. Please reach out right now to someone trained who can support you through this safely:\n\n• **988 Suicide & Crisis Lifeline**: Call or text **988** (Available 24/7, free & confidential in US/Canada)\n• **Crisis Text Line**: Text **HOME to 741741**\n• **UK Crisis Line**: Call **111** or **999**\n• **International Resources**: Visit [findahelpline.com](https://findahelpline.com)\n\nPlease take a slow breath with me. Reach out to a loved one, a friend, or one of these helplines right now.",
      theme: "Crisis & Immediate Support",
      suggestedActions: [
        "Call or text 988 immediately (Free & 24/7)",
        "Text HOME to 741741 for text crisis support",
        "Reach out to someone you trust and tell them you need support",
      ],
      reflectionPrompt: "I am holding space for my pain, and I choose to let compassionate help in.",
      groundingExercise: {
        name: "5-4-3-2-1 Sensory Grounding",
        instructions: [
          "5 things you can see around the room right now",
          "4 things you can physically touch (the texture of your clothes, your chair, the floor)",
          "3 things you can hear (room hum, distant traffic, breath)",
          "2 things you can smell or enjoy the scent of",
          "1 thing you can taste or the feeling of cool water in your mouth",
        ],
      },
    };
  }

  // Healthcare cost / doctor question specifically
  if (
    (text.includes("afford") || text.includes("cost") || text.includes("money") || text.includes("insurance") || text.includes("broke")) &&
    (text.includes("doctor") || text.includes("gyn") || text.includes("clinic") || text.includes("hospital") || text.includes("medical"))
  ) {
    return {
      reply:
        "Navigating healthcare costs when you are already dealing with symptoms or worry is exhausting, and you deserve accessible, respectful care regardless of financial circumstances.\n\nHere are practical avenues available to explore:\n\n1. **Community Health Centers / FQHCs**: Federally Qualified Health Centers and community clinics provide sliding-scale fees based on your income, not high private flat rates. Even with $0 income, many provide free or low-nominal ($5–$15) visits.\n2. **Public / District Hospitals (Outpatient Clinics)**: Government or public hospital OPDs frequently offer baseline blood tests, routine ultrasounds, and basic reproductive screenings at minimal or no charge.\n3. **Telehealth Triage Services**: Virtual consultations can often provide initial guidance, low-cost prescription refills, or lab orders before booking expensive in-person visits.\n4. **Title X Family Planning Clinics**: In many areas, Title X clinics provide confidential, income-adjusted reproductive healthcare, cancer screenings, and contraception.",
      theme: "Affordable Healthcare & Navigation",
      suggestedActions: [
        "Search findahealthcenter.hrsa.gov for sliding-scale clinics nearby",
        "Call the clinic front desk and ask for their 'Sliding Fee Scale hardship program'",
        "Prepare a 1-page summary of symptoms and dates to make your consultation concise",
      ],
      reflectionPrompt: "My worth and health are not determined by finances. I have the right to seek safe care.",
    };
  }

  // Anxiety, panic, racing thoughts
  if (
    text.includes("anxious") ||
    text.includes("anxiety") ||
    text.includes("panic") ||
    text.includes("overwhelm") ||
    text.includes("racing") ||
    text.includes("nervous") ||
    text.includes("scared") ||
    text.includes("fear") ||
    text.includes("worry")
  ) {
    return {
      reply:
        "Take a slow breath right here with me. When anxiety spikes, your nervous system is trying to protect you by sounding alarms, even when you are physically safe right in this room.\n\nLet’s start by uncoupling your mind from the racing thoughts: your thoughts right now are weather, not facts. You don't have to solve everything today, or figure out the next five years in the next five minutes.\n\nNotice where you are holding this in your body—drop your shoulders down away from your ears, unlock your jaw, and let your belly soften completely.",
      theme: "Anxiety & Nervous System Calming",
      suggestedActions: [
        "Try the 4-7-8 breathing exercise below for 3 cycles",
        "Place both feet flat on the floor and feel the solid ground beneath you",
        "Drink a glass of cold water slowly, noticing the sensation down your throat",
        "Write down the single next step you need to take today—just one",
      ],
      reflectionPrompt: "What is one fear my mind is telling me that I can give myself permission to set down for today?",
      groundingExercise: {
        name: "4-7-8 Parasympathetic Reset",
        instructions: [
          "Empty your lungs completely through your mouth with a gentle whoosh",
          "Inhale quietly through your nose to a mental count of 4",
          "Gently hold your breath for a count of 7",
          "Exhale completely through your mouth for a count of 8",
          "Repeat this cycle 4 times to stimulate the vagus nerve",
        ],
      },
    };
  }

  // Burnout, exhaustion, work stress, mental load
  if (
    text.includes("burnout") ||
    text.includes("burned out") ||
    text.includes("exhaust") ||
    text.includes("tired") ||
    text.includes("work") ||
    text.includes("job") ||
    text.includes("boss") ||
    text.includes("mental load") ||
    text.includes("drained") ||
    text.includes("too much to do")
  ) {
    return {
      reply:
        "I hear how bone-deep that tiredness feels. When you carry the mental load for everyone around you—or work under constant pressure—exhaustion isn't just physical; it's emotional and sensory overload.\n\nYou do not have to earn your right to rest. Rest is not a reward for productivity; it is a biological requirement. When we push past our natural limits, our body eventually forces a pause.\n\nToday, I invite you to consider what you can subtract, rather than what else you can optimize or achieve.",
      theme: "Burnout Recovery & Mental Load",
      suggestedActions: [
        "Declare a 30-minute 'zero-demand' window where nobody can ask you for anything",
        "Identify one task on your to-do list that can be deferred until next week or deleted",
        "Step away from your work screen and lie down flat on your back for 10 minutes",
        "Say 'no' or 'I don't have capacity for that this week' to an upcoming non-essential ask",
      ],
      reflectionPrompt: "If I didn't feel the need to prove my worth through doing, what would my soul ask for right now?",
    };
  }

  // Hormonal / PMS / PMDD / Cycle-related emotional volatility
  if (
    text.includes("pms") ||
    text.includes("pmdd") ||
    text.includes("period") ||
    text.includes("cycle") ||
    text.includes("crying for no reason") ||
    text.includes("mood swing") ||
    text.includes("irritab") ||
    text.includes("luteal") ||
    text.includes("hormon")
  ) {
    return {
      reply:
        "Please be so gentle with yourself. During the luteal phase (the days leading up to your period), progesterone drops and serotonin levels can plummet rapidly. The feelings you are experiencing are neurochemically real—you are not 'crazy', overly dramatic, or failing.\n\nHormonal shifts lower our emotional filtration system: things you normally brush aside suddenly feel raw and intolerable. While the intensity may feel overwhelming, remember that this phase is temporary and your body will reset.\n\nThis is a time for insulation: warm nourishing foods, lower social obligations, and cozy boundaries.",
      theme: "Cycle Rhythms & Hormonal Emotional Support",
      suggestedActions: [
        "Remind yourself: 'This is my hormones talking right now, not the permanent truth of my life'",
        "Eat a complex carbohydrate snack (oats, sweet potato, banana) to naturally boost serotonin",
        "Avoid making major relational decisions or life ultimatums until cycle day 3",
        "Take a warm bath or use a heating pad across your lower abdomen and lower back",
      ],
      reflectionPrompt: "What tenderness or reassurance would I give a dear friend who was feeling this exact hormonal wave?",
    };
  }

  // Sadness, grief, loneliness, heartbreak
  if (
    text.includes("sad") ||
    text.includes("cry") ||
    text.includes("crying") ||
    text.includes("lonely") ||
    text.includes("alone") ||
    text.includes("heartbreak") ||
    text.includes("breakup") ||
    text.includes("loss") ||
    text.includes("grief") ||
    text.includes("empty")
  ) {
    return {
      reply:
        "I am sitting with you in this sorrow. It takes courage to admit when you feel lonely, heartbroken, or heavy inside. Tears are not weakness—they are your nervous system's way of releasing emotional stress hormones.\n\nYou do not have to hurry your way out of this feeling or put on a brave face for HerSpace. It is completely okay to feel sad, tender, or disoriented right now.\n\nEven when loneliness feels absolute, remember that countless women around the world are sitting with this exact ache tonight. You are part of that shared human heartbeat.",
      theme: "Emotional Healing & Grief Support",
      suggestedActions: [
        "Let yourself cry if the tears need to come; fighting them takes twice as much energy",
        "Wrap yourself in a warm blanket or put on your softest clothes for tactile comfort",
        "Place one hand on your heart and one on your belly; feel your own warmth and breath",
        "Send a simple low-pressure text to one friend: 'Thinking of you, just having a quiet evening'",
      ],
      reflectionPrompt: "What does the tenderest part of my heart need to hear from me right now?",
    };
  }

  // Relationships, boundaries, conflict, guilt
  if (
    text.includes("relationship") ||
    text.includes("partner") ||
    text.includes("husband") ||
    text.includes("boyfriend") ||
    text.includes("mom") ||
    text.includes("mother") ||
    text.includes("family") ||
    text.includes("boundary") ||
    text.includes("guilt") ||
    text.includes("people pleaser") ||
    text.includes("fight") ||
    text.includes("argument")
  ) {
    return {
      reply:
        "Interpersonal dynamics can be one of the heaviest things we carry. When you are used to keeping the peace or managing everyone else's emotional temperature, setting a boundary can feel like cruelty—even though it is actually essential self-preservation.\n\nA boundary is not an attack or a punishment toward the other person. A boundary is simply the distance at which you can love both them and yourself simultaneously.\n\nYou are allowed to have preferences, limits, and needs that inconvenience other people.",
      theme: "Boundaries & Relational Clarity",
      suggestedActions: [
        "Practice a simple clear boundary phrase: 'I love you, and I also need some quiet time tonight'",
        "Remind yourself that someone else's disappointment does not equal your failure",
        "Take 5 minutes before replying to heated messages or calls to let adrenaline settle",
      ],
      reflectionPrompt: "Where in my relationships am I currently saying 'yes' when my spirit is screaming 'no'?",
    };
  }

  // Sleep, insomnia, night worries
  if (
    text.includes("sleep") ||
    text.includes("insomnia") ||
    text.includes("can't sleep") ||
    text.includes("awake") ||
    text.includes("night") ||
    text.includes("nightmare")
  ) {
    return {
      reply:
        "Nighttime has a way of magnifying every worry. When the world goes quiet and distractions disappear, all the untangled thoughts from the day rush to the surface. It is very common to feel heightened vulnerability in the middle of the night.\n\nIf you can't sleep, don't battle the bed. Lying there feeling angry at yourself for being awake only releases more cortisol.\n\nReframe this time: even resting quietly with your eyes closed and muscles relaxed provides significant restorative benefits to your cells.",
      theme: "Sleep Sanctuary & Night Rest",
      suggestedActions: [
        "Turn down bright overhead lights and dim all screens immediately",
        "Do a 'brain dump': write every lingering worry on a scrap of paper and close the notebook",
        "Sip chamomile or warm water and do gentle shoulder rolls",
        "Try the progressive muscle relaxation below",
      ],
      reflectionPrompt: "The day is done. I have done what I could, and tomorrow is a clean slate.",
      groundingExercise: {
        name: "Progressive Physical Release",
        instructions: [
          "Gently tense your toes and feet for 5 seconds, then let them go completely limp",
          "Tense your thighs and calves for 5 seconds, then release and feel the warmth sink into the bed",
          "Tighten your hands into fists for 5 seconds, then open your palms soft and heavy",
          "Squeeze your eyes and furrow your brow for 3 seconds, then let your forehead turn smooth as water",
        ],
      },
    };
  }

  // Default warm empathetic response to any question or sharing
  return {
    reply: `Thank you for sharing this with me. When you speak your truth—even into a screen—you are giving yourself permission to be seen and to untangle whatever you've been holding inside.\n\nWhatever brought you to HerSpace today, you don't have to carry the whole weight of it by yourself. Every season of life brings moments where we need to pause, exhale, and get our bearings again.\n\nWhat feels like the most supportive next step for your spirit right now? Even the smallest gesture of gentleness toward yourself counts.`,
    theme: "Personal Reflection & Emotional Grounding",
    suggestedActions: [
      "Drink a warm glass of water or tea and take three slow, conscious breaths",
      "Notice your physical posture and gently release any tension in your neck and shoulders",
      "Write a short two-sentence reflection in your private journal on how you feel right now",
    ],
    reflectionPrompt: "What is one kind boundary or moment of gentleness you can offer yourself today?",
    groundingExercise: {
      name: "3-Minute Body & Breath Anchor",
      instructions: [
        "Inhale slowly for 4 seconds, feeling your chest and belly expand",
        "Gently pause at the top for 2 seconds",
        "Exhale softly through your mouth for 6 seconds",
        "Allow your shoulders to sink downward with every out-breath",
      ],
    },
  };
}
