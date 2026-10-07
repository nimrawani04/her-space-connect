# HerSpace Connect

> **A Sovereign, Evidence-Based Sanctuary for Women's Health, Life-Stage Education, Mental Wellness & Community**

HerSpace Connect is an integrated, privacy-first web platform engineered to support women across every phase of life — from adolescence and cycle synchronization to conscious conception, pregnancy, physiological birth, perimenopause, mental wellness, and personal safety.

---

## 🌸 Table of Contents

- [Core Modules & How They Work](#-core-modules--how-they-work)
  - [1. Women's Knowledge & Life-Stage Academy (`/library`)](#1-womens-knowledge--life-stage-academy-library)
  - [2. Mental Wellness Sanctuary & "Talk to Her" (`/wellness`)](#2-mental-wellness-sanctuary--talk-to-her-wellness)
  - [3. Health & Lifecycle Hubs (`/health`, `/pregnancy`)](#3-health--lifecycle-hubs-health-pregnancy)
  - [4. Community, Mentorship, Travel & Careers](#4-community-mentorship-travel--careers)
- [How Learning Content Works (Video, Audio & PDF Guides)](#-how-learning-content-works-video-audio--pdf-guides)
- [Tech Stack & Architecture](#-tech-stack--architecture)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Privacy & Sovereign Security](#-privacy--sovereign-security)
- [License](#-license)

---

## 📖 Core Modules & How They Work

### 1. Women's Knowledge & Life-Stage Academy (`/library`)
A multi-format scientific and educational academy covering Fertility, Pregnancy, Physiological Birth, Cycle Science, Perimenopause, and Teen First-Period Support:

- **🎓 Expert Courses**: Modular clinical courses led by reproductive endocrinologists, midwives, and pelvic specialists. Each module features:
  - **📹 Video Lecture Player**: High-definition embedded streaming lectures for clinical demonstrations.
  - **🎧 Audio Lecture (Narration)**: Spoken voice synthesis engine with play/pause, scrub progress bar, and speed controls (`1x`, `1.25x`) for hands-free listening.
  - **📖 Clinical Study Guide & Protocols**: Evidence-based curriculum notes, biological mechanisms, and action checklists.
  - **📥 Download / Print PDF Handbook**: Instant one-click generation of verified, printable clinical handbooks via browser print-to-PDF.
  - **Interactive Module Checklists**: Progress tracking persisted in local storage.
- **📖 Clinical Articles**: Peer-reviewed articles with summaries, read time, author credentials, and key medical takeaways.
- **🎥 Video Masterclasses**: Dedicated streaming video workshops with interactive chapter markers (click to jump to specific timestamps) and clinical summaries.
- **🎧 Guided Audio Sanctuary**: Therapeutic audio soundscapes and guided meditations powered by a custom harmonic singing bowl synthesizer engine and web speech narration.
- **🔬 Curated Biomedical Research & Live Search**: Direct integration with the **Europe PMC / PubMed REST API** to query real peer-reviewed scientific studies with direct DOI links.
- **🔖 Saved Library**: Persistent client-side bookmarking for offline review.

---

### 2. Mental Wellness Sanctuary & "Talk to Her" (`/wellness`)
A confidential, empathetic AI companion designed as a safe haven:

- **Zero-Trace Privacy**: Conversations are held solely within the session and never stored permanently unless explicitly exported to the personal Journal.
- **Discreet Quick Exit**: Instant one-click redirect to Google for physical privacy if someone approaches.
- **Mindful 4-7-8 Breathwork Anchor**: An animated expanding/contracting visual breathing circle (Inhale 4s, Hold 7s, Exhale 8s) for real-time nervous system regulation.
- **Voice Dictation with Real-Time Audio Visualizer**: 12-bar undulating audio frequency visualizer that pulses to live voice dictation.
- **Speech-to-Speech Voice Narration**: Soft audio playback button on assistant reflections using native browser speech synthesis.
- **Safety Triage & Emergency Detection**: Automatic screening for urgent clinical or domestic situations with discreet check-ins and direct helpline directories.
- **Healthcare & Subsidized Clinic Navigator**: Interactive care pathway locator for sliding-scale reproductive centers, public hospital OPDs, and doctor prep checklists.
- **Journal Sanctuary Bridge**: One-click transfer of prompts and companion reflections directly into the encrypted personal Journal Writer.

---

### 3. Health & Lifecycle Hubs (`/health`, `/pregnancy`)
- **Teen First-Period Hub**: Body literacy, cycle mechanics, anatomy demystification, and mother-daughter conversation guides.
- **Cycle Science & Infradian Rhythm**: Tracking the 4 menstrual phases (Follicular, Ovulatory, Luteal, Menstrual) with hormonal shifts, energy windows, and nutrition advice.
- **Conscious Conception**: 90-day follicular maturation window, cervical fluid tracking, and basal body temperature biphasic shifts.
- **Pregnancy Continuum**: Trimester-by-trimester embryogenesis, maternal hemodynamics, and midwife care.
- **Physiological Birth & Pelvic Biomechanics**: Pelvic stations (inlet, midpelvis, outlet), fetal positioning, and non-pharmacological comfort techniques.
- **Perimenopause & HRT Hub**: Hormone volatility, vasomotor hot flashes, sleep support, and transdermal therapy guidelines.

---

### 4. Community, Mentorship, Travel & Careers
- **Community Circles (`/community`)**: Safe, moderated sisterhood forums and peer discussion threads.
- **Safe Travel Hub (`/travel`)**: Verification tools, emergency SOS triggers, and vetted women-only stays.
- **Mentorship & Careers (`/mentorship`, `/careers`)**: Connecting women with career sponsors, leadership circles, and professional advice.

---

## 🎯 How Learning Content Works (Video, Audio & PDF Guides)

When you open any course in the **Knowledge Academy** (`/library`):

1. **Select Any Module**: Choose between the lesson modules (e.g., Module 1, Module 2).
2. **Choose Your Learning Modality**:
   - **Video Lecture**: Watch the high-definition streaming lecture or clinical demonstration.
   - **Audio Lecture (Narration)**: Click the play button to hear the lesson narrated aloud with real-time scrub tracking and speed controls.
   - **Study Guide & Protocol**: Read the deep-dive clinical curriculum notes, biological targets, and action steps.
3. **Download / Print PDF Handbook**:
   - Click the **"PDF Handbook"** button at the top right of any module or the **"Save to PDF Handbook"** link.
   - A verified, professionally styled A4 clinical document opens instantly in a print preview, allowing you to **Save as PDF** or print directly.

---

## 🛠️ Tech Stack & Architecture

- **Framework**: [TanStack Start](https://tanstack.com/start) & [React 19](https://react.dev/)
- **Routing**: [TanStack Router](https://tanstack.com/router) with type-safe file-based routing
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with Vanilla CSS enhancements
- **UI Components**: [Radix UI](https://www.radix-ui.com/) & [shadcn/ui](https://ui.shadcn.com/) patterns
- **Icons**: [Lucide React](https://lucide.dev/)
- **Audio Engine**: Web Audio API (ambient harmonic bowls) & Web Speech API (SpeechSynthesis & SpeechRecognition)
- **External APIs**: Europe PMC / PubMed Biomedical Research REST API
- **Data & Auth**: [Supabase](https://supabase.com/)
- **Build Tool**: [Vite](https://vitejs.dev/)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**, **yarn**, or **pnpm**

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/nimrawani04/her-space-connect.git
   cd her-space-connect
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Start the local development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`.

---

## 📋 Available Scripts

- `npm run dev`: Starts the local development server with Hot Module Replacement (HMR).
- `npm run build`: Type-checks and builds the production bundle with Vite.
- `npm run preview`: Locally previews the production build.
- `npx tsc --noEmit`: Runs full TypeScript type verification across all routes and components.
- `npm run lint`: Runs ESLint to check for code quality and formatting.

---

## 📁 Project Structure

```text
src/
├── components/
│   ├── health/              # Lifecycle, Care Pathway & Clinic Navigators
│   ├── pregnancy/           # Pregnancy continuum, trimester transitions
│   ├── wellness/            # TalkToHerSpaceCompanion, breathwork, visualizers
│   └── ui/                  # Accessible Radix & shadcn primitives (Card, Button, Dialog)
├── lib/
│   ├── ai-fallback.ts       # Fallback companions and local LLM responses
│   ├── tell-herspace.functions.ts # Server function for conversational safety triage
│   └── supabase.ts          # Supabase client initialization
└── routes/
    ├── _authenticated/
    │   ├── library.tsx      # Academy, Courses (Video/Audio/PDF), Research
    │   ├── wellness.tsx     # Mental wellness sanctuary & Journal writer
    │   ├── health.tsx       # Health & cycle trackers
    │   ├── pregnancy.tsx    # Pregnancy journey
    │   ├── community.tsx    # Forums & circles
    │   ├── travel.tsx       # Safe travel hub
    │   └── mentorship.tsx   # Professional mentorship
    └── __root.tsx           # Application root layout & navigation
```

---

## 🛡️ Privacy & Sovereign Security

- **Zero-Trace Triage**: Interactive mental wellness chats are held in memory during the session and are never written to permanent storage without explicit user action.
- **Discreet Quick Exit**: Built-in instant escape triggers protect users in unsafe or sensitive environments.
- **Client-Side Storage**: Course completion and bookmarks are stored securely in local browser storage.

---

## 📄 License

This project is proprietary and confidential. All rights reserved.
