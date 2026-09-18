# CampusCare — MCE Hassan Telemedicine & Digital Healthcare Platform

CampusCare is a comprehensive digital healthcare, teleconsultation, and campus emergency response platform engineered for **Malnad College of Engineering (MCE), Hassan, Karnataka**.

---

## 🏥 Architectural Overview & Key Pillars

1. **Verified Public Healthcare Directory**: Real, publicly listed doctors, hospitals, pharmacies, and diagnostic centres in Hassan, Karnataka with verified coordinates, operating hours, and official source citations. Public profiles default to `directory_only` status.
2. **Doctor Onboarding & Teleconsultation Readiness**: Multi-state provider lifecycle (`directory_only`, `onboarded`, `active`, `inactive`) ensuring only verified practitioners conduct online video appointments.
3. **Real WebRTC Video Consultations**: Real browser-to-browser media streaming with Supabase Realtime broadcast signaling, STUN/TURN support, in-call chat, and call duration monitoring.
4. **MCE First-Aid Centre & Campus Emergency Response**: Multi-stage emergency lifecycle (`REQUESTED` → `ACKNOWLEDGED` → `RESPONDER_ASSIGNED` → `ASSISTANCE_IN_PROGRESS` → `REFERRED` → `RESOLVED`), permission-gated geolocation, and hospital referral tracking.
5. **Clinical Decision Support & AI Symptom Guidance**: Rule-based clinical triage combined with Google Gemini 1.5 Flash integration, red-flag emergency detection, and strict prompt injection defenses.
6. **Medical Records & Prescriptions**: Secure medical history repository, digital prescriptions, and adherence-tracked medicine reminders.

---

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons
- **Backend & Database**: Supabase (PostgreSQL 15, Row Level Security, Realtime Publications, Storage)
- **WebRTC**: Native WebRTC `RTCPeerConnection`, Google STUN (`stun.l.google.com:19302`)
- **Mapping & Geolocation**: Google Maps JavaScript API with Haversine distance matrix
- **AI Engine**: Clinical Decision Support Rule Engine + Google Gemini 1.5 Flash API

---

## 🚀 Environment Variables (`.env`)

```ini
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Google Maps Platform
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# WebRTC STUN / TURN Server Configuration
VITE_STUN_SERVER=stun:stun.l.google.com:19302
VITE_TURN_SERVER=
VITE_TURN_USERNAME=
VITE_TURN_CREDENTIAL=

# AI Symptom Guidance (Optional - defaults to Rule Engine if omitted)
VITE_GEMINI_API_KEY=
```

---

## 📦 Installation & Development

```bash
# 1. Install dependencies
npm install

# 2. Start local development server (runs on http://localhost:3000)
npm run dev

# 3. Run production build check
npm run build
```

---

## 🗄 Database Setup & Migrations

1. Open your [Supabase Dashboard](https://supabase.com/).
2. Navigate to the **SQL Editor**.
3. Run the complete SQL migration file located at [`supabase/schema.sql`](./supabase/schema.sql).
4. Verify all tables, Row Level Security policies, and Realtime publications are created.
