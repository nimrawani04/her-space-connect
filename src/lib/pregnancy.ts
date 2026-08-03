// Pure helpers + educational content for the Pregnancy Journey module.

export const DAY = 86400000;

export function addDays(iso: string, n: number) {
  return new Date(new Date(iso).getTime() + n * DAY).toISOString().slice(0, 10);
}
export function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY);
}
export const todayISO = () => new Date().toISOString().slice(0, 10);

/** Naegele's rule: LMP + 280 days. */
export function dueDateFromLmp(lmp: string) {
  return addDays(lmp, 280);
}
export function dueDateFromConception(conception: string) {
  return addDays(conception, 266);
}

/** Gestational age in whole weeks + days from LMP. */
export function gestationalAge(lmp: string, on: string = todayISO()) {
  const d = Math.max(0, daysBetween(lmp, on));
  return { weeks: Math.floor(d / 7), days: d % 7, totalDays: d };
}

export function trimesterOf(week: number): 1 | 2 | 3 {
  if (week <= 13) return 1;
  if (week <= 27) return 2;
  return 3;
}

export const TRIMESTERS = [
  { n: 1 as const, label: "First trimester", range: "Weeks 1–13", emoji: "🌼", tone: "bg-rose-100 text-rose-900 border-rose-200" },
  { n: 2 as const, label: "Second trimester", range: "Weeks 14–27", emoji: "🌸", tone: "bg-amber-100 text-amber-900 border-amber-200" },
  { n: 3 as const, label: "Third trimester", range: "Weeks 28–40", emoji: "🌻", tone: "bg-emerald-100 text-emerald-900 border-emerald-200" },
];

const SIZES: Record<number, string> = {
  4: "poppy seed", 5: "sesame seed", 6: "lentil", 7: "blueberry", 8: "kidney bean",
  9: "grape", 10: "kumquat", 11: "fig", 12: "lime", 13: "pea pod",
  14: "lemon", 15: "apple", 16: "avocado", 17: "turnip", 18: "bell pepper",
  19: "mango", 20: "banana", 21: "carrot", 22: "papaya", 23: "grapefruit",
  24: "corn cob", 25: "cauliflower", 26: "lettuce head", 27: "cabbage",
  28: "eggplant", 29: "butternut squash", 30: "cucumber", 31: "coconut",
  32: "jicama", 33: "pineapple", 34: "cantaloupe", 35: "honeydew melon",
  36: "romaine lettuce", 37: "chard bunch", 38: "leek", 39: "mini watermelon", 40: "small pumpkin",
};

const BABY: Record<number, string> = {
  1: "Your body is preparing to release an egg — dating starts from your last period.",
  2: "Ovulation approaches; the uterine lining thickens for a possible implantation.",
  3: "Fertilisation may occur and the tiny cluster of cells travels to the uterus.",
  4: "Implantation happens. The embryo starts forming the placenta and yolk sac.",
  5: "The neural tube (brain and spine) begins to close. The heart tube forms.",
  6: "A heartbeat can often be detected. Facial features and limb buds appear.",
  7: "The brain grows rapidly; arm and leg buds lengthen into paddles.",
  8: "Fingers and toes begin to separate. All major organs are forming.",
  9: "The embryo becomes a fetus. Tiny muscles allow the first movements.",
  10: "Vital organs are in place and starting to function. Nails begin to form.",
  11: "The head is about half the body length; tooth buds and bones harden.",
  12: "Reflexes develop — your baby can curl fingers and toes.",
  13: "Vocal cords form and fingerprints appear on tiny fingertips.",
  14: "Facial muscles work: squinting, frowning and grimacing practice.",
  15: "Bones harden further; baby can sense light through closed eyelids.",
  16: "Tiny ears are positioned; baby may begin to hear muffled sounds.",
  17: "Fat stores begin to develop and the umbilical cord thickens.",
  18: "Hearing is developing well — talking or reading aloud is lovely bonding.",
  19: "Vernix caseosa, a protective coating, covers the skin.",
  20: "Halfway. Your baby swallows amniotic fluid and produces meconium.",
  21: "Movements become more coordinated; sleep–wake cycles emerge.",
  22: "Eyebrows and lashes appear; grip strengthens.",
  23: "Lungs practise breathing movements; hearing sharpens.",
  24: "Viability milestone; the inner ear controls balance.",
  25: "Baby responds to your voice and touch on the belly.",
  26: "Eyes begin to open; lungs make surfactant.",
  27: "Brain activity increases sharply; baby may hiccup.",
  28: "Baby dreams (REM sleep) and can blink.",
  29: "Bones fully developed but soft; muscle and fat build.",
  30: "Amniotic fluid decreases as baby takes up more room.",
  31: "All five senses are working; rapid brain growth continues.",
  32: "Baby often settles head-down; toenails complete.",
  33: "Skull bones stay soft and separate for birth.",
  34: "Central nervous system and lungs mature steadily.",
  35: "Fat rounds out the limbs; kidneys are fully developed.",
  36: "Baby may drop into the pelvis (lightening).",
  37: "Early term. Practising sucking, blinking and breathing.",
  38: "Firm grasp; organs ready for life outside.",
  39: "Full term. Baby continues adding fat for warmth.",
  40: "Your due date. Labour can begin any day now.",
};

