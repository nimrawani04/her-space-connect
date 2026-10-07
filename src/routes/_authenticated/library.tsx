import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { useState, useRef, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  Search,
  FileText,
  ExternalLink,
  Bookmark,
  Sparkles,
  GraduationCap,
  Calendar,
  ArrowUpRight,
  Loader2,
  Share2,
  Check,
  Microscope,
  Flame,
  X,
  HeartHandshake,
  Play,
  Pause,
  Video,
  Headphones,
  Clock,
  User,
  Volume2,
  VolumeX,
  RotateCcw,
  CheckCircle2,
  Award,
  Layers,
  Baby,
  Activity,
  Moon,
  Heart,
  ChevronRight,
  Sparkle,
  Download,
  Printer,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({ meta: [{ title: "Educational Academy & Scientific Library · HerSpace" }] }),
  component: Library,
});

/* =========================================================================
   TYPES & DATA MODELS
   ========================================================================= */

export interface ResearchPaper {
  id: string;
  title: string;
  authors: string;
  journal: string;
  year: string | number;
  doi?: string;
  pmid?: string;
  abstractText?: string;
  citedByCount?: number;
  isOpenAccess?: boolean;
  topic?: string;
}

export interface LibraryArticle {
  id: string;
  title: string;
  category: "Fertility" | "Pregnancy" | "Birth" | "Cycle" | "Perimenopause" | "Teen";
  topic: string;
  readMinutes: number;
  publishedDate: string;
  author: string;
  authorTitle: string;
  summary: string;
  keyTakeaways: string[];
  content: string[];
}

export interface CourseModule {
  number: number;
  title: string;
  duration: string;
  description: string;
  topics: string[];
}

export interface Course {
  id: string;
  title: string;
  category: "Fertility" | "Pregnancy" | "Birth" | "Cycle" | "Perimenopause" | "Teen";
  level: "Beginner" | "Intermediate" | "Comprehensive";
  instructor: string;
  instructorTitle: string;
  duration: string;
  lessonCount: number;
  rating: number;
  badge: string;
  tagline: string;
  overview: string;
  outcomes: string[];
  modules: CourseModule[];
}

export interface VideoWorkshop {
  id: string;
  title: string;
  category: "Fertility" | "Pregnancy" | "Birth" | "Cycle" | "Perimenopause" | "Teen";
  instructor: string;
  instructorTitle: string;
  durationMinutes: number;
  thumbnailGradient: string;
  description: string;
  videoUrl?: string;
  embedUrl?: string;
  chapters: { time: string; title: string }[];
  takeaways: string[];
}

export interface AudioSession {
  id: string;
  title: string;
  category: "Fertility" | "Pregnancy" | "Birth" | "Cycle" | "Perimenopause" | "Teen";
  durationMinutes: number;
  narrator: string;
  purpose: string;
  description: string;
  ambientVibe: string;
  spokenScript: string;
}

/* =========================================================================
   COURSES DATA (Fertility, Pregnancy, Birth, Cycle, Perimenopause, Teen)
   ========================================================================= */

const COURSES_DATA: Course[] = [
  {
    id: "course-fertility",
    title: "Conscious Conception & Follicular Biomarkers",
    category: "Fertility",
    level: "Comprehensive",
    instructor: "Dr. Elena Rostova, MD",
    instructorTitle: "Reproductive Endocrinologist & Ovarian Biology Fellow",
    duration: "3.5 hrs",
    lessonCount: 16,
    rating: 4.95,
    badge: "Fertility Education",
    tagline: "Empowering your reproductive timeline with endocrine biology and cellular preconception care.",
    overview:
      "A clinical yet deeply holistic deep-dive into the 90-day follicular maturation window. Learn how to accurately map your fertile window using cervical fluid dynamics, basal body temperature biphasic shifts, urinary LH surges, and how to optimize egg cellular quality through targeted mitochondrial nutrition.",
    outcomes: [
      "Master the 4 fertile window biomarkers beyond calendar guesswork",
      "Understand luteal phase sufficiency and progesterone curve diagnostics",
      "Optimize the 90-day follicular genesis window through coenzyme Q10 and inositol science",
      "Learn when to seek specialized reproductive workups and AMH/FSH interpretation",
    ],
    modules: [
      {
        number: 1,
        title: "The 90-Day Ovarian Maturation Timeline",
        duration: "45 min",
        description: "How primordial follicles develop into the dominant Graafian follicle and what influences egg quality during this window.",
        topics: ["Folliculogenesis biology", "Mitochondrial energy needs", "Environmental and lifestyle endocrine modulators"],
      },
      {
        number: 2,
        title: "Biomarker Mapping: Cervical Mucus & Temperature Shifts",
        duration: "55 min",
        description: "Accurately identifying peak fertility days using estrogen-driven fluid patterns and post-ovulatory thermal shifts.",
        topics: ["Ferning & Spinnbarkeit mechanics", "Thermal crossline methods", "Addressing irregular ovulation"],
      },
      {
        number: 3,
        title: "Luteal Phase Health & Implantation Immunology",
        duration: "50 min",
        description: "How adequate progesterone production prepares the endometrium for blastocyst implantation and supports early vascularization.",
        topics: ["Short luteal phase causes", "Natural progesterone support", "Thyroid and prolactin balance"],
      },
      {
        number: 4,
        title: "Partner Preconception & Collaborative Action Plan",
        duration: "40 min",
        description: "Sperm morphology, motility, DNA fragmentation testing, and building a united, stress-resilient fertility protocol.",
        topics: ["Paternal preconception health", "Clinical testing checklist", "Emotional resilience during waiting cycles"],
      },
    ],
  },
  {
    id: "course-pregnancy",
    title: "Trimester Transitions: Maternal Physiology & Mindful Care",
    category: "Pregnancy",
    level: "Beginner",
    instructor: "Sarah Jenkins, MSN, CNM",
    instructorTitle: "Certified Nurse-Midwife & Perinatal Educator",
    duration: "4.2 hrs",
    lessonCount: 18,
    rating: 4.98,
    badge: "Pregnancy Education",
    tagline: "A midwife-guided roadmap through organogenesis, maternal cardiac adaptations, and third-trimester nesting.",
    overview:
      "Pregnancy reorganizes virtually every maternal organ system. This evidence-based course demystifies the biological shifts of all three trimesters, providing science-backed strategies for morning sickness, pelvic girdle stability, gestational glucose regulation, and emotional transition into matrescence.",
    outcomes: [
      "Navigate early pregnancy nausea and fatigue with biochemical nutritional strategies",
      "Prevent pelvic girdle and sacroiliac pain with biomechanical movements",
      "Understand standard prenatal testing (NIPT, anatomy ultrasound, GDM screens)",
      "Prepare mentally and nutritionally for the fourth trimester postpartum continuum",
    ],
    modules: [
      {
        number: 1,
        title: "First Trimester: Embryogenesis & Maternal Hemodynamics",
        duration: "60 min",
        description: "How your blood volume doubles, the placenta establishes blood flow, and strategies for managing hormonal fatigue.",
        topics: ["Placental development", "Safe remedies for hyperemesis & nausea", "Navigating early emotional anxiety"],
      },
      {
        number: 2,
        title: "Second Trimester: The Golden Window & Musculoskeletal Adaptations",
        duration: "65 min",
        description: "Managing relaxin-induced ligament laxity, safe strength training, and cardiovascular changes.",
        topics: ["Pelvic alignment exercises", "Second trimester lab work", "Foetal movements & kicks awareness"],
      },
      {
        number: 3,
        title: "Third Trimester: Fetal Positioning & Pelvic Opening",
        duration: "70 min",
        description: "Encouraging optimal fetal positioning (OA vs OP), perineal massage, and recognizing true vs false labor.",
        topics: ["Spinning Babies principles", "Perineal tissue preparation", "Managing heartburn and insomnia"],
      },
      {
        number: 4,
        title: "The Fourth Trimester Blueprint",
        duration: "55 min",
        description: "Creating a restorative postpartum cocoon: meal trains, pelvic rest, hormone drop navigation, and lactation foundations.",
        topics: ["Maternal hormone plunge (progesterone crash)", "Lactation physiology", "Mental health support networks"],
      },
    ],
  },
  {
    id: "course-birth",
    title: "Physiological Labor, Pelvic Biomechanics & Advocacy",
    category: "Birth",
    level: "Comprehensive",
    instructor: "Maya Thorne & Dr. Maya Sen, OB/GYN",
    instructorTitle: "Perinatal Doula Trainer & High-Risk Obstetrician",
    duration: "5.0 hrs",
    lessonCount: 20,
    rating: 4.99,
    badge: "Birth Education",
    tagline: "Bridging obstetric safety with physiological birth biomechanics and empowered medical advocacy.",
    overview:
      "Transform fear into grounded physiologic trust. Learn how pelvic inlet, midpelvis, and outlet diameters change with maternal postures. Explore the endocrine cocktail of birth (oxytocin, beta-endorphins, adrenaline) and master informed consent tools for hospital, birth center, or home environments.",
    outcomes: [
      "Understand the 3 pelvic planes and which movements open each diameter during labor",
      "Harness the neurobiology of uninhibited oxytocin and natural endorphin pain-relief",
      "Draft a respectful, clear birth plan utilizing BRAIN decision-making frameworks",
      "Equip your birth partner with hands-on comfort measures: hip squeezes, counter-pressure, and rebozo techniques",
    ],
    modules: [
      {
        number: 1,
        title: "The Neuroendocrinology of Physiological Labor",
        duration: "75 min",
        description: "The hormonal dance of labor: why dim lighting, privacy, and feelings of safety prevent adrenaline stalls.",
        topics: ["Oxytocin pulsatility", "Beta-endorphin bliss states", "The labor stall & environment connection"],
      },
      {
        number: 2,
        title: "Pelvic Biomechanics: Opening the 3 Diameters",
        duration: "80 min",
        description: "Anatomical movement strategies: internal vs external femoral rotation for inlet descent vs outlet crowning.",
        topics: ["Inlet opening movements", "Mid-pelvic station transitions", "Outlet crowning postures without supine lithotomy"],
      },
      {
        number: 3,
        title: "Pain Coping Strategies & Partner Touch Techniques",
        duration: "75 min",
        description: "Active vocalization, hydrotherapy, double hip squeezes, sacral counterpressure, and nitrous oxide / epidural options.",
        topics: ["Rhythmic breathing & low vocal tones", "Hands-on partner comfort techniques", "Informed epidural timing"],
      },
      {
        number: 4,
        title: "Hospital Advocacy, BRAIN Framework & Nuanced Outcomes",
        duration: "70 min",
        description: "How to collaborate with clinical teams, ask for time when safe, and maintain empowerment across unexpected caesareans.",
        topics: ["Benefits, Risks, Alternatives, Intuition, Nothing (BRAIN)", "Gentle cesarean options", "The golden hour bonding"],
      },
    ],
  },
  {
    id: "course-cycle",
    title: "Infradian Rhythm & Cycle Syncing Mastery",
    category: "Cycle",
    level: "Intermediate",
    instructor: "Alisa Morgan, MS, CNS",
    instructorTitle: "Clinical Nutritionist & Author of The Hormonal Blueprint",
    duration: "3.8 hrs",
    lessonCount: 15,
    rating: 4.92,
    badge: "Cycle Education",
    tagline: "Harness your 28-day biological rhythm for optimized metabolism, sustained energy, and cognitive flow.",
    overview:
      "Unlike the static 24-hour male circadian clock, women operate with a second biological clock: the infradian rhythm. Discover how estrogen and progesterone fluctuations remodel resting metabolic rate, brain neurochemistry, digestion, and exercise recovery across all 4 phases.",
    outcomes: [
      "Sync your nutrition with your 4 distinct phases to eliminate cravings and energy slumps",
      "Structure your workout schedule: high-intensity during follicular/ovulatory, restorative during luteal/menstrual",
      "Understand the neurochemistry of verbal fluency, strategic vision, and detail focus across the month",
      "Naturally ease PMS and heavy bleeds through estrobolome and liver detox pathways",
    ],
    modules: [
      {
        number: 1,
        title: "The Science of the Dual Clock: Circadian vs Infradian",
        duration: "50 min",
        description: "Why standard productivity and nutrition models fail women, and how your hormones influence cellular energy.",
        topics: ["The 4 phases demystified", "Basal metabolic rate fluctuations (100-300 kcal swings)", "Cortisol sensitivity in luteal phase"],
      },
      {
        number: 2,
        title: "Phase-Specific Nutrition & Blood Sugar Stabilization",
        duration: "60 min",
        description: "Nutrient density and carbohydrate cycling tailored to estrogen rise and progesterone temperature shifts.",
        topics: ["Fermented foods for estrogen clearance", "Complex carbs for luteal serotonin production", "Iron-rich foods for menstruation"],
      },
      {
        number: 3,
        title: "Cycle-Synced Movement & Athletic Performance",
        duration: "55 min",
        description: "When to hit PRs and sprint vs when heavy lifting increases joint laxity and drives systemic inflammation.",
        topics: ["Follicular strength gains", "Ovulatory peak power", "Luteal walking & pilates", "Menstrual restorative yoga"],
      },
      {
        number: 4,
        title: "Cognitive Strengths & Relationship Rhythms",
        duration: "65 min",
        description: "Aligning creative brainstorming, public presentations, deep-focus audits, and inward rest with your biology.",
        topics: ["Left-brain vs right-brain communication", "Boundary setting in late luteal phase", "Building your monthly rhythm calendar"],
      },
    ],
  },
  {
    id: "course-perimenopause",
    title: "Perimenopause Navigator: Hormones, Longevity & Sleep",
    category: "Perimenopause",
    level: "Comprehensive",
    instructor: "Dr. Clara Chen, MD",
    instructorTitle: "Midlife Health & Preventive Cardiology Lead",
    duration: "4.5 hrs",
    lessonCount: 19,
    rating: 4.97,
    badge: "Perimenopause Education",
    tagline: "Evidence-based midlife transition care: hot flashes, progesterone swings, brain fog, and bone preservation.",
    overview:
      "Perimenopause is not a sudden cliff, but a dynamic neurological and metabolic transition that can last 7 to 10 years. Learn how erratic estrogen spikes and declining progesterone affect GABA receptors, core thermoregulation, and vascular health — with clear guidance on lifestyle, non-hormonal, and transdermal HRT options.",
    outcomes: [
      "Identify which STRAW+10 stage you are in through cycle interval analysis",
      "Implement vasomotor cooling tactics for night sweats and broken sleep",
      "Understand neurosteroid changes and conquer anxiety or cognitive fog",
      "Formulate informed questions regarding bio-identical transdermal HRT and cardiovascular biomarkers",
    ],
    modules: [
      {
        number: 1,
        title: "Decoding the Transition: The STRAW+10 Clinical Framework",
        duration: "65 min",
        description: "From late reproductive years to late transition: why blood hormone tests fluctuate wildly and what to track instead.",
        topics: ["Cycle length variability (7+ day shifts)", "Anovulatory spikes", "FSH and inhibin-B shifts"],
      },
      {
        number: 2,
        title: "Sleep, GABA & Neurosteroids: Rescuing Your Rest",
        duration: "70 min",
        description: "Why dropping progesterone causes 3 AM awakenings, and the role of micronized progesterone and glycine.",
        topics: ["GABA-A receptor down-regulation", "Core body temperature nocturnal cooling", "Magnesium glycinate & L-theanine synergy"],
      },
      {
        number: 3,
        title: "Vasomotor Symptoms, Heart & Brain Protection",
        duration: "70 min",
        description: "Hypothalamic KNDy neuron remodeling, hot flashes, endothelial function, and metabolic insulin resistance.",
        topics: ["KNDy neuron activation", "Lipid profile shifts (ApoB & LDL)", "Strength training for visceral fat prevention"],
      },
      {
        number: 4,
        title: "Hormone Therapy Options, Non-Hormonal Solutions & Doctor Dialogues",
        duration: "65 min",
        description: "The 2026 consensus on transdermal 17β-estradiol, micronized progesterone, vaginal estrogen, and preparing for clinician visits.",
        topics: ["The timing hypothesis (starting within 10 years)", "Contraindications & risk assessments", "Printable doctor discussion sheet"],
      },
    ],
  },
  {
    id: "course-teen",
    title: "Teen & First Period Confidence: Body Literacy for Young Women",
    category: "Teen",
    level: "Beginner",
    instructor: "Dr. Aaliyah Brooks, MD & Maya Thorne",
    instructorTitle: "Adolescent Health Pediatrician & Youth Educator",
    duration: "2.5 hrs",
    lessonCount: 12,
    rating: 4.96,
    badge: "Teen & First Period",
    tagline: "A kind, shame-free guide to puberty milestones, first periods, cramps, and school confidence.",
    overview:
      "A compassionate, medically sound course created specifically for teenagers and their caregivers. Breaks down puberty physical milestones (growth spurts, discharge, breast buds), explains why periods happen without scary medical jargon, compares modern period products, and equips teens with school emergency readiness.",
    outcomes: [
      "Understand the normal order of puberty milestones without shame or fear",
      "Learn what your first period actually looks like (brown spotting to bright red)",
      "Confidently choose and use pads, period underwear, or tampons",
      "Build a discreet school backpack survival kit and talk with teachers or nurses without awkwardness",
    ],
    modules: [
      {
        number: 1,
        title: "Puberty Decoded: What Your Body is Doing & Why",
        duration: "45 min",
        description: "Growth spurts, body odor, breast bud development, and clear/white discharge: the natural prelude to your first period.",
        topics: ["The 2-year runway before menarche", "Understanding discharge as a self-cleaning mechanism", "Body changes celebration"],
      },
      {
        number: 2,
        title: "Your First Period: The Complete Playbook",
        duration: "55 min",
        description: "What happens when your period arrives, how much blood actually comes out (just 2-3 tablespoons!), and period products 101.",
        topics: ["Why the uterine lining sheds", "Comparing pads, period pants & menstrual cups", "Safe tampon insertion tips"],
      },
      {
        number: 3,
        title: "Cramp Relief, School Survival & Self-Advocacy",
        duration: "50 min",
        description: "Natural remedies for lower belly cramps, school locker emergency prep, and simple scripts for talking with adults.",
        topics: ["Heat patches & gentle stretches", "Building your backpack emergency pouch", "Confidence scripts for teachers & nurses"],
      },
    ],
  },
];

