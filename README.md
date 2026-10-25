# HerSpace Connect

> **A friendly, safe, and all-in-one space for women's health, safety, mental wellness, and sisterhood.**

[![Web App](https://img.shields.io/badge/Web-Live-emerald?style=flat-square)](https://her-space-connect.vercel.app/)
[![Android App](https://img.shields.io/badge/Android-v2.0.0-blue?style=flat-square)](android/HerSpace-v2.0-debug.apk)

HerSpace Connect brings together body tracking, personal safety, learning, and community support in one place. It is available as a web app and a native Android app.

---

## 🌸 What’s Inside

### 🩸 Health & Body
* **Period & Cycle Log**: Easily log your period dates, flow, symptoms, and pain levels.
* **Daily Wellness**: Track your daily water intake, sleep, moods, and light exercise.
* **Cycles & Hormones**: See where you are in your monthly cycle and understand natural changes in energy and mood.
* **Symptom Assistant & AI Insights**: Describe what you are feeling and get helpful suggestions before speaking with a doctor.
* **At-Home Lab Kits**: Record and check results from at-home hormone and fertility test kits.
* **Life Stages (Settings)**: Turn on dedicated sections tailored for **Teens (first period)**, **Perimenopause & Menopause**, and **Pregnancy & Postpartum**.

### 🗺️ Safety Network
* **Community Safety Map & Routes**: Plan walks using safe route recommendations that favor well-lit, populated roads.
* **Safe Places**: Discover and share safe cafes, hostels, clinics, and gyms tested by women.
* **Alerts & Notices**: Live neighborhood alerts shared by the community to stay aware on the go.
* **Female Professionals**: A trusted directory to find female doctors, therapists, lawyers, and fitness trainers.
* **One-Tap SOS**: A fast, quiet emergency button to alert your trusted contacts.

### 💬 Mental Wellness
* **Talk to HerSpace**: A gentle, non-judgmental companion to share your thoughts, untangle worries, and get guidance if you feel dismissed by healthcare providers.
* **Private Journal**: A quiet space to write daily reflections, track how you feel, and celebrate small wins.

### 🤝 Sisterhood & Community
* **Safe Space**: A warm community board to ask questions, share stories, or post anonymously.
* **Experience Match**: Meet and talk with other women going through similar life moments.
* **Mentorship & Careers**: Connect with women mentors for career advice and explore job opportunities.
* **Travel Sisterhood**: Connect with local women hosts and find welcoming places when traveling.

### 📚 Library & Learning
* **Courses & Masterclasses**: Simple, step-by-step guides on cycle health, fertility, and body wellness.
* **Articles & Clinical Studies**: Easy-to-understand articles alongside real research summaries.
* **Audio & Meditations**: Relaxing audio soundscapes, guided breathing, and audio lessons.

### 📱 Android App (Version 2.0)
* Pure native Android app built with **Kotlin** and **Jetpack Compose**.
* Clean and calm design with full dark mode support.
* Syncs smoothly with your web account so all your logs and saved items stay updated.

---

## 🛠️ Built With

* **Frontend**: React 19, TanStack Start & Router, Tailwind CSS, Leaflet Maps
* **Android**: Kotlin, Jetpack Compose Material 3, Coroutines, StateFlow
* **Backend**: Supabase (Database, User Authentication, Realtime Updates)
* **APIs**: PubMed / Europe PMC Research API, Web Speech & Web Audio

---

## 🚀 Getting Started

### 🌐 Web App (Run Locally)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/nimrawani04/her-space-connect.git
   cd her-space-connect
   ```

2. **Install packages**:
   ```bash
   npm install
   ```

3. **Add environment variables**:
   Create a `.env` file in the project root:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   ```

4. **Start the app**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

### 📱 Android App

1. Open the `android/` folder in **Android Studio**.
2. Or install the pre-built APK directly to your phone:
   * **APK File**: `android/HerSpace-v2.0-debug.apk`
   ```bash
   adb install -r android/HerSpace-v2.0-debug.apk
   ```