const MOTHER: Record<number, string> = {
  1: "You are menstruating; nothing has been conceived yet.",
  4: "You may notice implantation spotting or a missed period.",
  6: "Nausea, sore breasts and fatigue often peak around now.",
  9: "Frequent urination and food aversions are common.",
  12: "Nausea often begins to ease; the uterus rises above the pelvis.",
  14: "Energy returns for many — the classic 'honeymoon' phase begins.",
  16: "A small bump is often visible; round ligament twinges start.",
  20: "Anatomy scan time. You may feel the first flutters (quickening).",
  24: "Glucose screening window; back ache and leg cramps can appear.",
  28: "Third trimester begins: heartburn, breathlessness and Braxton Hicks.",
  32: "Visits become more frequent; swelling in feet and hands is common.",
  36: "Weekly checks begin; pelvic pressure increases.",
  40: "Watch for regular contractions, waters breaking or a show.",
};

function nearest(map: Record<number, string>, week: number) {
  for (let w = week; w >= 1; w--) if (map[w]) return map[w];
  return "";
}

const T_SYMPTOMS: Record<1 | 2 | 3, string[]> = {
  1: ["Nausea / morning sickness", "Fatigue", "Breast tenderness", "Food aversions", "Frequent urination", "Mood swings"],
  2: ["Round ligament pain", "Nasal congestion", "Leg cramps", "Skin changes", "Increased appetite", "Backache"],
  3: ["Heartburn", "Braxton Hicks", "Shortness of breath", "Swollen ankles", "Trouble sleeping", "Pelvic pressure"],
};
const T_NUTRITION: Record<1 | 2 | 3, string[]> = {
  1: ["400–800 mcg folic acid daily", "Small frequent meals for nausea", "Ginger, dry crackers, plenty of fluids", "Avoid raw fish, unpasteurised cheese, alcohol"],
  2: ["Iron-rich foods: lentils, spinach, red meat, fortified cereal", "Calcium + vitamin D for bones", "Protein at every meal", "Fibre and water to ease constipation"],
  3: ["Smaller meals to reduce heartburn", "Omega-3 (DHA) for brain development", "Keep iron and calcium steady", "Limit caffeine and very salty foods"],
};
const T_EXERCISE: Record<1 | 2 | 3, string[]> = {
  1: ["Walking 20–30 min", "Prenatal yoga", "Pelvic floor (Kegel) exercises", "Rest whenever you need it"],
  2: ["Swimming and water aerobics", "Stationary cycling", "Light strength work", "Stretching for back relief"],
  3: ["Gentle walking", "Birth-ball hip circles", "Pelvic tilts and squats (if cleared)", "Breathing practice for labour"],
};
const T_DOS: Record<1 | 2 | 3, { do: string[]; dont: string[] }> = {
  1: { do: ["Book your first antenatal visit", "Take prenatal vitamins", "Sleep as much as you can", "Stay hydrated"], dont: ["Smoke or drink alcohol", "Take medicines without asking your clinician", "Use hot tubs or saunas", "Handle cat litter"] },
  2: { do: ["Attend the anatomy scan", "Start sleeping on your side", "Moisturise your bump", "Plan maternity leave"], dont: ["Lie flat on your back for long", "Lift heavy objects", "Skip meals", "Ignore severe headaches"] },
  3: { do: ["Pack your hospital bag", "Write a birth plan", "Count kicks daily", "Learn labour signs"], dont: ["Travel far without clinician approval", "Ignore reduced fetal movement", "Stand for very long periods", "Skip your growth scans"] },
};
const T_TESTS: Record<1 | 2 | 3, string[]> = {
  1: ["Confirmation blood test (beta hCG)", "Blood group and Rh factor", "Full blood count, thyroid, sugar", "Dating scan (6–9 weeks)", "NT scan (11–13 weeks)"],
  2: ["Anomaly / anatomy scan (18–22 weeks)", "Glucose tolerance test (24–28 weeks)", "Haemoglobin recheck", "Urine protein at each visit"],
  3: ["Growth scans", "Group B strep swab (35–37 weeks)", "Blood pressure at every visit", "Non-stress test if advised"],
};
const T_MEDS: Record<1 | 2 | 3, string[]> = {
  1: ["Folic acid 400–800 mcg", "Vitamin D", "Anti-nausea options only if prescribed"],
  2: ["Iron supplement if advised", "Calcium 1000 mg", "Continue folic acid + vitamin D"],
  3: ["Iron and calcium continue", "DHA / omega-3", "Discuss any pain relief with your clinician"],
};