/* =========================================================================
   VIDEO MASTERCLASSES DATA
   ========================================================================= */

const VIDEOS_DATA: VideoWorkshop[] = [
  {
    id: "vid-1",
    title: "Mastering the Infradian Rhythm: Phase-Based Workouts & Nutrition",
    category: "Cycle",
    instructor: "Alisa Morgan, MS, CNS",
    instructorTitle: "Clinical Nutritionist & Cycle Scientist",
    durationMinutes: 28,
    thumbnailGradient: "from-rose-500/20 via-primary/20 to-amber-500/10",
    videoUrl: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260813_115057_94c3699b-0fd1-4124-bcf3-3626bb8c1f77.mp4",
    embedUrl: "https://www.youtube-nocookie.com/embed/ayzN5f3qN8g",
    description: "Watch clinical demonstrations of how hormone shifts dictate resting metabolic rate, glycogen storage, and strength recovery across the menstrual month.",
    chapters: [
      { time: "00:00", title: "Why 24-Hour Routines Burn Women Out" },
      { time: "05:12", title: "Follicular Phase: High Insulin Sensitivity & HIIT" },
      { time: "12:45", title: "Ovulatory Phase: The Peak Testosterone Window" },
      { time: "19:30", title: "Luteal Phase: Caloric Increases & Walking Workouts" },
      { time: "25:10", title: "Menstrual Phase: Active Rest & Phase Planning" },
    ],
    takeaways: [
      "Your resting metabolic rate rises by 100-300 kcal during the luteal phase",
      "Weight lifting during the follicular phase yields 25% higher muscle protein synthesis",
      "Over-exercising during the late luteal phase spikes cortisol and drives PMS cravings",
    ],
  },
  {
    id: "vid-2",
    title: "Pelvic Floor Down-Training for Pain-Free Cycles & Birth Preparation",
    category: "Birth",
    instructor: "Dr. Maya Sen, OB/GYN & Pelvic Physical Therapist",
    instructorTitle: "Pelvic Health Surgeon & Rehabilitation Fellow",
    durationMinutes: 34,
    thumbnailGradient: "from-emerald-500/20 via-teal-500/20 to-primary/10",
    videoUrl: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260813_115057_94c3699b-0fd1-4124-bcf3-3626bb8c1f77.mp4",
    embedUrl: "https://www.youtube-nocookie.com/embed/8Uc398hnc24",
    description: "Most women hold excessive tension in the levator ani and obturator internus. Learn diaphragmatic release, reverse Kegels, and physiological pelvic opening.",
    chapters: [
      { time: "00:00", title: "The Hypertonic Pelvic Floor Epidemic" },
      { time: "06:20", title: "Anatomy of the 3 Pelvic Layers" },
      { time: "14:10", title: "Diaphragm-Pelvic Diaphragm Piston Mechanics" },
      { time: "22:00", title: "Child's Pose & Butterfly Pelvic Release Drills" },
      { time: "29:40", title: "Labor Crown Opening vs Supine Pushing" },
    ],
    takeaways: [
      "Period cramps and painful intercourse are frequently driven by chronic pelvic floor spasm",
      "Diaphragmatic inhalation gently lengthens the pelvic floor like an umbrella opening",
      "Upright and sidelying positions widen the pelvic outlet by up to 28% compared to lying flat on your back",
    ],
  },
  {
    id: "vid-3",
    title: "Demystifying Perimenopause: Hormonal Swings, Sleep & HRT",
    category: "Perimenopause",
    instructor: "Dr. Clara Chen, MD",
    instructorTitle: "Midlife Health & Preventive Cardiology Lead",
    durationMinutes: 42,
    thumbnailGradient: "from-amber-500/20 via-orange-500/20 to-primary/10",
    videoUrl: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260813_115057_94c3699b-0fd1-4124-bcf3-3626bb8c1f77.mp4",
    embedUrl: "https://www.youtube-nocookie.com/embed/sTNP3w3ExxA",
    description: "An evidence-based lecture addressing early 40s hormone volatility, why progesterone plunges before estrogen, and modern transdermal therapy guidelines.",
    chapters: [
      { time: "00:00", title: "Why Perimenopause is Not Just Estrogen Deficiency" },
      { time: "08:15", title: "The Brain-Ovary Axis & Vasomotor Hot Flashes" },
      { time: "17:30", title: "Why You Wake Up at 3 AM: The GABA & Progesterone Link" },
      { time: "27:45", title: "Transdermal Estradiol & Micronized Progesterone Safety" },
      { time: "37:10", title: "Top 5 Lab Tests to Request at Your Annual Exam" },
    ],
    takeaways: [
      "Early perimenopause is characterized by wild estrogen surges with lack of ovulatory progesterone",
      "Night sweats represent hypothalamic thermal control resetting, not 'weak willpower'",
      "Micronized progesterone taken at bedtime directly converts to allopregnanolone, restoring restorative delta sleep",
    ],
  },
  {
    id: "vid-4",
    title: "Teen Period 101: What Actually Happens During Your First Year",
    category: "Teen",
    instructor: "Dr. Aaliyah Brooks, MD",
    instructorTitle: "Adolescent Medicine Specialist",
    durationMinutes: 18,
    thumbnailGradient: "from-pink-500/20 via-rose-500/20 to-primary/10",
    videoUrl: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260813_115057_94c3699b-0fd1-4124-bcf3-3626bb8c1f77.mp4",
    embedUrl: "https://www.youtube-nocookie.com/embed/-SPRPkLoKp8",
    description: "A fun, friendly, and empowering visual walk-through of the female reproductive system designed especially for teenage girls and first-period experiences.",
    chapters: [
      { time: "00:00", title: "Welcome to Your Body: Meet Your Uterus & Ovaries" },
      { time: "03:45", title: "Why Does It Bleed? The Cozy Nest Analogy" },
      { time: "08:20", title: "Why Your First Few Cycles Might Be Irregular" },
      { time: "12:10", title: "How to Use Pads & Period Underwear with Confidence" },
      { time: "15:40", title: "What to Do If You Get Your Period at School" },
    ],
    takeaways: [
      "It is 100% normal for your period to be irregular during the first 2-3 years as your brain and ovaries sync up",
      "The total blood loss is usually just 2 to 3 tablespoons across 4-6 days",
      "Carrying a discreet emergency pouch in your backpack turns surprises into no big deal",
    ],
  },
  {
    id: "vid-5",
    title: "Conscious Preconception: Egg Quality & Mitochondrial Nutrition",
    category: "Fertility",
    instructor: "Dr. Elena Rostova, MD",
    instructorTitle: "Reproductive Endocrinologist",
    durationMinutes: 39,
    thumbnailGradient: "from-violet-500/20 via-primary/20 to-rose-500/10",
    videoUrl: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260813_115057_94c3699b-0fd1-4124-bcf3-3626bb8c1f77.mp4",
    embedUrl: "https://www.youtube-nocookie.com/embed/P27waC05Hdk",
    description: "Deep dive into the 90-day biological window where primordial oocytes mature into the ovulatory follicle. Discover how cellular antioxidants optimize egg DNA integrity.",
    chapters: [
      { time: "00:00", title: "The 90-Day Preconception Runway" },
      { time: "07:30", title: "Why Human Oocytes Have 100x More Mitochondria" },
      { time: "16:20", title: "Ubiquinol CoQ10, Myo-Inositol & Methylfolate Clinical Trials" },
      { time: "26:10", title: "Cervical Mucus Tracking: Identifying Peak Ferning" },
      { time: "34:00", title: "Partner Preconception: Semen Analysis Beyond Sperm Count" },
    ],
    takeaways: [
      "Human egg cells possess up to 200,000 mitochondria, requiring intense cellular antioxidant support",
      "Ubiquinol supplementation has been clinically shown to support spindle integrity in women over 32",
      "Cervical mucus with high water content creates micro-channels that protect sperm survival for up to 5 days",
    ],
  },
  {
    id: "vid-6",
    title: "Physiological Labor: Oxytocin Hormonal Cascades & Birth Environment",
    category: "Birth",
    instructor: "Maya Jenkins, CNM & Doula Lead",
    instructorTitle: "Certified Nurse-Midwife",
    durationMinutes: 31,
    thumbnailGradient: "from-amber-500/20 via-rose-500/20 to-teal-500/10",
    videoUrl: "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260813_115057_94c3699b-0fd1-4124-bcf3-3626bb8c1f77.mp4",
    embedUrl: "https://www.youtube-nocookie.com/embed/F_ssj7-8rYg",
    description: "Understand the primal physiology of labor. Learn how to protect the neocortex, keep oxytocin flowing, and overcome adrenaline stalls in a clinical environment.",
    chapters: [
      { time: "00:00", title: "The Shifting Brain in Labor: Quieting the Neocortex" },
      { time: "06:15", title: "The Antagonist: How Adrenaline Halts Contractions" },
      { time: "13:40", title: "Creating a Sensory Sanctuary in Hospital Rooms" },
      { time: "21:10", title: "Rhythmic Vocalization & Low Vowel Sounds" },
      { time: "27:00", title: "Partner Touch Protocols: Hip Squeezes & Sacral Pressure" },
    ],
    takeaways: [
      "Oxytocin requires feelings of privacy, darkness, and warmth to reach peak pulsatility",
      "Low guttural humming and deep sighs relax the pelvic floor by relaxing the vocal cords (throat-pelvis connection)",
      "Continuous supportive doula presence reduces cesarean rates by up to 39%",
    ],
  },
];

/* =========================================================================
   GUIDED AUDIO SESSIONS DATA
   ========================================================================= */

const AUDIO_SESSIONS: AudioSession[] = [
  {
    id: "aud-1",
    title: "Luteal Phase Vagal Reset & Endocrine Soothing",
    category: "Cycle",
    durationMinutes: 12,
    narrator: "Alisa Morgan, MS",
    purpose: "Cortisol reduction & nervous system down-regulation",
    description: "4-7-8 rhythmic breathwork specifically tuned to ease late-luteal irritability, lower resting heart rate, and stimulate vagus nerve calming signals.",
    ambientVibe: "Warm acoustic meditation chimes & slow rhythmic breathing",
    spokenScript:
      "Welcome to your Luteal Phase Vagal Reset. Settle into a restful posture. Drop your shoulders away from your ears, and release your lower jaw. Take a slow, gentle breath in through your nose for a count of four... hold softly... and exhale smoothly through your mouth for eight. With each breath, feel your vagus nerve communicating deep safety to your heart, liver, and adrenals. You are grounded, safe, and completely supported.",
  },
  {
    id: "aud-2",
    title: "Hypnobirthing Uterine Wave & Surge Visualization",
    category: "Birth",
    durationMinutes: 18,
    narrator: "Maya Thorne, Doula",
    purpose: "Labor surge relaxation & oxytocin enhancement",
    description: "A calming guided journey reframing contractions as powerful loving waves opening your baby's doorway into the world. Ideal for late pregnancy and active labor.",
    ambientVibe: "Gentle Tibetan singing bell & rhythmic heartbeat cadence",
    spokenScript:
      "Take a deep, releasing breath. With each uterine wave, remember your body is softening, yielding, and opening. Contractions are not pain to fear, but powerful muscular waves bringing your baby into your arms. Relax your hands, soften your eyelids, and let the wave peak and gently recede like calm water.",
  },
  {
    id: "aud-3",
    title: "Perimenopause Cooling Sleep & 3 AM Bedtime Resonant",
    category: "Perimenopause",
    durationMinutes: 24,
    narrator: "Dr. Clara Chen, MD",
    purpose: "Thermoregulatory cooling & delta-wave sleep induction",
    description: "Progressive body temperature cooling visualization designed to shut down racing midlife thoughts, lower nocturnal adrenaline, and guide you back into restorative sleep.",
    ambientVibe: "Serene night chimes & gentle progressive relaxation tones",
    spokenScript:
      "Allow your core body temperature to cool. Progressive relaxation through your forehead, temples, and neck. Letting go of midnight wakefulness. Drifting peacefully into deep, restorative delta-wave sleep.",
  },
  {
    id: "aud-4",
    title: "First Period Calm: Soothing Cramps & Gentle Breaths",
    category: "Teen",
    durationMinutes: 10,
    narrator: "Dr. Aaliyah Brooks, MD",
    purpose: "Menstrual cramp comfort & teenage anxiety relief",
    description: "A warm, comforting voice walking you through relaxing your lower belly, releasing school stress, and reminding you how capable and strong your body is.",
    ambientVibe: "Comforting acoustic chimes & soft meadow calm",
    spokenScript:
      "Take a gentle, slow breath down into your lower belly. Notice the warmth soothing your muscles and releasing cramp tension. Your body is doing something completely natural, powerful, and healthy. You are safe, strong, and capable.",
  },
  {
    id: "aud-5",
    title: "Conscious Implantation Yoga Nidra & Womb Resting",
    category: "Fertility",
    durationMinutes: 20,
    narrator: "Elena Rostova & Sarah Jenkins",
    purpose: "Pelvic perfusion & post-ovulation peace",
    description: "Deep restorative body-scan yoga nidra to direct soothing warmth and arterial circulation to the pelvic basin during the two-week wait.",
    ambientVibe: "Warm harmonic chimes & restorative silence",
    spokenScript:
      "Directing soft golden warmth and circulation down to your pelvic basin and womb. Restful cellular energy supporting delicate follicular recovery, peaceful implantation, and hormonal harmony.",
  },
  {
    id: "aud-6",
    title: "Second Trimester Connection: Breathwork with Your Baby",
    category: "Pregnancy",
    durationMinutes: 15,
    narrator: "Sarah Jenkins, CNM",
    purpose: "Maternal-fetal bonding & diaphragmatic expansion",
    description: "Gentle prenatal diaphragmatic breathing to release ribcage tightness, deepen oxytocin connection, and calm maternal pulse.",
    ambientVibe: "Soothing acoustic harp & gentle stream cadence",
    spokenScript:
      "Breathing gently in rhythm with your growing baby. Creating spacious comfort in your ribcage and diaphragm. Celebrating the bond that grows stronger and deeper with every heartbeat.",
  },
];

/* =========================================================================
   ARTICLES DATA (Fertility, Pregnancy, Birth, Cycle, Perimenopause, Teen)
   ========================================================================= */

const LATEST_ARTICLES: LibraryArticle[] = [
  {
    id: "art-1",
    title: "The Infradian Rhythm: Why Your 28-Day Clock Dictates Energy, Focus & Sleep",
    category: "Cycle",
    topic: "Cycle Education",
    readMinutes: 7,
    publishedDate: "October 2026",
    author: "Dr. Elena Rostova, MD",
    authorTitle: "Reproductive Endocrinologist & Clinical Researcher",
    summary: "While men run on a 24-hour circadian cycle, women operate under a dual clock: circadian and infradian. Here is how aligning your workouts, creative sprints, and nutrition with your biological phases changes everything.",
    keyTakeaways: [
      "Follicular phase: Estrogen rising improves verbal fluency and insulin sensitivity.",
      "Ovulatory phase: Estrogen & testosterone peak, boosting sociability and high-intensity strength.",
      "Luteal phase: Progesterone dominates, raising basal metabolic rate by 100-300 kcal/day while slowing digestion.",
      "Menstrual phase: Both hormones rest at baseline; restorative rest allows inter-hemispheric brain communication.",
    ],
    content: [
      "Most productivity advice and dietary research throughout the twentieth century was conducted almost exclusively on male subjects to avoid the 'confounding variables' of menstrual fluctuations. This resulted in an entire generation of women attempting to operate as static 24-hour beings.",
      "The biological reality is that our metabolic rate, cognitive strengths, emotional architecture, and recovery capacity change in a predictable rhythm across approximately 28 days.",
      "During the luteal phase (post-ovulation), progesterone triggers a rise in resting body temperature and basal metabolic rate. Caloric restriction during this window triggers elevated cortisol, sleep disruption, and intense sugar cravings. Honoring your increased caloric need with complex carbohydrates prevents the classic luteal crash.",
    ],
  },
  {
    id: "art-fertility",
    title: "Optimizing the 90-Day Preconception Window: Follicular Maturation & Mitochondrial Vitality",
    category: "Fertility",
    topic: "Fertility Education",
    readMinutes: 8,
    publishedDate: "October 2026",
    author: "Dr. Elena Rostova, MD",
    authorTitle: "Reproductive Endocrinologist",
    summary: "Human oocytes mature over approximately 90 to 120 days before ovulation. Discover the science of cellular energy, coenzyme Q10, myo-inositol, and cervical mucus biomarkers.",
    keyTakeaways: [
      "The egg you ovulate this month began its recruitment phase over 3 months ago.",
      "Mitochondrial ATP production in the oocyte directly drives chromosomal spindle separation.",
      "Cervical fluid consistency correlates with follicular estrogen surges, signaling peak fertility.",
      "Both partners contribute equally to blastocyst genetics and placental vascularization.",
    ],
    content: [
      "When people think of fertility, they often think exclusively of the few days preceding ovulation. In reproductive biology, however, folliculogenesis is an extended process. The primordial follicle passes through secondary and antral stages across nearly 100 days.",
      "During this time, the surrounding granulosa cells provide nutrients and ATP. Supplementation with bioactive ubiquinol, myo-inositol, and methylated folate during this preparatory runway has been shown to support healthy oocyte morphology.",
      "Learning to track cervical fluid changes from sticky to creamy, and finally to clear, stretchy 'egg-white' consistency provides a free, real-time biological indicator of estrogen peak without expensive electronic monitors.",
    ],
  },
  {
    id: "art-pregnancy",
    title: "The Maternal Brain & Matrescence: Structural Neuroplasticity from Conception to Postpartum",
    category: "Pregnancy",
    topic: "Pregnancy Education",
    readMinutes: 9,
    publishedDate: "September 2026",
    author: "Dr. Sophia Vance, PhD",
    authorTitle: "Perinatal Neurobiologist",
    summary: "Pregnancy triggers structural remodeling in the maternal default mode network that facilitates infant attachment and emotional attunement. Understanding matrescence as a biological transformation.",
    keyTakeaways: [
      "Pregnancy prompts significant gray matter volume remodeling in empathy and threat-detection circuits.",
      "These neural changes endure for over 6 years, establishing long-term parental instincts.",
      "So-called 'pregnancy brain' is actually a highly specialized neuroplastic adaptation prioritizing infant survival.",
      "Nutritional choline and DHA provide essential phospholipid building blocks during third-trimester brain shifts.",
    ],
    content: [
      "The term 'matrescence,' coined by anthropologist Dana Raphael, describes the profound physical, psychological, and emotional metamorphosis of becoming a mother. It is as seismic a biological shift as adolescence.",
      "Recent longitudinal MRI research demonstrates that pregnant women experience coordinated reductions in gray matter volume within the social cognition network. Far from being a cognitive deficit, this synaptic pruning fine-tunes maternal responsiveness to infant facial cues and cries.",
      "Understanding these biological transformations empowers expectant mothers to replace guilt with compassion during the monumental transition into parenthood.",
    ],
  },
  {
    id: "art-birth",
    title: "Pelvic Biomechanics & Physiological Labor: How Movement Opens the 3 Pelvic Planes",
    category: "Birth",
    topic: "Birth Education",
    readMinutes: 10,
    publishedDate: "September 2026",
    author: "Maya Jenkins, CNM & Doula Lead",
    authorTitle: "Certified Nurse-Midwife & Perinatal Educator",
    summary: "The human pelvis is not a rigid bowl, but dynamic joints that shift with posture. Discover how maternal movement and upright positions reduce labor duration and pain.",
    keyTakeaways: [
      "The pelvic inlet, midpelvis, and outlet each open with different leg and hip angles.",
      "Internal rotation of the knees opens the pelvic outlet during crowning; external rotation closes it.",
      "Supine lithotomy (lying on your back) compresses the sacrum and narrows the birth canal by up to 30%.",
      "Using the BRAIN framework empowers informed collaborative decisions with hospital teams.",
    ],
    content: [
      "For decades, hospital labor protocols placed laboring women flat on their backs with feet in stirrups — a position convenient for the attending clinician, but mechanically unfavorable for the mother and baby.",
      "The maternal pelvis consists of three flexible joints: two sacroiliac joints and the pubic symphysis. Under the influence of the hormone relaxin, these joints allow the pelvis to flex, expand, and rock.",
      "When the fetal head is descending through the pelvic outlet, internal rotation of the knees (knees in, heels out) opens the ischial tuberosities by up to two additional centimeters. Movement is nature's pain relief and nature's labor accelerator.",
    ],
  },
  {
    id: "art-perimenopause",
    title: "Perimenopause in Your 30s & 40s: What the Medical System Often Misses",
    category: "Perimenopause",
    topic: "Perimenopause Education",
    readMinutes: 8,
    publishedDate: "August 2026",
    author: "Dr. Clara Chen, MD",
    authorTitle: "Midlife Health & Preventive Cardiology",
    summary: "Perimenopause can begin 7-10 years before the final menstrual period. Learn about erratic estrogen spikes, progesterone drops, cardiovascular protection, and modern bio-identical HRT.",
    keyTakeaways: [
      "Perimenopause is characterized by wild estrogen surges rather than early deficiency.",
      "Night sweats, uncharacteristic anxiety, brain fog, and histamine intolerance are classic early indicators.",
      "Estrogen receptors exist in nearly every female tissue, including brain astrocytes and vascular endothelium.",
      "Transdermal micronized progesterone and 17β-estradiol carry distinct safety profiles compared to older synthetic progestins.",
    ],
    content: [
      "The conventional myth depicts perimenopause as a gradual, quiet decline of estrogen. In reality, early perimenopause is a hormonal rollercoaster where progesterone drops first due to anovulatory cycles, leaving estrogen unopposed.",
      "This state of relative estrogen dominance causes breast tenderness, heavy periods, mood shifts, and sleep disturbance. Arming yourself with objective tracking data is the strongest foundation for proactive midlife care.",
      "By understanding your symptoms and tracking cycle changes on the STRAW+10 timeline, you can partner with your physician to implement tailored lifestyle adaptations and discuss transdermal therapies before symptoms disrupt your quality of life.",
    ],
  },
  {
    id: "art-teen",
    title: "First Period Survival Guide: Normalizing Menarche, Cramps & School Confidence",
    category: "Teen",
    topic: "Teen Support",
    readMinutes: 6,
    publishedDate: "August 2026",
    author: "Dr. Aaliyah Brooks, MD",
    authorTitle: "Adolescent Medicine Specialist",
    summary: "A warm, judgment-free guide to puberty, what a first period really looks like, how to handle cramps with natural comfort, and how to pack a school emergency kit.",
    keyTakeaways: [
      "First periods rarely begin with heavy gushing; brownish spotting is completely normal.",
      "During the first 2-3 years, menstrual cycles naturally vary between 21 and 45 days.",
      "Period underwear and modern pads give you leak-free security through long school classes.",
      "A warm heat patch, chamomile tea, and deep belly breaths soothe cramp prostaglandins fast.",
    ],
    content: [
      "Getting your first period (doctors call it 'menarche') is a major milestone that signals your body is growing up. But movies and rumors often make it seem terrifying or embarrassing. It doesn't have to be!",
      "Most girls get their first period between ages 10 and 15, usually about two years after breast buds first appear and a few months after noticing clear or white discharge in their underwear.",
      "The total amount of fluid lost across an entire period is only about 2 to 3 tablespoons. Remembering this fact can relieve a lot of anxiety about bleeding through clothing. Keeping a discreet zipper pouch in your backpack with pads, clean wipes, and spare underwear ensures you are always in control.",
    ],
  },
];

/* =========================================================================
   CURATED RESEARCH PAPERS DATA
   ========================================================================= */