export type WeekInfo = ReturnType<typeof weekInfo>;

export function weekInfo(week: number) {
  const w = Math.min(40, Math.max(1, week));
  const t = trimesterOf(w);
  return {
    week: w,
    trimester: t,
    size: SIZES[w] ?? null,
    baby: nearest(BABY, w),
    mother: nearest(MOTHER, w),
    symptoms: T_SYMPTOMS[t],
    nutrition: T_NUTRITION[t],
    exercise: T_EXERCISE[t],
    dos: T_DOS[t].do,
    donts: T_DOS[t].dont,
    tests: T_TESTS[t],
    meds: T_MEDS[t],
  };
}

// ---- Fertility helpers ----

/** Fertile window & ovulation from last period start + cycle length (luteal phase 14d). */
export function fertileWindow(lastPeriodStart: string, cycleLength: number) {
  const ovulation = addDays(lastPeriodStart, Math.max(10, cycleLength - 14));
  return { ovulation, start: addDays(ovulation, -5), end: addDays(ovulation, 1) };
}

/** Rough day-by-day conception probability relative to ovulation day. */
export function conceptionChanceToday(ovulation: string, on: string = todayISO()) {
  const d = daysBetween(on, ovulation); // days until ovulation
  const table: Record<number, number> = { 5: 10, 4: 16, 3: 14, 2: 27, 1: 31, 0: 33, [-1]: 12 };
  const pct = table[d] ?? 1;
  const label = pct >= 25 ? "High" : pct >= 12 ? "Moderate" : "Low";
  return { pct, label, daysToOvulation: d };
}

export const MUCUS_OPTIONS = ["dry", "sticky", "creamy", "watery", "egg-white"] as const;
export const OV_TEST_OPTIONS = ["not tested", "negative", "positive"] as const;

export const PRECONCEPTION_ITEMS = [
  { key: "folic_acid", group: "Essentials", label: "Started folic acid (400–800 mcg daily)" },
  { key: "bmi", group: "Essentials", label: "Healthy BMI discussed with a clinician" },
  { key: "preconception_visit", group: "Essentials", label: "Booked a pre-conception check-up" },
  { key: "vaccines_rubella", group: "Vaccinations", label: "Rubella (MMR) immunity confirmed" },
  { key: "vaccines_flu", group: "Vaccinations", label: "Flu vaccine up to date" },
  { key: "vaccines_tdap", group: "Vaccinations", label: "Tdap status reviewed" },
  { key: "conditions_reviewed", group: "Medical conditions", label: "Thyroid / PCOS / diabetes reviewed" },
  { key: "meds_reviewed", group: "Medical conditions", label: "Current medicines checked for pregnancy safety" },
  { key: "dental", group: "Medical conditions", label: "Dental check-up done" },
  { key: "no_smoking", group: "Lifestyle", label: "No smoking or vaping" },
  { key: "no_alcohol", group: "Lifestyle", label: "Alcohol stopped or reduced" },
  { key: "caffeine", group: "Lifestyle", label: "Caffeine under 200 mg/day" },
  { key: "sleep_stress", group: "Lifestyle", label: "Sleep and stress routine in place" },
  { key: "partner_semen", group: "Partner", label: "Partner: semen analysis discussed" },
  { key: "partner_lifestyle", group: "Partner", label: "Partner: smoking / alcohol / heat exposure reduced" },
  { key: "partner_health", group: "Partner", label: "Partner: general health check done" },
] as const;