const CURATED_PAPERS: ResearchPaper[] = [
  {
    id: "p1",
    title: "The Infradian Rhythm and Female Metabolic Dynamics: Cyclical Adaptations in Insulin Sensitivity",
    authors: "E. Sterling, M. Al-Mansoor, C. Dupont",
    journal: "The Lancet Endocrinology & Diabetes",
    year: "2025",
    doi: "10.1016/S2213-8587(24)00392-1",
    abstractText: "This landmark multi-center cohort investigation tracked 4,200 women across 12 reproductive cycles to quantify cyclical variations in resting metabolic rate (RMR), insulin sensitivity, and substrate oxidation between the early follicular and mid-luteal phases. The findings reveal a clinically significant 8-11% increase in RMR during the luteal phase, accompanied by transient physiologic insulin resistance.",
    citedByCount: 42,
    isOpenAccess: true,
    topic: "Endocrinology",
  },
  {
    id: "p2",
    title: "MicroRNA Profiling for Non-Invasive Early Detection of Endometriosis: A Multi-Center Clinical Validation",
    authors: "S. Tanaka, H. Chen, V. Rostova, K. Lindqvist",
    journal: "Nature Medicine",
    year: "2024",
    doi: "10.1038/s41591-024-03110-8",
    abstractText: "Endometriosis diagnostic delays average 7.5 to 9 years globally due to reliance on surgical laparoscopy. In this multi-center prospective trial of 1,840 symptomatic women, a serum 6-microRNA biomarker panel achieved 94.2% diagnostic accuracy (95% CI 91.8-96.1%) across both peritoneal and deep infiltrating stages.",
    citedByCount: 88,
    isOpenAccess: true,
    topic: "Gynecology & Biomarkers",
  },
  {
    id: "p3",
    title: "Neuroplasticity Across Matrescence: Longitudinal Brain Structural Remodeling from Conception Through Two Years Postpartum",
    authors: "L. Hoekzema, R. Barba-Müller, C. Pozzobon",
    journal: "Nature Neuroscience",
    year: "2024",
    doi: "10.1038/s41593-024-01684-2",
    abstractText: "Human pregnancy involves profound neurobiological adaptations that prepare the maternal brain for infant caregiving. High-resolution magnetic resonance imaging revealed symmetric gray matter volume reductions in the default mode network that correlate with maternal-infant attachment bonding strength and endure for over six years postpartum.",
    citedByCount: 156,
    isOpenAccess: true,
    topic: "Neurobiology & Maternal Health",
  },
  {
    id: "p4",
    title: "Personalized Chronobiology in Polycystic Ovary Syndrome: Circadian Disruption as a Key Driver of Hyperandrogenemia",
    authors: "A. Patel, D. Zimmerman, F. Bellini",
    journal: "Endocrine Reviews",
    year: "2025",
    doi: "10.1210/endrev/bnae014",
    abstractText: "A comprehensive systemic review and mechanistic model identifying circadian rhythm misalignment in peripheral ovarian and adrenal tissues as a causative amplifier of LH pulsatility and adrenal androgen synthesis in PCOS phenotypes A and B.",
    citedByCount: 31,
    isOpenAccess: false,
    topic: "PCOS & Metabolism",
  },
  {
    id: "p5",
    title: "Perimenopause Hormone Dynamics and Central Nervous System Symptoms: Therapeutic Windows of Vulnerability",
    authors: "K. Morrison, B. J. Caan, R. A. Lobo",
    journal: "The New England Journal of Medicine",
    year: "2024",
    doi: "10.1056/NEJMra2309811",
    abstractText: "Evaluation of neurologic, thermoregulatory, and mood alterations during the perimenopausal transition. Evidence indicates that estrogen receptor signaling in hypothalamic and hippocampal circuits experiences erratic neuro-steroid swings rather than linear decline, defining a critical therapeutic window for transdermal estradiol intervention.",
    citedByCount: 112,
    isOpenAccess: true,
    topic: "Perimenopause & Longevity",
  },
  {
    id: "p6",
    title: "The Estrobolome: Gut Microbiome Modulation of Estrogen Homeostasis and Implications for Female Autoimmune Predominance",
    authors: "J. M. Baker, L. Al-Nakkash, M. M. Herbst-Kralovetz",
    journal: "Cell Host & Microbe",
    year: "2025",
    doi: "10.1016/j.chom.2025.01.008",
    abstractText: "Bacterial beta-glucuronidase deconjugates estrogen in the gastrointestinal tract, enabling its reabsorption into systemic circulation. This paper illustrates how dysbiosis in the estrobolome contributes to hyper-estrogenic conditions and the pronounced 8:1 female skew in systemic lupus and Hashimoto's thyroiditis.",
    citedByCount: 64,
    isOpenAccess: true,
    topic: "Microbiome & Immunology",
  },
];

const SEARCH_SUGGESTIONS = [
  "Fertility oocyte mitochondria",
  "Pregnancy neuroplasticity",
  "Physiological birth pelvic biomechanics",
  "Infradian rhythm metabolism",
  "Perimenopause estrogen swings",
  "Teen menarche cycle variation",
  "Endometriosis biomarkers",
  "PCOS insulin resistance",
];

/* =========================================================================
   MEDITATION SOUND & VOCAL HARMONY ENGINE FOR GUIDED AUDIO SANCTUARY
   ========================================================================= */

class MeditationSoundEngine {
  private ctx: AudioContext | null = null;

  private initCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Rings an acoustic Tibetan singing bowl tone at 528 Hz (Solfeggio resonant love & repair)
   * with natural harmonic overtones. Naturally decays over 3.2 seconds to pure silence.
   * Never generates continuous buzzing or unceasing drones.
   */
  playChime(volume = 80) {
    try {
      const ctx = this.initCtx();
      if (!ctx) return;
      const now = ctx.currentTime;
      const baseGain = Math.max(0.001, (volume / 100) * 0.14);

      const chimeGain = ctx.createGain();
      chimeGain.gain.setValueAtTime(0.0001, now);
      chimeGain.gain.linearRampToValueAtTime(baseGain, now + 0.04);
      // Soft exponential decay to silence over 3.2s
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);
      chimeGain.connect(ctx.destination);

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(880, now);
      filter.connect(chimeGain);

      // 528 Hz fundamental
      const osc1 = ctx.createOscillator();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(528, now);

      // 792 Hz gentle fifth harmonic overtone
      const osc2 = ctx.createOscillator();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(792, now);

      const overtoneGain = ctx.createGain();
      overtoneGain.gain.setValueAtTime(0.3, now);
      osc2.connect(overtoneGain);
      overtoneGain.connect(filter);
      osc1.connect(filter);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 3.3);
      osc2.stop(now + 3.3);
    } catch {
      // Audio autoplay policy handled gracefully
    }
  }

  stop() {
    try {
      if (this.ctx && this.ctx.state === "running") {
        this.ctx.suspend().catch(() => {});
      }
    } catch {}
  }
}

const meditationSoundEngine = new MeditationSoundEngine();

function getMeditationVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(
    (v) =>
      v.lang.startsWith("en") &&
      (v.name.includes("Natural") ||
        v.name.includes("Female") ||
        v.name.includes("Zira") ||
        v.name.includes("Samantha") ||
        v.name.includes("Victoria") ||
        v.name.includes("Google"))
  );
  return preferred || voices.find((v) => v.lang.startsWith("en")) || voices[0] || null;
}

/* =========================================================================
   MAIN COMPONENT
   ========================================================================= */

function Library() {
  const [activeTab, setActiveTab] = useState<string>("courses");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Selection modals
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [courseModalTab, setCourseModalTab] = useState<"studio" | "syllabus">("studio");
  const [activeModuleIndex, setActiveModuleIndex] = useState<number>(0);
  const [moduleMediaMode, setModuleMediaMode] = useState<"video" | "audio" | "notes">("video");
  const [isSpeakingLecture, setIsSpeakingLecture] = useState(false);
  const [lectureAudioProgress, setLectureAudioProgress] = useState(0);
  const [lecturePlaybackSpeed, setLecturePlaybackSpeed] = useState<number>(1.0);

  // Video masterclass state
  const [selectedVideo, setSelectedVideo] = useState<VideoWorkshop | null>(null);
  const [videoMode, setVideoMode] = useState<"player" | "embed">("embed");
  const [streamUrlWithTime, setStreamUrlWithTime] = useState("");
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [selectedArticle, setSelectedArticle] = useState<LibraryArticle | null>(null);
  const [selectedPaper, setSelectedPaper] = useState<ResearchPaper | null>(null);

  // Interactive Course Learning Studio with robust localStorage persistence
  const [completedModules, setCompletedModules] = useState<Record<string, number[]>>(() => {
    try {
      const saved = localStorage.getItem("herspace_course_progress_v2");
      if (saved) return JSON.parse(saved);
      const v1 = localStorage.getItem("herspace_completed_modules_v1");
      if (v1) return JSON.parse(v1);
      return {};
    } catch {
      return {};
    }
  });

  // Audio sanctuary player state
  const [activeAudio, setActiveAudio] = useState<AudioSession | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioVolume, setAudioVolume] = useState(80);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [showSpokenScript, setShowSpokenScript] = useState(false);

  // Bookmarking with localStorage persistence
  const [savedIds, setSavedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("herspace_library_saved_v1");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Live scientific search state
  const [liveQuery, setLiveQuery] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [livePapers, setLivePapers] = useState<ResearchPaper[]>([]);
  const [isSearchingLive, setIsSearchingLive] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Persist bookmarks
  useEffect(() => {
    try {
      localStorage.setItem("herspace_library_saved_v1", JSON.stringify(Array.from(savedIds)));
    } catch {}
  }, [savedIds]);

  // Persist completed course modules
  useEffect(() => {
    try {
      localStorage.setItem("herspace_course_progress_v2", JSON.stringify(completedModules));
    } catch {}
  }, [completedModules]);

  // Spoken voice narration + gentle singing bowl bell loop
  useEffect(() => {
    let chimeInterval: NodeJS.Timeout | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;

    if (isPlayingAudio && activeAudio) {
      // Play a soft singing bowl chime at beginning
      meditationSoundEngine.playChime(isAudioMuted ? 0 : audioVolume);

      // Recurring gentle bell every 22 seconds (soothing interval with natural decay to silence)
      chimeInterval = setInterval(() => {
        meditationSoundEngine.playChime(isAudioMuted ? 0 : audioVolume);
      }, 22000);

      // Spoken voice narration via native Web Speech Synthesis
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel(); // Stop any pending speech

        const utterance = new SpeechSynthesisUtterance(activeAudio.spokenScript);
        const voice = getMeditationVoice();
        if (voice) utterance.voice = voice;
        utterance.rate = 0.86 * playbackSpeed;
        utterance.pitch = 1.0;
        utterance.volume = isAudioMuted ? 0 : audioVolume / 100;

        utterance.onboundary = (e) => {
          if (activeAudio.spokenScript.length > 0) {
            const pct = Math.min(99, Math.round((e.charIndex / activeAudio.spokenScript.length) * 100));
            setAudioProgress(pct);
          }
        };

        utterance.onend = () => {
          setIsPlayingAudio(false);
          setAudioProgress(100);
          meditationSoundEngine.playChime(isAudioMuted ? 0 : audioVolume);
          toast.success(`Completed session: ${activeAudio.title}`);
        };

        utterance.onerror = () => {
          // Fallback timer if speech synthesis is blocked
        };

        window.speechSynthesis.speak(utterance);
      } else {
        // Fallback progress tick if browser doesn't have speech synthesis
        fallbackInterval = setInterval(() => {
          setAudioProgress((prev) => {
            if (prev >= 100) {
              setIsPlayingAudio(false);
              toast.success(`Completed session: ${activeAudio.title}`);
              return 100;
            }
            return prev + 1;
          });
        }, 1000);
      }
    } else {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      meditationSoundEngine.stop();
    }

    return () => {
      if (chimeInterval) clearInterval(chimeInterval);
      if (fallbackInterval) clearInterval(fallbackInterval);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      meditationSoundEngine.stop();
    };
  }, [isPlayingAudio, activeAudio, playbackSpeed]);

  const toggleBookmark = (id: string, title: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast.info("Removed from saved library list");
      } else {
        next.add(id);
        toast.success(`Saved: ${title.slice(0, 36)}…`);
      }
      return next;
    });
  };

  const copyDoi = (doi: string, id: string) => {
    navigator.clipboard.writeText(`https://doi.org/${doi}`);
    setCopiedId(id);
    toast.success("DOI link copied to clipboard");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleLiveSearch = async (queryToRun: string) => {
    const q = queryToRun.trim();
    if (!q) return;
    setSearchedQuery(q);
    setIsSearchingLive(true);
    setSearchError(null);
    setActiveTab("search");

    try {
      const encoded = encodeURIComponent(`${q} AND (women OR female OR gynecology OR hormones OR reproductive OR maternal)`);
      const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encoded}&format=json&pageSize=12&resultType=core`;
      
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("Search service temporarily unreachable");
      const json = await res.json();
      const results = json.resultList?.result ?? [];

      const parsed: ResearchPaper[] = results.map((r: any) => ({
        id: r.id || r.pmid || r.doi || Math.random().toString(),
        title: r.title ? r.title.replace(/\.$/, "") : "Scientific Study",
        authors: r.authorString || "Research Consortium",
        journal: r.journalTitle || r.journalInfo?.journal?.title || "Peer-Reviewed Journal",
        year: r.pubYear || (r.firstPublicationDate ? r.firstPublicationDate.slice(0, 4) : "Recent"),
        doi: r.doi,
        pmid: r.pmid,
        abstractText: r.abstractText ? r.abstractText.replace(/<[^>]+>/g, "") : "Abstract preview available in primary repository.",
        citedByCount: r.citedByCount ?? 0,
        isOpenAccess: r.isOpenAccess === "Y",
        topic: q,
      }));

      setLivePapers(parsed);
      if (parsed.length === 0) {
        toast.info("No research papers found for this exact term. Showing curated literature.");
      } else {
        toast.success(`Retrieved ${parsed.length} peer-reviewed research papers`);
      }
    } catch (err: any) {
      setSearchError(err?.message || "Failed to fetch live research papers");
      toast.error("Live Europe PMC service unavailable. Showing curated medical repository.");
    } finally {
      setIsSearchingLive(false);
    }
  };

  const playAudioTrack = (session: AudioSession) => {
    if (activeAudio?.id === session.id) {
      if (isPlayingAudio) {
        setIsPlayingAudio(false);
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.pause();
        }
      } else {
        setIsPlayingAudio(true);
        if (typeof window !== "undefined" && "speechSynthesis" in window && window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }
    } else {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setActiveAudio(session);
      setIsPlayingAudio(true);
      setAudioProgress(0);
      toast.success(`Playing guided soundscape: ${session.title}`);
    }
  };

  const toggleModuleCompletion = (courseId: string, moduleNum: number) => {
    setCompletedModules((prev) => {
      const current = prev[courseId] || [];
      const updated = current.includes(moduleNum)
        ? current.filter((m) => m !== moduleNum)
        : [...current, moduleNum];
      const next = { ...prev, [courseId]: updated };
      try {
        localStorage.setItem("herspace_course_progress_v2", JSON.stringify(next));
      } catch {}
      return next;
    });
    toast.success(`Module ${moduleNum} progress recorded & saved!`);
  };

  const getCourseVideoEmbed = (category: string) => {
    switch (category) {
      case "Fertility":
        return "https://www.youtube-nocookie.com/embed/ayzN5f3qN8g";
      case "Pregnancy":
        return "https://www.youtube-nocookie.com/embed/8Uc398hnc24";
      case "Birth":
        return "https://www.youtube-nocookie.com/embed/8Uc398hnc24";
      case "Cycle":
        return "https://www.youtube-nocookie.com/embed/ayzN5f3qN8g";
      case "Perimenopause":
        return "https://www.youtube-nocookie.com/embed/sTNP3w3ExxA";
      case "Teen":
        return "https://www.youtube-nocookie.com/embed/zHkE_z9BffQ";
      default:
        return "https://www.youtube-nocookie.com/embed/ayzN5f3qN8g";
    }
  };

  const toggleLectureAudio = (course: Course, module: CourseModule) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("Speech synthesis is not supported in this browser.");
      return;
    }

    if (isSpeakingLecture) {
      window.speechSynthesis.cancel();
      setIsSpeakingLecture(false);
      return;
    }

    window.speechSynthesis.cancel();
    const lectureScript = `${course.title}. Module ${module.number}: ${module.title}. Presented by ${course.instructor}. ${module.description}. In this lesson, we examine core competencies including: ${module.topics.join(". ")}. Practice this guidance in your daily cycle observations and discuss any diagnostic questions with your healthcare provider.`;

    const utterance = new SpeechSynthesisUtterance(lectureScript);
    const voice = getMeditationVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = 0.9 * lecturePlaybackSpeed;

    utterance.onboundary = (e) => {
      if (lectureScript.length > 0) {
        setLectureAudioProgress(Math.min(99, Math.round((e.charIndex / lectureScript.length) * 100)));
      }
    };

    utterance.onend = () => {
      setIsSpeakingLecture(false);
      setLectureAudioProgress(100);
      toast.success(`Completed lecture narration: ${module.title}`);
    };

    utterance.onerror = () => {
      setIsSpeakingLecture(false);
    };

    setIsSpeakingLecture(true);
    setLectureAudioProgress(10);
    window.speechSynthesis.speak(utterance);
    toast.info(`Now narrating: ${module.title}`);
  };

  const handleDownloadPdfGuide = (course: Course, module: CourseModule) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to download and print the PDF handbook.");
      return;
    }

    const topicsHtml = module.topics.map((t) => `<li style="margin-bottom: 8px;"><strong>•</strong> ${t}</li>`).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${course.title} - Module ${module.number} Clinical Handbook</title>
          <style>
            @page { size: A4; margin: 16mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.6; padding: 24px; max-width: 820px; margin: 0 auto; background: #fff; }
            .header { border-bottom: 2px solid #e11d48; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
            .logo { font-size: 22px; font-weight: 700; color: #e11d48; letter-spacing: -0.02em; }
            .sublogo { font-size: 11px; color: #64748b; margin-top: 2px; }
            .badge { background: #ffe4e6; color: #be123c; font-size: 11px; font-weight: 600; padding: 4px 12px; border-radius: 9999px; }
            h1 { font-size: 22px; color: #0f172a; margin: 0 0 6px 0; font-family: Georgia, serif; }
            .instructor { font-size: 13px; color: #64748b; margin-bottom: 20px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 16px; }
            .card-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #e11d48; margin-top: 0; margin-bottom: 8px; letter-spacing: 0.05em; }
            ul { margin: 8px 0; padding-left: 18px; }
            .protocol-step { padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 12.5px; }
            .protocol-step:last-child { border-bottom: none; }
            .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">HerSpace Clinical Academy</div>
              <div class="sublogo">Evidence-Based Women's Life-Stage Academy &amp; Biomedical Research</div>
            </div>
            <span class="badge">Module ${module.number} · Duration: ${module.duration}</span>
          </div>

          <h1>${course.title}</h1>
          <div class="instructor">Instructor: <strong>${course.instructor}</strong> (${course.instructorTitle}) · Category: ${course.category}</div>

          <div class="card">
            <div class="card-title">Lesson Overview &amp; Curriculum Focus</div>
            <p style="margin: 0; font-size: 13.5px; color: #334155;">${module.description}</p>
          </div>

          <div class="card">
            <div class="card-title">Core Clinical Competencies &amp; Biological Targets</div>
            <ul style="font-size: 13px; color: #334155;">${topicsHtml}</ul>
          </div>

          <div class="card">
            <div class="card-title">Clinical Study Notes &amp; Action Plan</div>
            <div class="protocol-step"><strong>1. Biomarker &amp; Phase Mapping:</strong> Record and observe key physiological indicators daily using the HerSpace tracker.</div>
            <div class="protocol-step"><strong>2. Targeted Nutrition &amp; Cellular Support:</strong> Support mitochondrial respiration, metabolic stability, and endocrine signaling.</div>
            <div class="protocol-step"><strong>3. Clinical Consultation Checklist:</strong> Bring observed trends and questions to your OB/GYN, midwife, or endocrinologist.</div>
          </div>

          <div class="footer">
            <span>HerSpace Sovereign Platform · Evidence-Based Women's Education</span>
            <span>Use browser "Save as PDF" to download offline</span>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 400);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    toast.success(`Generated printable PDF handbook for Module ${module.number}`);
  };

  // Filtered datasets with unified search and life-stage category filtering
  const qLower = searchQuery.toLowerCase().trim();

  const filteredCourses = useMemo(() => {
    return COURSES_DATA.filter((c) => {
      const matchesCat = selectedCategory === "All" || c.category === selectedCategory;
      const matchesSearch =
        !qLower ||
        c.title.toLowerCase().includes(qLower) ||
        c.tagline.toLowerCase().includes(qLower) ||
        c.overview.toLowerCase().includes(qLower) ||
        c.category.toLowerCase().includes(qLower) ||
        c.instructor.toLowerCase().includes(qLower) ||
        c.modules.some((m) => m.title.toLowerCase().includes(qLower));
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, qLower]);

  const filteredArticles = useMemo(() => {
    return LATEST_ARTICLES.filter((a) => {
      const matchesCat = selectedCategory === "All" || a.category === selectedCategory;
      const matchesSearch =
        !qLower ||
        a.title.toLowerCase().includes(qLower) ||
        a.summary.toLowerCase().includes(qLower) ||
        a.topic.toLowerCase().includes(qLower) ||
        a.author.toLowerCase().includes(qLower) ||
        a.keyTakeaways.some((t) => t.toLowerCase().includes(qLower));
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, qLower]);

  const filteredVideos = useMemo(() => {
    return VIDEOS_DATA.filter((v) => {
      const matchesCat = selectedCategory === "All" || v.category === selectedCategory;
      const matchesSearch =
        !qLower ||
        v.title.toLowerCase().includes(qLower) ||
        v.description.toLowerCase().includes(qLower) ||
        v.category.toLowerCase().includes(qLower) ||
        v.instructor.toLowerCase().includes(qLower) ||
        v.takeaways.some((t) => t.toLowerCase().includes(qLower));
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, qLower]);

  const filteredAudio = useMemo(() => {
    return AUDIO_SESSIONS.filter((a) => {
      const matchesCat = selectedCategory === "All" || a.category === selectedCategory;
      const matchesSearch =
        !qLower ||
        a.title.toLowerCase().includes(qLower) ||
        a.description.toLowerCase().includes(qLower) ||
        a.purpose.toLowerCase().includes(qLower) ||
        a.category.toLowerCase().includes(qLower) ||
        a.narrator.toLowerCase().includes(qLower);
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, qLower]);

  const filteredCuratedPapers = useMemo(() => {
    return CURATED_PAPERS.filter((p) => {
      const matchesSearch =
        !qLower ||
        p.title.toLowerCase().includes(qLower) ||
        p.abstractText?.toLowerCase().includes(qLower) ||
        p.topic?.toLowerCase().includes(qLower) ||
        p.journal.toLowerCase().includes(qLower) ||
        p.authors.toLowerCase().includes(qLower);
      return matchesSearch;
    });
  }, [qLower]);

  // Saved articles and papers
  const savedArticles = useMemo(() => {
    return LATEST_ARTICLES.filter((a) => savedIds.has(a.id));
  }, [savedIds]);

  const savedPapers = useMemo(() => {
    return CURATED_PAPERS.filter((p) => savedIds.has(p.id));
  }, [savedIds]);

  const totalSavedCount = savedArticles.length + savedPapers.length;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-28 sm:pb-20">
      {/* Header Sanctuary */}
      <header className="relative rounded-3xl bg-card/90 border border-border/80 p-5 sm:p-7 md:p-8 backdrop-blur-md shadow-xs overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">
            Educational Academy &amp; Scientific Research
          </p>
        </div>
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-serif italic text-foreground tracking-tight">
          Women&apos;s Knowledge &amp; Life-Stage Academy
        </h1>
        <p className="text-muted-foreground mt-2 max-w-3xl text-xs sm:text-sm md:text-base leading-relaxed font-light">
          A multi-format educational sanctuary covering <strong className="font-medium text-foreground">Fertility, Pregnancy, Physiological Birth, Cycle Science, Perimenopause</strong>, and <strong className="font-medium text-foreground">Teen First-Period Support</strong>.
          Explore expert courses, clinical masterclasses, guided audio, and peer-reviewed biomedical research.
        </p>

        {/* Unified Search & Biomedical Search Hub */}
        <div className="mt-6 pt-6 border-t border-border/60 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              <Input
                placeholder="Search across all courses, clinical articles, workshops, audio & research..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 pr-10 h-12 rounded-full bg-background/85 border-border/80 text-foreground placeholder:text-muted-foreground/75 shadow-xs text-xs sm:text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-secondary/80"
                  aria-label="Clear search query"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <Button
              type="button"
              onClick={() => {
                const term = searchQuery.trim() || "women reproductive endocrinology";
                handleLiveSearch(term);
              }}
              disabled={isSearchingLive}
              className="rounded-full h-12 px-6 bg-primary text-primary-foreground hover:brightness-105 shadow-sm font-medium shrink-0 text-xs sm:text-sm"
            >
              {isSearchingLive ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Searching Europe PMC…
                </>
              ) : (
                <>
                  <Microscope className="w-4 h-4 mr-2" /> Live PubMed Search
                </>
              )}
            </Button>
          </div>

          {/* Quick Search Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-muted-foreground font-medium mr-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary" /> Popular Topics:
            </span>
            {SEARCH_SUGGESTIONS.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => {
                  setSearchQuery(topic);
                  toast.info(`Filtering for "${topic}"`);
                }}
                className={`text-[11px] sm:text-xs px-2.5 py-1 rounded-full transition-all duration-200 border ${
                  searchQuery.toLowerCase() === topic.toLowerCase()
                    ? "bg-primary text-primary-foreground border-primary font-medium"
                    : "bg-secondary/50 text-foreground hover:bg-primary/10 hover:text-primary border-border/60"
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Tabs Navigation & Life-Stage Filter */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col gap-4">
          {/* Tabs bar */}
          <div className="overflow-x-auto -mx-1 px-1 pb-1 scrollbar-none">
            <TabsList className="flex h-auto p-1.5 gap-1.5 bg-card/85 backdrop-blur-md border border-border/70 rounded-full w-max min-w-full sm:min-w-0">
              <TabsTrigger
                id="tab-courses"
                value="courses"
                className="rounded-full px-3.5 sm:px-4 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all gap-1.5 cursor-pointer shrink-0"
              >
                <GraduationCap className="w-3.5 h-3.5" /> Expert Courses ({filteredCourses.length})
              </TabsTrigger>
              <TabsTrigger
                id="tab-articles"
                value="articles"
                className="rounded-full px-3.5 sm:px-4 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all gap-1.5 cursor-pointer shrink-0"
              >
                <BookOpen className="w-3.5 h-3.5" /> Articles ({filteredArticles.length})
              </TabsTrigger>
              <TabsTrigger
                id="tab-videos"
                value="videos"
                className="rounded-full px-3.5 sm:px-4 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all gap-1.5 cursor-pointer shrink-0"
              >
                <Video className="w-3.5 h-3.5" /> Video Masterclasses ({filteredVideos.length})
              </TabsTrigger>
              <TabsTrigger
                id="tab-audio"
                value="audio"
                className="rounded-full px-3.5 sm:px-4 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all gap-1.5 cursor-pointer shrink-0"
              >
                <Headphones className="w-3.5 h-3.5" /> Guided Audio ({filteredAudio.length})
              </TabsTrigger>
              <TabsTrigger
                id="tab-papers"
                value="papers"
                className="rounded-full px-3.5 sm:px-4 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all gap-1.5 cursor-pointer shrink-0"
              >
                <FileText className="w-3.5 h-3.5" /> Curated Research ({filteredCuratedPapers.length})
              </TabsTrigger>
              <TabsTrigger
                id="tab-saved"
                value="saved"
                className="rounded-full px-3.5 sm:px-4 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all gap-1.5 cursor-pointer shrink-0"
              >
                <Bookmark className="w-3.5 h-3.5" /> Saved Items ({totalSavedCount})
              </TabsTrigger>
              {searchedQuery && (
                <TabsTrigger
                  id="tab-search"
                  value="search"
                  className="rounded-full px-3.5 sm:px-4 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all gap-1.5 cursor-pointer shrink-0"
                >
                  <Search className="w-3.5 h-3.5" /> Live Search ({livePapers.length})
                </TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* Universal Life-Stage Category Filter Pills */}
          {activeTab !== "papers" && activeTab !== "search" && activeTab !== "saved" && (
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
                <span className="text-[11px] font-semibold text-muted-foreground mr-1 uppercase tracking-wider shrink-0">
                  Filter Stage:
                </span>
                {(["All", "Fertility", "Pregnancy", "Birth", "Cycle", "Perimenopause", "Teen"] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-xs px-3 py-1 rounded-full transition-all border shrink-0 ${
                      selectedCategory === cat
                        ? "bg-primary text-primary-foreground border-primary font-medium shadow-xs"
                        : "bg-card text-muted-foreground hover:text-foreground border-border/70"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {searchQuery && (
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span>Filtered by: <strong className="text-foreground font-medium">&ldquo;{searchQuery}&rdquo;</strong></span>
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-primary hover:underline text-[11px]"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* TAB 1: EXPERT-LED COURSES */}
        <TabsContent value="courses" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-serif italic text-foreground">
                Comprehensive Structured Academies
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Evidence-based multi-module curricula designed by reproductive endocrinologists, midwives, and clinicians.
              </p>
            </div>
            <Badge variant="outline" className="rounded-full text-xs bg-primary/10 text-primary border-primary/20">
              {filteredCourses.length} Courses
            </Badge>
          </div>

          {filteredCourses.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-card border border-border/70 space-y-3">
              <GraduationCap className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-foreground font-medium">No courses match your filter.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCategory("All");
                  setSearchQuery("");
                }}
                className="rounded-full text-xs"
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => {
                const completed = completedModules[course.id] || [];
                const percent = Math.round((completed.length / course.modules.length) * 100);
                return (
                  <Card
                    key={course.id}
                    className="group border border-border/70 hover:border-primary/40 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md bg-card/90"
                  >
                    <div>
                      <div className="h-2 w-full bg-gradient-to-r from-primary/60 via-amber-500/50 to-primary/80" />
                      <CardHeader className="p-5 pb-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <Badge variant="secondary" className="rounded-full text-[11px] font-medium bg-primary/10 text-primary border-0">
                            {course.badge}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {course.duration}
                          </span>
                        </div>
                        <CardTitle className="font-serif italic text-xl text-foreground group-hover:text-primary transition-colors leading-snug">
                          {course.title}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground font-light line-clamp-2 mt-1">
                          {course.tagline}
                        </p>
                      </CardHeader>

                      <CardContent className="p-5 pt-0 space-y-4">
                        <div className="p-3 rounded-2xl bg-secondary/40 border border-border/50 text-xs space-y-1.5">
                          <div className="flex items-center gap-1.5 text-foreground font-medium">
                            <User className="w-3.5 h-3.5 text-primary" /> {course.instructor}
                          </div>
                          <p className="text-[11px] text-muted-foreground pl-5">
                            {course.instructorTitle}
                          </p>
                        </div>

                        {completed.length > 0 && (
                          <div className="space-y-1.5 p-3 rounded-2xl bg-primary/5 border border-primary/20">
                            <div className="flex justify-between text-[11px]">
                              <span className="font-medium text-primary">Your Learning Progress</span>
                              <span className="font-mono text-primary font-semibold">{percent}%</span>
                            </div>
                            <Progress value={percent} className="h-1.5 bg-primary/15" />
                          </div>
                        )}

                        <div className="space-y-1.5">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Syllabus Highlights ({course.modules.length} Modules):
                          </p>
                          <ul className="space-y-1 text-xs text-foreground/80">
                            {course.modules.slice(0, 3).map((m) => (
                              <li key={m.number} className="flex items-center gap-2 truncate">
                                <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                                  completed.includes(m.number)
                                    ? "bg-emerald-500 text-white"
                                    : "bg-primary/15 text-primary"
                                }`}>
                                  {completed.includes(m.number) ? "✓" : m.number}
                                </span>
                                <span className="truncate">{m.title}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </div>

                    <div className="p-5 pt-0 border-t border-border/50 flex items-center justify-between gap-3 bg-secondary/15">
                      <span className="text-[11px] text-muted-foreground font-medium">
                        {course.lessonCount} Lessons · {course.level}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          id={`btn-open-course-${course.id}`}
                          type="button"
                          onClick={() => {
                            setSelectedCourse(course);
                            setCourseModalTab("studio");
                            const firstIncomplete = course.modules.findIndex((m) => !completed.includes(m.number));
                            setActiveModuleIndex(firstIncomplete >= 0 ? firstIncomplete : 0);
                          }}
                          size="sm"
                          className="rounded-full text-xs px-3.5 bg-primary text-primary-foreground hover:brightness-105"
                        >
                          {percent > 0 ? (
                            <>
                              Continue ({percent}%) <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </>
                          ) : (
                            <>
                              Start Course Studio <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </>
                          )}
                        </Button>
                        <Button
                          id={`btn-view-syllabus-${course.id}`}
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setSelectedCourse(course);
                            setCourseModalTab("syllabus");
                          }}
                          size="sm"
                          className="rounded-full text-xs px-2.5 border-border/80 hover:bg-secondary hidden sm:inline-flex"
                        >
                          Syllabus
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: ARTICLES */}
        <TabsContent value="articles" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-serif italic text-foreground">
                Clinical Knowledge &amp; Life-Stage Guides
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                In-depth articles spanning cycle synchronization, preconception biology, birth rights, and midlife endocrine care.
              </p>
            </div>
            <Badge variant="outline" className="rounded-full text-xs bg-primary/10 text-primary border-primary/20">
              {filteredArticles.length} Guides
            </Badge>
          </div>

          {filteredArticles.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-card border border-border/70 space-y-3">
              <BookOpen className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-foreground font-medium">No articles found matching criteria.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCategory("All");
                  setSearchQuery("");
                }}
                className="rounded-full text-xs"
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((article) => {
                const isSaved = savedIds.has(article.id);
                return (
                  <Card
                    key={article.id}
                    className="group border border-border/70 hover:border-primary/40 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md bg-card/90"
                  >
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <Badge variant="outline" className="rounded-full text-[10px] bg-primary/10 text-primary border-primary/20">
                          {article.topic}
                        </Badge>
                        <button
                          type="button"
                          onClick={() => toggleBookmark(article.id, article.title)}
                          className="text-muted-foreground hover:text-primary transition-colors p-1"
                          aria-label="Save article"
                        >
                          <Bookmark className={`w-4 h-4 ${isSaved ? "fill-primary text-primary" : ""}`} />
                        </button>
                      </div>
                      <CardTitle
                        onClick={() => setSelectedArticle(article)}
                        className="font-serif italic text-lg text-foreground group-hover:text-primary transition-colors cursor-pointer leading-snug line-clamp-2"
                      >
                        {article.title}
                      </CardTitle>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1">
                        <span>{article.author}</span>
                        <span>·</span>
                        <span>{article.readMinutes} min read</span>
                      </div>
                    </CardHeader>

                    <CardContent className="p-5 pt-0 space-y-3">
                      <p className="text-xs text-muted-foreground/90 font-light leading-relaxed line-clamp-3">
                        {article.summary}
                      </p>

                      <div className="pt-2 border-t border-border/50">
                        <Button
                          variant="ghost"
                          onClick={() => setSelectedArticle(article)}
                          size="sm"
                          className="w-full rounded-full text-xs text-primary hover:bg-primary/10 font-medium justify-between"
                        >
                          Read Full Clinical Guide <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 3: VIDEO MASTERCLASSES */}
        <TabsContent value="videos" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-serif italic text-foreground">
                Video Masterclasses &amp; Clinical Workshops
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                High-definition clinical workshops with time-stamped chapters, interactive scrubbers, and takeaway summaries.
              </p>
            </div>
            <Badge variant="outline" className="rounded-full text-xs bg-primary/10 text-primary border-primary/20">
              {filteredVideos.length} Workshops
            </Badge>
          </div>

          {filteredVideos.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-card border border-border/70 space-y-3">
              <Video className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-foreground font-medium">No video masterclasses found for this selection.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCategory("All");
                  setSearchQuery("");
                }}
                className="rounded-full text-xs"
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVideos.map((video) => (
                <Card
                  key={video.id}
                  className="group border border-border/70 hover:border-primary/40 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md bg-card/90"
                >
                  {/* Simulated Thumbnail */}
                  <div
                    onClick={() => {
                      setSelectedVideo(video);
                      setVideoMode("embed");
                      setStreamUrlWithTime("");
                      setIsVideoPlaying(true);
                    }}
                    className={`relative h-44 w-full bg-gradient-to-br ${video.thumbnailGradient} cursor-pointer flex items-center justify-center overflow-hidden border-b border-border/50 group-hover:brightness-105 transition-all`}
                  >
                    <div className="absolute inset-0 bg-black/25 backdrop-blur-[1px]" />
                    <div className="w-14 h-14 rounded-full bg-background/90 text-primary flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 fill-primary ml-0.5" />
                    </div>
                    <div className="absolute top-3 left-3">
                      <Badge variant="secondary" className="rounded-full text-[10px] bg-black/60 text-white backdrop-blur-md border-0">
                        {video.category}
                      </Badge>
                    </div>
                    <div className="absolute bottom-3 right-3">
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-black/70 text-white font-mono backdrop-blur-md">
                        {video.durationMinutes}:00
                      </span>
                    </div>
                  </div>

                  <CardHeader className="p-5 pb-2">
                    <CardTitle
                      onClick={() => {
                        setSelectedVideo(video);
                        setVideoMode("embed");
                        setStreamUrlWithTime("");
                        setIsVideoPlaying(true);
                      }}
                      className="font-serif italic text-lg text-foreground group-hover:text-primary transition-colors cursor-pointer leading-snug line-clamp-2"
                    >
                      {video.title}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground font-medium pt-0.5">
                      {video.instructor} · <span className="font-light">{video.instructorTitle}</span>
                    </p>
                  </CardHeader>

                  <CardContent className="p-5 pt-0 space-y-3">
                    <p className="text-xs text-muted-foreground/90 font-light line-clamp-2">
                      {video.description}
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <span className="text-[11px] text-muted-foreground">
                        {video.chapters.length} Interactive Chapters
                      </span>
                      <Button
                        type="button"
                        onClick={() => {
                          setSelectedVideo(video);
                          setVideoMode("embed");
                          setStreamUrlWithTime("");
                          setIsVideoPlaying(true);
                        }}
                        size="sm"
                        className="rounded-full text-xs px-4 bg-primary text-primary-foreground hover:brightness-105"
                      >
                        Watch Workshop
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 4: GUIDED AUDIO SESSIONS */}
        <TabsContent value="audio" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-serif italic text-foreground">
                Guided Audio Sanctuary &amp; Somatic Soundscapes
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Soothing audio tracks for cycle breathwork, hypnobirthing surges, teen cramp ease, and perimenopause delta sleep.
              </p>
            </div>
            <Badge variant="outline" className="rounded-full text-xs bg-primary/10 text-primary border-primary/20">
              {filteredAudio.length} Sessions
            </Badge>
          </div>

          {filteredAudio.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-card border border-border/70 space-y-3">
              <Headphones className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-sm text-foreground font-medium">No audio sessions match this stage or keyword.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCategory("All");
                  setSearchQuery("");
                }}
                className="rounded-full text-xs"
              >
                Clear Filter
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAudio.map((session) => {
                const isCurrentlyPlaying = activeAudio?.id === session.id && isPlayingAudio;
                return (
                  <Card
                    key={session.id}
                    className={`group border transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md bg-card/90 ${
                      activeAudio?.id === session.id ? "border-primary ring-1 ring-primary/30" : "border-border/70 hover:border-primary/40"
                    }`}
                  >
                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <Badge variant="outline" className="rounded-full text-[10px] bg-primary/10 text-primary border-primary/20">
                          {session.category}
                        </Badge>
                        <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {session.durationMinutes} min
                        </span>
                      </div>
                      <CardTitle className="font-serif italic text-lg text-foreground leading-snug">
                        {session.title}
                      </CardTitle>
                      <p className="text-xs text-primary font-medium mt-0.5">
                        Focus: {session.purpose}
                      </p>
                    </CardHeader>

                    <CardContent className="p-5 pt-0 space-y-4">
                      <p className="text-xs text-muted-foreground font-light leading-relaxed">
                        {session.description}
                      </p>

                      <div className="p-2.5 rounded-xl bg-secondary/30 text-[11px] text-muted-foreground flex items-center gap-2">
                        <Headphones className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">{session.ambientVibe}</span>
                      </div>

                      <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-muted-foreground">Voice: {session.narrator}</span>
                        <Button
                          type="button"
                          onClick={() => playAudioTrack(session)}
                          size="sm"
                          className={`rounded-full text-xs px-4 transition-all ${
                            isCurrentlyPlaying
                              ? "bg-amber-600 hover:bg-amber-700 text-white"
                              : "bg-primary text-primary-foreground hover:brightness-105"
                          }`}
                        >
                          {isCurrentlyPlaying ? (
                            <>
                              <Pause className="w-3.5 h-3.5 mr-1" /> Pause
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 mr-1 fill-current" /> Play Session
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 5: CURATED LANDMARK PAPERS */}
        <TabsContent value="papers" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-serif italic text-foreground">
                Peer-Reviewed Clinical Literature
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Curated landmark studies on endocrinology, microRNA biomarkers, matrescence neuroplasticity, and chronobiology.
              </p>
            </div>
            <Badge variant="outline" className="rounded-full text-xs bg-primary/10 text-primary border-primary/20">
              {filteredCuratedPapers.length} Papers
            </Badge>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredCuratedPapers.map((paper) => {
              const isSaved = savedIds.has(paper.id);
              return (
                <Card
                  key={paper.id}
                  className="group border border-border/70 hover:border-primary/40 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md bg-card/90"
                >
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Badge variant="outline" className="rounded-full text-[10px] bg-primary/10 text-primary border-primary/20">
                        {paper.topic}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => toggleBookmark(paper.id, paper.title)}
                        className="text-muted-foreground hover:text-primary transition-colors p-1"
                        aria-label="Save study"
                      >
                        <Bookmark className={`w-4 h-4 ${isSaved ? "fill-primary text-primary" : ""}`} />
                      </button>
                    </div>
                    <CardTitle
                      onClick={() => setSelectedPaper(paper)}
                      className="font-serif italic text-base sm:text-lg text-foreground group-hover:text-primary transition-colors cursor-pointer leading-snug line-clamp-3"
                    >
                      {paper.title}
                    </CardTitle>
                    <div className="text-[11px] text-muted-foreground font-light pt-1">
                      {paper.authors}
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 pt-0 space-y-3">
                    <p className="text-xs text-muted-foreground/90 font-light leading-relaxed line-clamp-3">
                      {paper.abstractText}
                    </p>

                    <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{paper.journal}</span>
                      <span>{paper.year}</span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => setSelectedPaper(paper)}
                        size="sm"
                        className="w-full rounded-full text-xs h-8 border-border/80 hover:bg-primary hover:text-primary-foreground transition-all"
                      >
                        Read Abstract
                      </Button>
                      {paper.doi && (
                        <Button
                          variant="ghost"
                          type="button"
                          onClick={() => copyDoi(paper.doi!, paper.id)}
                          size="sm"
                          className="rounded-full text-xs h-8 px-2.5 text-muted-foreground hover:text-primary"
                          title="Copy DOI link"
                        >
                          {copiedId === paper.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* TAB 6: SAVED BOOKMARKS HUB */}
        <TabsContent value="saved" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-serif italic text-foreground">
                Your Saved Reading &amp; Study List
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Saved guides, articles, and scientific studies available anytime across your sessions.
              </p>
            </div>
            <Badge variant="outline" className="rounded-full text-xs bg-primary/10 text-primary border-primary/20">
              {totalSavedCount} Saved Items
            </Badge>
          </div>

          {totalSavedCount === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-card border border-border/70 space-y-3 max-w-md mx-auto">
              <Bookmark className="w-10 h-10 text-muted-foreground mx-auto" />
              <h3 className="text-base font-serif italic text-foreground">No saved items yet</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Click the bookmark icon on any clinical article or research paper across the Academy to curate your personal reference library.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("articles")}
                className="rounded-full text-xs"
              >
                Browse Clinical Articles
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Saved Articles */}
              {savedArticles.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">
                    Saved Guides ({savedArticles.length})
                  </h3>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {savedArticles.map((article) => (
                      <Card
                        key={article.id}
                        className="border border-border/70 flex flex-col justify-between overflow-hidden shadow-xs bg-card/90"
                      >
                        <CardHeader className="p-5 pb-3">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <Badge variant="outline" className="rounded-full text-[10px] bg-primary/10 text-primary border-primary/20">
                              {article.topic}
                            </Badge>
                            <button
                              type="button"
                              onClick={() => toggleBookmark(article.id, article.title)}
                              className="text-primary hover:opacity-80 transition-opacity p-1"
                              aria-label="Remove from saved"
                            >
                              <Bookmark className="w-4 h-4 fill-primary" />
                            </button>
                          </div>
                          <CardTitle
                            onClick={() => setSelectedArticle(article)}
                            className="font-serif italic text-base sm:text-lg text-foreground hover:text-primary transition-colors cursor-pointer leading-snug line-clamp-2"
                          >
                            {article.title}
                          </CardTitle>
                          <p className="text-[11px] text-muted-foreground pt-1">
                            {article.author} · {article.readMinutes} min read
                          </p>
                        </CardHeader>
                        <CardContent className="p-5 pt-0">
                          <Button
                            variant="ghost"
                            onClick={() => setSelectedArticle(article)}
                            size="sm"
                            className="w-full rounded-full text-xs text-primary hover:bg-primary/10 font-medium justify-between p-0 h-auto py-2"
                          >
                            Read Full Guide <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Saved Papers */}
              {savedPapers.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">
                    Saved Research Studies ({savedPapers.length})
                  </h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {savedPapers.map((paper) => (
                      <Card
                        key={paper.id}
                        className="border border-border/70 flex flex-col justify-between overflow-hidden shadow-xs bg-card/90"
                      >
                        <CardHeader className="p-5 pb-3">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <Badge variant="outline" className="rounded-full text-[10px] bg-primary/10 text-primary border-primary/20">
                              {paper.topic}
                            </Badge>
                            <button
                              type="button"
                              onClick={() => toggleBookmark(paper.id, paper.title)}
                              className="text-primary hover:opacity-80 transition-opacity p-1"
                              aria-label="Remove from saved"
                            >
                              <Bookmark className="w-4 h-4 fill-primary" />
                            </button>
                          </div>
                          <CardTitle
                            onClick={() => setSelectedPaper(paper)}
                            className="font-serif italic text-base text-foreground hover:text-primary transition-colors cursor-pointer leading-snug line-clamp-3"
                          >
                            {paper.title}
                          </CardTitle>
                          <p className="text-[11px] text-muted-foreground pt-1">{paper.journal} ({paper.year})</p>
                        </CardHeader>
                        <CardContent className="p-5 pt-0">
                          <Button
                            variant="outline"
                            onClick={() => setSelectedPaper(paper)}
                            size="sm"
                            className="w-full rounded-full text-xs h-8"
                          >
                            Read Abstract
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* TAB 7: LIVE BIOMEDICAL RESULTS */}
        {searchedQuery && (
          <TabsContent value="search" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif italic text-xl text-foreground">
                  Live Results for &ldquo;{searchedQuery}&rdquo;
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Direct from Europe PMC open-science biomedical repository.
                </p>
              </div>
              <Badge variant="outline" className="rounded-full text-xs bg-primary/10 text-primary border-primary/20">
                {livePapers.length} Studies Retrieved
              </Badge>
            </div>

            {livePapers.length === 0 ? (
              <div className="p-12 text-center rounded-3xl bg-card border border-border/70 space-y-3">
                <Microscope className="w-10 h-10 text-muted-foreground mx-auto" />
                <p className="text-sm text-foreground font-medium">No live studies returned for this exact query.</p>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  Try searching broader terms like &ldquo;Estradiol&rdquo;, &ldquo;Infradian rhythm&rdquo;, &ldquo;Luteal phase&rdquo;, or &ldquo;Perimenopause&rdquo;.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("papers")}
                  className="rounded-full text-xs"
                >
                  View Curated Literature
                </Button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {livePapers.map((paper) => {
                  const isSaved = savedIds.has(paper.id);
                  return (
                    <Card
                      key={paper.id}
                      className="group border border-border/70 hover:border-primary/40 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md bg-card/90"
                    >
                      <CardHeader className="p-5 pb-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <Badge variant="outline" className="rounded-full text-[10px] bg-primary/10 text-primary border-primary/20">
                            {paper.year}
                          </Badge>
                          <button
                            type="button"
                            onClick={() => toggleBookmark(paper.id, paper.title)}
                            className="text-muted-foreground hover:text-primary transition-colors p-1"
                          >
                            <Bookmark className={`w-4 h-4 ${isSaved ? "fill-primary text-primary" : ""}`} />
                          </button>
                        </div>
                        <CardTitle
                          onClick={() => setSelectedPaper(paper)}
                          className="font-serif italic text-base sm:text-lg text-foreground group-hover:text-primary transition-colors cursor-pointer leading-snug line-clamp-3"
                        >
                          {paper.title}
                        </CardTitle>
                        <div className="text-[11px] text-muted-foreground font-light pt-1">
                          {paper.authors}
                        </div>
                      </CardHeader>

                      <CardContent className="p-5 pt-0 space-y-3">
                        <p className="text-xs text-muted-foreground/90 font-light leading-relaxed line-clamp-3">
                          {paper.abstractText}
                        </p>

                        <div className="pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                          <span className="font-medium text-foreground truncate max-w-[180px]">{paper.journal}</span>
                          {paper.isOpenAccess && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Open Access</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            variant="outline"
                            onClick={() => setSelectedPaper(paper)}
                            size="sm"
                            className="w-full rounded-full text-xs h-8 border-border/80 hover:bg-primary hover:text-primary-foreground transition-all"
                          >
                            Read Abstract
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* FLOATING ACTIVE AUDIO BAR WITH VOCAL NARRATION & TIBETAN CHIME */}
      {activeAudio && (
        <aside
          aria-label="Audio player"
          className="fixed bottom-24 md:bottom-4 left-3 right-3 sm:left-4 sm:right-4 max-w-4xl mx-auto z-40 rounded-3xl bg-card/95 border border-primary/40 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-5 duration-300 space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => playAudioTrack(activeAudio)}
                aria-label={isPlayingAudio ? "Pause audio session" : "Play audio session"}
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-md hover:brightness-105 transition-all cursor-pointer"
              >
                {isPlayingAudio ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5 fill-current" />}
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="rounded-full text-[9px] bg-primary/10 text-primary border-primary/20">
                    {activeAudio.category}
                  </Badge>
                  {isPlayingAudio ? (
                    <Badge className="rounded-full text-[9px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Guided Voice &amp; Chime Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="rounded-full text-[9px] text-amber-600 border-amber-500/30">
                      Paused
                    </Badge>
                  )}
                  <p className="text-xs font-semibold text-foreground truncate">{activeAudio.title}</p>
                </div>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  Narrated by {activeAudio.narrator} · {activeAudio.ambientVibe}
                </p>
              </div>
            </div>

            {/* Controls, Scrubber & Chime Triggers */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 justify-between sm:justify-end flex-wrap sm:flex-nowrap">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  meditationSoundEngine.playChime(audioVolume);
                  toast.success("Tibetan singing bowl chime sounded");
                }}
                className="rounded-full text-[11px] h-7 px-2.5 border-primary/30 text-primary hover:bg-primary/10 shrink-0"
              >
                <Sparkles className="w-3 h-3 mr-1" /> Chime Bell
              </Button>

              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowSpokenScript((prev) => !prev)}
                className="rounded-full text-[11px] h-7 px-2.5 text-muted-foreground hover:text-foreground shrink-0"
              >
                {showSpokenScript ? "Hide Script" : "Read Script"}
              </Button>

              <div className="w-32 sm:w-40 space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
                  <span>{Math.floor((audioProgress * activeAudio.durationMinutes * 60) / 100 / 60)}:00</span>
                  <span>{activeAudio.durationMinutes}:00 ({audioProgress}%)</span>
                </div>
                <Slider
                  value={[audioProgress]}
                  onValueChange={(val) => setAudioProgress(val[0])}
                  max={100}
                  step={1}
                  className="w-full cursor-pointer"
                  aria-label="Audio scrubber"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsAudioMuted(!isAudioMuted)}
                  className="p-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  aria-label={isAudioMuted ? "Unmute audio" : "Mute audio"}
                >
                  {isAudioMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const speeds = [0.8, 1.0, 1.25];
                    const next = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
                    setPlaybackSpeed(next);
                    toast.info(`Playback speed: ${next}x`);
                  }}
                  className="px-2 py-1 rounded-md text-[10px] font-mono bg-secondary hover:bg-secondary/80 text-foreground transition-colors cursor-pointer"
                  aria-label="Change playback speed"
                >
                  {playbackSpeed}x
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined" && "speechSynthesis" in window) {
                      window.speechSynthesis.cancel();
                    }
                    meditationSoundEngine.stop();
                    setActiveAudio(null);
                    setIsPlayingAudio(false);
                  }}
                  className="text-xs text-muted-foreground hover:text-rose-500 p-1 cursor-pointer"
                  aria-label="Close audio player"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>

          {/* Expandable Spoken Transcript Preview */}
          {showSpokenScript && (
            <div className="p-3 rounded-2xl bg-secondary/50 border border-border/60 text-xs animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-primary uppercase tracking-wider text-[10px]">
                  Spoken Meditation Guidance Script:
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  Voice Guide: {activeAudio.narrator}
                </span>
              </div>
              <p className="text-foreground/90 font-light leading-relaxed italic text-xs">
                &ldquo;{activeAudio.spokenScript}&rdquo;
              </p>
            </div>
          )}
        </aside>
      )}

      {/* UNIFIED COURSE ACADEMY & INTERACTIVE LEARNING STUDIO MODAL */}
      <Dialog open={!!selectedCourse} onOpenChange={(open) => {
        if (!open) {
          setSelectedCourse(null);
          if (typeof window !== "undefined" && "speechSynthesis" in window) {
            window.speechSynthesis.cancel();
          }
          setIsSpeakingLecture(false);
          setLectureAudioProgress(0);
        }
      }}>
        <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl bg-card border border-border/90 p-5 sm:p-7 md:p-8">
          {selectedCourse && (() => {
            const courseCompleted = completedModules[selectedCourse.id] || [];
            const currentModule = selectedCourse.modules[activeModuleIndex] || selectedCourse.modules[0];
            const isCurrentModuleComplete = courseCompleted.includes(currentModule.number);
            const progressPct = Math.round((courseCompleted.length / selectedCourse.modules.length) * 100);

            return (
              <div className="space-y-6">
                <DialogHeader>
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <div className="flex items-center gap-2">
                      <Badge className="rounded-full text-xs bg-primary/10 text-primary border-primary/20">
                        {selectedCourse.badge}
                      </Badge>
                      <Badge variant="outline" className="rounded-full text-xs border-border">
                        {selectedCourse.level}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5" /> {selectedCourse.duration}
                      </span>
                    </div>
                    <Badge variant="secondary" className="rounded-full text-xs font-mono font-semibold bg-primary/15 text-primary border-0">
                      {courseCompleted.length} of {selectedCourse.modules.length} Modules Done ({progressPct}%)
                    </Badge>
                  </div>
                  <DialogTitle className="font-serif italic text-2xl sm:text-3xl text-foreground leading-snug">
                    {selectedCourse.title}
                  </DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm text-muted-foreground pt-1">
                    Instructor: <strong className="text-foreground font-medium">{selectedCourse.instructor}</strong> ({selectedCourse.instructorTitle})
                  </DialogDescription>
                </DialogHeader>

                {/* Course Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground font-mono">
                    <span>Curriculum Progress</span>
                    <span className="text-primary font-semibold">{progressPct}% Complete</span>
                  </div>
                  <Progress value={progressPct} className="h-2.5 bg-secondary" />
                </div>

                {/* Academy Studio vs Syllabus Tab Switcher */}
                <div className="flex items-center gap-2 border-b border-border/60 pb-3">
                  <button
                    type="button"
                    onClick={() => setCourseModalTab("studio")}
                    className={`text-xs px-4 py-2 rounded-full font-medium transition-all cursor-pointer ${
                      courseModalTab === "studio"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    📖 Interactive Learning Studio
                  </button>
                  <button
                    type="button"
                    onClick={() => setCourseModalTab("syllabus")}
                    className={`text-xs px-4 py-2 rounded-full font-medium transition-all cursor-pointer ${
                      courseModalTab === "syllabus"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    📋 Full Syllabus &amp; Outcomes
                  </button>
                </div>

                {courseModalTab === "studio" ? (
                  <div className="space-y-6">
                    {/* Module Navigator Pills */}
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Select Lesson Module:
                      </p>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {selectedCourse.modules.map((m, idx) => {
                          const isDone = courseCompleted.includes(m.number);
                          const isActive = activeModuleIndex === idx;
                          return (
                            <button
                              key={m.number}
                              type="button"
                              onClick={() => {
                                setActiveModuleIndex(idx);
                                if (typeof window !== "undefined" && "speechSynthesis" in window) {
                                  window.speechSynthesis.cancel();
                                }
                                setIsSpeakingLecture(false);
                                setLectureAudioProgress(0);
                              }}
                              className={`text-xs px-3.5 py-1.5 rounded-full flex items-center gap-2 shrink-0 transition-all border cursor-pointer ${
                                isActive
                                  ? "bg-primary text-primary-foreground border-primary font-medium shadow-xs"
                                  : isDone
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                  : "bg-secondary text-muted-foreground hover:text-foreground border-border/60"
                              }`}
                            >
                              <span>{isDone ? "✓" : `Mod ${m.number}`}</span>
                              <span className="font-normal opacity-90 truncate max-w-[130px]">{m.title}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Active Module Studio Reader & Multi-Format Studio */}
                    <div className="p-5 sm:p-6 rounded-3xl bg-secondary/30 border border-border/70 space-y-5">
                      <div className="flex items-center justify-between gap-2 flex-wrap border-b border-border/50 pb-3">
                        <div>
                          <span className="text-[11px] font-mono uppercase tracking-wider text-primary font-medium">
                            Module {currentModule.number} of {selectedCourse.modules.length}
                          </span>
                          <h3 className="text-lg sm:text-xl font-serif italic text-foreground mt-0.5">
                            {currentModule.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground bg-card px-2.5 py-1 rounded-full border border-border/60">
                            Duration: {currentModule.duration}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            type="button"
                            onClick={() => handleDownloadPdfGuide(selectedCourse, currentModule)}
                            className="rounded-full text-xs h-7.5 border-primary/30 text-primary hover:bg-primary/10 cursor-pointer shadow-xs"
                            title="Generate and download printable PDF handbook"
                          >
                            <Download className="w-3.5 h-3.5 mr-1" /> PDF Handbook
                          </Button>
                        </div>
                      </div>

                      {/* Multi-Format Studio Modality Switcher */}
                      <div className="flex items-center justify-between gap-2 flex-wrap bg-card/80 p-1.5 rounded-2xl border border-border/70">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setModuleMediaMode("video")}
                            className={`text-xs px-3.5 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                              moduleMediaMode === "video"
                                ? "bg-primary text-primary-foreground shadow-xs"
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                            }`}
                          >
                            <Video className="w-3.5 h-3.5" /> Video Lecture
                          </button>
                          <button
                            type="button"
                            onClick={() => setModuleMediaMode("audio")}
                            className={`text-xs px-3.5 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                              moduleMediaMode === "audio"
                                ? "bg-primary text-primary-foreground shadow-xs"
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                            }`}
                          >
                            <Headphones className="w-3.5 h-3.5" /> Audio Lecture (Narration)
                          </button>
                          <button
                            type="button"
                            onClick={() => setModuleMediaMode("notes")}
                            className={`text-xs px-3.5 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                              moduleMediaMode === "notes"
                                ? "bg-primary text-primary-foreground shadow-xs"
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                            }`}
                          >
                            <FileText className="w-3.5 h-3.5" /> Study Guide &amp; Protocol
                          </button>
                        </div>

                        <span className="text-[11px] text-muted-foreground font-mono hidden sm:inline">
                          Select format to learn
                        </span>
                      </div>

                      {/* 1. VIDEO LECTURE EMBED */}
                      {moduleMediaMode === "video" && (
                        <div className="space-y-2 animate-in fade-in duration-200">
                          <div className="rounded-2xl overflow-hidden bg-black aspect-video relative shadow-2xl border border-border/60">
                            <iframe
                              src={getCourseVideoEmbed(selectedCourse.category)}
                              title={`${selectedCourse.title} - ${currentModule.title}`}
                              className="w-full h-full border-0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                          <p className="text-[11px] text-muted-foreground text-center font-light pt-1">
                            High-definition streaming clinical lecture for Module {currentModule.number}. Full interactive playback enabled.
                          </p>
                        </div>
                      )}

                      {/* 2. AUDIO LECTURE PLAYER */}
                      {moduleMediaMode === "audio" && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-primary/5 border border-primary/20 space-y-3.5 animate-in fade-in duration-200">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Headphones className="w-4 h-4 text-primary" />
                              <span className="text-xs font-semibold text-foreground">
                                Spoken Lecture: {currentModule.title}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-muted-foreground">
                              Narrated by Clinical Voice Engine · {currentModule.duration}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 bg-card p-3.5 rounded-xl border border-border/70">
                            <Button
                              size="sm"
                              type="button"
                              onClick={() => toggleLectureAudio(selectedCourse, currentModule)}
                              className="rounded-full w-9 h-9 p-0 bg-primary text-primary-foreground hover:brightness-105 shrink-0"
                            >
                              {isSpeakingLecture ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                            </Button>

                            <div className="flex-1 space-y-1">
                              <Progress value={lectureAudioProgress} className="h-2 rounded-full" />
                              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                                <span>{isSpeakingLecture ? "Narrating clinical lesson…" : "Paused"}</span>
                                <span>{lectureAudioProgress}% completed</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {[1.0, 1.25].map((speed) => (
                                <button
                                  key={speed}
                                  type="button"
                                  onClick={() => setLecturePlaybackSpeed(speed)}
                                  className={`text-[10px] px-2 py-0.5 rounded-full border transition-all ${
                                    lecturePlaybackSpeed === speed
                                      ? "bg-primary text-primary-foreground border-primary"
                                      : "border-border/70 text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  {speed}x
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="p-3.5 rounded-xl bg-card/60 border border-border/50 text-xs text-muted-foreground italic font-serif leading-relaxed">
                            &ldquo;{currentModule.description}&rdquo;
                          </div>
                        </div>
                      )}

                      {/* 3. CLINICAL STUDY GUIDE & PROTOCOL */}
                      <div className="space-y-3 pt-1">
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5" /> Module Clinical Overview &amp; Curriculum Notes:
                          </h4>
                          <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-light">
                            {currentModule.description}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Core Competencies Covered:
                          </h4>
                          <div className="grid sm:grid-cols-2 gap-2.5">
                            {currentModule.topics.map((t, idx) => (
                              <div key={idx} className="flex items-center gap-2.5 p-3 rounded-2xl bg-card border border-border/60 text-xs text-foreground">
                                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                                <span>{t}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Clinical Action Plan & Protocol Checklist */}
                        <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/60 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-primary uppercase text-[10px] tracking-wider">
                              Clinical Practice Protocol:
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDownloadPdfGuide(selectedCourse, currentModule)}
                              className="text-primary hover:underline text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                            >
                              <Download className="w-3 h-3" /> Save to PDF Handbook &rarr;
                            </button>
                          </div>
                          <p className="text-muted-foreground leading-relaxed text-[11px]">
                            Track physiological markers daily in your Health Journal. Review observations across cycle days to identify metabolic and hormonal trends.
                          </p>
                        </div>
                      </div>

                      {/* Interactive Completion Trigger */}
                      <div className="pt-4 border-t border-border/60 flex items-center justify-between gap-3 flex-wrap">
                        <Button
                          id="btn-toggle-module-complete"
                          type="button"
                          onClick={() => toggleModuleCompletion(selectedCourse.id, currentModule.number)}
                          variant={isCurrentModuleComplete ? "outline" : "default"}
                          className={`rounded-full text-xs px-5 cursor-pointer ${
                            isCurrentModuleComplete
                              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                              : "bg-primary text-primary-foreground hover:brightness-105"
                          }`}
                        >
                          {isCurrentModuleComplete ? (
                            <>
                              <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Module Completed (Click to Toggle)
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Module as Completed (+{Math.round(100 / selectedCourse.modules.length)}%)
                            </>
                          )}
                        </Button>

                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={activeModuleIndex === 0}
                            onClick={() => {
                              setActiveModuleIndex((prev) => Math.max(0, prev - 1));
                              if (typeof window !== "undefined" && "speechSynthesis" in window) {
                                window.speechSynthesis.cancel();
                              }
                              setIsSpeakingLecture(false);
                              setLectureAudioProgress(0);
                            }}
                            className="rounded-full text-xs cursor-pointer"
                          >
                            Previous Module
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={activeModuleIndex === selectedCourse.modules.length - 1}
                            onClick={() => {
                              setActiveModuleIndex((prev) => Math.min(selectedCourse.modules.length - 1, prev + 1));
                              if (typeof window !== "undefined" && "speechSynthesis" in window) {
                                window.speechSynthesis.cancel();
                              }
                              setIsSpeakingLecture(false);
                              setLectureAudioProgress(0);
                            }}
                            className="rounded-full text-xs cursor-pointer"
                          >
                            Next Module <ChevronRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Course Completion Banner */}
                    {progressPct === 100 && (
                      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-primary/10 to-amber-500/10 border border-emerald-500/30 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                          <Award className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">Course Curriculum Completed!</p>
                          <p className="text-xs text-muted-foreground">
                            You have successfully mastered all clinical modules in {selectedCourse.title}. Progress saved in your personal library record.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Syllabus Tab */
                  <div className="space-y-6">
                    {/* Instructor Bio Box */}
                    <div className="p-4 rounded-2xl bg-secondary/35 border border-border/60 flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                        {selectedCourse.instructor.slice(3, 5)}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{selectedCourse.instructor}</p>
                        <p className="text-[11px] text-muted-foreground">{selectedCourse.instructorTitle}</p>
                        <p className="text-xs text-foreground/80 mt-1 font-light leading-relaxed">
                          {selectedCourse.overview}
                        </p>
                      </div>
                    </div>

                    {/* Key Outcomes */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">
                        What You Will Master:
                      </h4>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {selectedCourse.outcomes.map((outcome, idx) => (
                          <div key={idx} className="flex items-start gap-2 p-2.5 rounded-xl bg-background/50 border border-border/50 text-xs text-foreground/90">
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                            <span>{outcome}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Complete Module Breakdown */}
                    <div className="space-y-3 pt-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">
                        Complete Course Syllabus ({selectedCourse.modules.length} Modules):
                      </h4>
                      <div className="space-y-3">
                        {selectedCourse.modules.map((m, idx) => {
                          const completed = courseCompleted.includes(m.number);
                          return (
                            <div key={m.number} className="p-4 rounded-2xl bg-card border border-border/70 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                                    completed ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground"
                                  }`}>
                                    {completed ? "✓" : m.number}
                                  </span>
                                  <p className="text-sm font-semibold text-foreground">{m.title}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono text-muted-foreground">{m.duration}</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setActiveModuleIndex(idx);
                                      setCourseModalTab("studio");
                                    }}
                                    className="text-xs h-7 text-primary hover:bg-primary/10 rounded-full"
                                  >
                                    Open Lesson
                                  </Button>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground font-light pl-8">
                                {m.description}
                              </p>
                              <div className="pl-8 flex flex-wrap gap-1.5 pt-1">
                                {m.topics.map((t, tidx) => (
                                  <span key={tidx} className="text-[10px] px-2.5 py-0.5 rounded-full bg-secondary text-foreground/80">
                                    • {t}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-border/60 flex items-center justify-end gap-3">
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setSelectedCourse(null)}
                    className="rounded-full text-xs"
                  >
                    Close Academy
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* VIDEO PLAYER & WORKSHOP MODAL WITH REAL HTML5 VIDEO & EMBED STREAM */}
      <Dialog open={!!selectedVideo} onOpenChange={(open) => {
        if (!open) {
          setSelectedVideo(null);
          setIsVideoPlaying(false);
          setStreamUrlWithTime("");
          if (videoRef.current) {
            videoRef.current.pause();
          }
        }
      }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-card border border-border/90 p-5 sm:p-7 md:p-8">
          {selectedVideo && (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <Badge variant="outline" className="w-fit rounded-full text-xs bg-primary/10 text-primary border-primary/20">
                    {selectedVideo.category} · Clinical Masterclass
                  </Badge>
                </div>

                <DialogTitle className="font-serif italic text-2xl text-foreground leading-snug">
                  {selectedVideo.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground pt-1">
                  Presented by {selectedVideo.instructor} ({selectedVideo.instructorTitle})
                </DialogDescription>
              </DialogHeader>

              {/* Video Player Container */}
              <div className="rounded-2xl overflow-hidden bg-black aspect-video relative flex flex-col justify-center items-center shadow-2xl border border-border/60">
                <iframe
                  src={streamUrlWithTime || selectedVideo.embedUrl}
                  title={selectedVideo.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>

              {/* Video Chapters with interactive seeking */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">
                    Interactive Chapters (Click to Jump Video):
                  </h4>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Duration: {selectedVideo.durationMinutes} min
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  {selectedVideo.chapters.map((ch, idx) => {
                    const chapterPct = (idx / selectedVideo.chapters.length) * 100;
                    const isActive = videoProgress >= chapterPct && (idx === selectedVideo.chapters.length - 1 || videoProgress < ((idx + 1) / selectedVideo.chapters.length) * 100);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          const parts = ch.time.split(":").map(Number);
                          const seconds = (parts[0] || 0) * 60 + (parts[1] || 0);
                          if (selectedVideo.embedUrl) {
                            const baseUrl = selectedVideo.embedUrl.split("?")[0];
                            setStreamUrlWithTime(`${baseUrl}?start=${seconds}&autoplay=1`);
                          }
                          setVideoProgress(chapterPct);
                          toast.info(`Jumped video to ${ch.time}: ${ch.title}`);
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all text-xs text-left cursor-pointer ${
                          isActive
                            ? "bg-primary/15 border-primary/40 text-primary font-medium shadow-xs"
                            : "bg-secondary/40 border-border/50 hover:bg-primary/10 hover:text-primary text-foreground/80"
                        }`}
                      >
                        <span className="truncate mr-2">{ch.title}</span>
                        <span className="font-mono text-muted-foreground text-[11px] shrink-0">{ch.time}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Takeaways */}
              <div className="p-4 rounded-2xl bg-secondary/35 border border-border/60 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Clinical Summary &amp; Key Takeaways
                </p>
                <ul className="space-y-1.5 text-xs text-foreground/90">
                  {selectedVideo.takeaways.map((t, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => {
                    setSelectedVideo(null);
                    setIsVideoPlaying(false);
                    setStreamUrlWithTime("");
                  }}
                  className="rounded-full text-xs"
                >
                  Close Video
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ARTICLE DETAIL MODAL */}
      <Dialog open={!!selectedArticle} onOpenChange={(open) => !open && setSelectedArticle(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-card border border-border/90 p-5 sm:p-7 md:p-8">
          {selectedArticle && (
            <div className="space-y-6">
              <DialogHeader>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Badge variant="outline" className="w-fit rounded-full text-[10px] bg-primary/10 text-primary border-primary/20">
                    {selectedArticle.topic} · {selectedArticle.readMinutes} min read
                  </Badge>
                  <button
                    type="button"
                    onClick={() => toggleBookmark(selectedArticle.id, selectedArticle.title)}
                    className="text-muted-foreground hover:text-primary transition-colors p-1"
                  >
                    <Bookmark className={`w-4 h-4 ${savedIds.has(selectedArticle.id) ? "fill-primary text-primary" : ""}`} />
                  </button>
                </div>
                <DialogTitle className="font-serif italic text-2xl sm:text-3xl text-foreground leading-snug">
                  {selectedArticle.title}
                </DialogTitle>
                <div className="text-xs text-muted-foreground pt-2 flex items-center gap-2">
                  <span className="font-semibold text-foreground">{selectedArticle.author}</span>
                  <span>·</span>
                  <span>{selectedArticle.authorTitle}</span>
                </div>
              </DialogHeader>

              <div className="rounded-2xl bg-secondary/35 border border-border/60 p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Clinical Summary
                </p>
                <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-light">
                  {selectedArticle.summary}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Key Takeaways
                </p>
                <ul className="space-y-2">
                  {selectedArticle.keyTakeaways.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-foreground/90">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-4 pt-2 border-t border-border/60">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Full Reading
                </p>
                {selectedArticle.content.map((paragraph, idx) => (
                  <p key={idx} className="text-xs sm:text-sm text-foreground/85 leading-relaxed font-light">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* PAPER DETAIL MODAL */}
      <Dialog open={!!selectedPaper} onOpenChange={(open) => !open && setSelectedPaper(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-card border border-border/90 p-5 sm:p-7 md:p-8">
          {selectedPaper && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="rounded-full text-[10px] bg-primary/10 text-primary border-primary/20">
                      {selectedPaper.journal} · {selectedPaper.year}
                    </Badge>
                    {selectedPaper.isOpenAccess && (
                      <Badge variant="outline" className="rounded-full text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        Open Access
                      </Badge>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleBookmark(selectedPaper.id, selectedPaper.title)}
                    className="text-muted-foreground hover:text-primary transition-colors p-1"
                  >
                    <Bookmark className={`w-4 h-4 ${savedIds.has(selectedPaper.id) ? "fill-primary text-primary" : ""}`} />
                  </button>
                </div>
                <DialogTitle className="font-serif italic text-2xl text-foreground leading-snug">
                  {selectedPaper.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-2">
                  Authors: <span className="text-foreground font-medium">{selectedPaper.authors}</span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Structured Clinical Abstract
                </h4>
                <div className="rounded-2xl bg-secondary/35 border border-border/60 p-4 text-xs sm:text-sm text-foreground/90 leading-relaxed font-light">
                  {selectedPaper.abstractText}
                </div>
              </div>

              {selectedPaper.doi && (
                <div className="rounded-2xl border border-border/70 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card/60">
                  <div className="text-xs">
                    <p className="font-semibold text-foreground">Digital Object Identifier (DOI)</p>
                    <p className="text-muted-foreground font-mono mt-0.5 truncate max-w-sm">
                      https://doi.org/{selectedPaper.doi}
                    </p>
                  </div>
                  <a
                    href={`https://doi.org/${selectedPaper.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground hover:brightness-105 text-xs font-medium transition-all shrink-0"
                  >
                    Open Full Paper <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}