export const LEARN_PRECONCEPTION = [
  { title: "How pregnancy happens", body: "Each cycle an ovary releases an egg. If sperm meets it within roughly 24 hours in the fallopian tube, fertilisation can happen. The fertilised egg travels to the uterus over 5–6 days and implants in the thickened lining — that implantation is what starts a pregnancy and triggers hCG, the hormone home tests detect." },
  { title: "Best time to conceive", body: "The fertile window is the five days before ovulation plus ovulation day itself. Sperm survive up to five days; the egg only about a day. Having sex every 1–2 days across that window gives the highest chance without needing to time it perfectly." },
  { title: "Myths vs facts", body: "Myth: you must lie down for 30 minutes after sex. Fact: sperm reach the cervix within minutes. Myth: irregular cycles mean infertility. Fact: they make timing harder, not impossible — tracking helps. Myth: stopping contraception delays fertility for months. Fact: fertility usually returns within one or two cycles for most methods." },
  { title: "Fertility tips", body: "Track cycles for 2–3 months before trying, take folic acid at least a month before conception, keep a stable weight, limit alcohol and caffeine, and see a clinician after 12 months of trying (6 months if you are over 35)." },
];

export const KNOWLEDGE_HUB: { category: string; emoji: string; items: { title: string; body: string }[] }[] = [
  {
    category: "Before pregnancy", emoji: "🌱",
    items: [
      { title: "Fertility", body: "Fertility depends on ovulation, healthy tubes, sperm quality and timing. Age matters, but so do weight, thyroid function, smoking and stress. Charting BBT and cervical mucus for a few cycles gives you and your clinician real data." },
      { title: "Ovulation", body: "Ovulation usually happens 12–16 days before your next period, not necessarily on day 14. Signs include egg-white cervical mucus, a mild one-sided twinge, a rise in basal body temperature of 0.3–0.5 °C, and a positive LH test." },
      { title: "Nutrition", body: "Focus on folate (leafy greens, lentils), iron, iodine, vitamin D and omega-3. Start folic acid at least one month before trying — it reduces neural tube defects substantially." },
      { title: "Lifestyle", body: "Aim for 150 minutes of moderate activity a week, 7–9 hours of sleep, no smoking, minimal alcohol, and caffeine under 200 mg daily. Ask about any long-term medicines before conceiving." },
    ],
  },
  {
    category: "During pregnancy", emoji: "🤰",
    items: [
      { title: "Baby growth", body: "Organs form in the first trimester, systems mature in the second, and the third is mainly growth, fat and lung maturity. Growth is tracked by fundal height and scans." },
      { title: "Mother's body", body: "Blood volume rises by up to 50%, the heart works harder, ligaments loosen, and the uterus grows from pear-sized to watermelon-sized. Most discomforts come from these normal adaptations." },
      { title: "Diet", body: "Roughly 340 extra calories a day in the second trimester and 450 in the third. Avoid raw or undercooked meat and eggs, unpasteurised dairy, high-mercury fish, and unwashed produce." },
      { title: "Exercise", body: "Most people can safely continue moderate exercise. Avoid contact sports, scuba diving, hot yoga and anything with fall risk. Stop and call your clinician for bleeding, dizziness or contractions." },
      { title: "Mental health", body: "Anxiety and mood swings are common. Perinatal depression affects roughly 1 in 7 people — it is treatable. Talk to your clinician if low mood, panic or intrusive thoughts last more than two weeks." },
      { title: "Safe medicines", body: "Paracetamol is generally considered safe; ibuprofen usually is not, especially after 20 weeks. Always confirm any medicine, herb or supplement with your clinician or pharmacist." },
      { title: "Common discomforts", body: "Nausea, heartburn, constipation, back pain, swelling and insomnia are typical. Small meals, fibre, side-sleeping with a pillow, and gentle movement help most of them." },
    ],
  },
  {
    category: "Complications", emoji: "⚠️",
    items: [
      { title: "Gestational diabetes", body: "High blood sugar first appearing in pregnancy, usually screened at 24–28 weeks. Often managed with diet and activity; sometimes insulin. Untreated it raises the risk of a large baby and delivery complications." },
      { title: "Preeclampsia", body: "High blood pressure plus protein in urine after 20 weeks. Warning signs: severe headache, vision changes, upper abdominal pain, sudden swelling of face or hands. It needs urgent medical review." },
      { title: "High blood pressure", body: "Readings at or above 140/90 need monitoring. Keep a home log, reduce salt, rest on your left side and attend every check." },
      { title: "Anemia", body: "Low haemoglobin causes fatigue, breathlessness and dizziness. Iron-rich food plus vitamin C helps absorption; supplements are often prescribed." },
      { title: "Preterm labour", body: "Regular contractions, low backache, pelvic pressure, fluid leak or bleeding before 37 weeks. Call your maternity unit immediately — early treatment can delay birth and protect the lungs." },
    ],
  },
  {
    category: "Labour & delivery", emoji: "🩺",
    items: [
      { title: "Signs of labour", body: "Regular strengthening contractions (5 minutes apart for 1 hour), waters breaking, a bloody show, and persistent low back pain. Practice (Braxton Hicks) contractions are irregular and ease with rest." },
      { title: "C-section vs vaginal birth", body: "Vaginal birth generally means faster recovery and a shorter stay. A caesarean may be planned or become necessary for position, placenta, distress or stalled labour. Both are safe, supported routes to meeting your baby." },
      { title: "Pain management", body: "Options include breathing and movement, water immersion, TENS, nitrous oxide, opioid injections and epidural. Discuss preferences early, and stay flexible." },
      { title: "Hospital checklist", body: "ID and notes, comfortable clothes, toiletries, phone and charger, snacks, nursing bra, going-home outfit, nappies, baby clothes, car seat installed." },
    ],
  },
  {
    category: "Newborn basics", emoji: "👶",
    items: [
      { title: "Breastfeeding", body: "Feed on demand, 8–12 times in 24 hours. A deep latch takes most of the areola, not just the nipple. Wet nappies and steady weight gain are the best signs of enough milk." },
      { title: "Baby sleep", body: "Newborns sleep 14–17 hours in short bursts. Always on the back, on a firm flat surface, in your room, with no loose bedding or toys." },
      { title: "Vaccinations", body: "Follow your national schedule — typically BCG, hepatitis B and polio at birth, then a series at 6, 10 and 14 weeks. Keep the card safe." },
      { title: "First bath", body: "Sponge-bathe until the cord stump falls off (1–3 weeks). Then short baths 2–3 times a week in water around 37 °C, supporting the head at all times." },
      { title: "Umbilical cord care", body: "Keep it clean and dry, fold the nappy below it, and let it fall off naturally. Call your clinician for redness spreading to the skin, pus or a foul smell." },
    ],
  },
];

export const LABOR_WARNING_SIGNS = [
  "Heavy vaginal bleeding",
  "Severe or persistent headache with vision changes",
  "Sudden swelling of face, hands or feet",
  "Baby moving much less than usual",
  "Fluid leaking before 37 weeks",
  "Fever above 38 °C",
  "Severe upper abdominal pain",
  "Painful or burning urination with back pain",
];

export const BIRTH_PLAN_PROMPTS = [
  "Who do you want with you during labour?",
  "Pain relief preferences (and your backup plan)",
  "Positions and movement during labour",
  "Preferences for monitoring and interventions",
  "Skin-to-skin and delayed cord clamping",
  "Feeding plan for the first hours",
  "If a caesarean becomes necessary, what matters most to you?",
];

export const MEDICAL_DISCLAIMER =
  "Educational information only — not a substitute for advice from your doctor or midwife. Always confirm anything that concerns you with your clinician.";