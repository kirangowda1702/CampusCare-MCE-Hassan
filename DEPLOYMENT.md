# CampusCare – MCE Hassan Telemedicine & Digital Healthcare System
## Production Deployment & Infrastructure Guide

This guide provides complete instructions for deploying the **CampusCare** platform into a production environment with real Supabase PostgreSQL, Storage, Realtime, Google Gemini 1.5 Flash AI, and WebRTC peer-to-peer teleconsultations.

---

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **Package Manager**: npm or pnpm
- **Supabase Account**: https://supabase.com
- **Google AI Studio Account** (for Gemini API Key): https://aistudio.google.com
- **Vercel / Netlify / Cloudflare Pages Account** (for Frontend Hosting)

---

### 2. Environment Variables Configuration

Create a \.env\ file in the root directory or configure these variables in your hosting provider's dashboard:

\\\env
# -------------------------------------------------------------
# SUPABASE CONFIGURATION (Required for Real Auth & Database)
# -------------------------------------------------------------
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# -------------------------------------------------------------
# GOOGLE GEMINI AI (Required for Real Symptom Guidance)
# -------------------------------------------------------------
VITE_GEMINI_API_KEY=AIzaSy...

# -------------------------------------------------------------
# GOOGLE MAPS / GEOLOCATION (Optional)
# -------------------------------------------------------------
VITE_GOOGLE_MAPS_API_KEY=AIzaSy...

# -------------------------------------------------------------
# WEBRTC STUN / TURN SERVERS (Optional - defaults to public Google STUN)
# -------------------------------------------------------------
VITE_STUN_SERVER=stun:stun.l.google.com:19302
VITE_TURN_SERVER=turn:your-turn-server.com:3478
VITE_TURN_USERNAME=your_username
VITE_TURN_CREDENTIAL=your_password
\\\

> **Security Note**: Never commit \.env\ containing production secrets to version control. Only client-safe public keys (\VITE_\ prefixed) should be bundled in the browser.

---

### 3. Step-by-Step Supabase Database Setup

1. **Create a New Project** on Supabase (https://supabase.com/dashboard).
2. **Execute Schema Migration**:
   - Navigate to the **SQL Editor** in your Supabase dashboard.
   - Open and copy the entire contents of \supabase/schema.sql\.
   - Paste into the SQL editor and click **Run**.
   - This creates:
     - 10 core relational tables (\profiles\, \doctors\, \ppointments\, \medical_records\, \prescriptions\, \medicine_reminders\, \emergency_requests\, \consultation_messages\, \symptom_assessments\, \ctivity_logs\).
     - Row Level Security (RLS) policies enforcing multi-tenant role isolation.
     - Storage bucket \medical-records\ with public read and authenticated write rules.
     - PostgreSQL triggers for profile auto-creation on user signup.
     - Unique index preventing doctor double-booking collisions.

3. **Enable Realtime Subscriptions**:
   - Go to **Database** -> **Replication**.
   - Ensure the \supabase_realtime\ publication includes:
     - \ppointments\
     - \emergency_requests\
     - \consultation_messages\
     - \medicine_reminders\

4. **Verify Storage Bucket**:
   - Go to **Storage** in the Supabase dashboard.
   - Confirm that the \medical-records\ bucket exists and has the appropriate RLS policies for document uploads.

---

### 4. Seed Initial Data (Optional for Quick Demo)

To populate the database with default MCE Hassan doctors, faculty, and sample schedules:
- In the Supabase SQL Editor, run the bottom section of \supabase/schema.sql\ (Seed Data block).

Default test accounts configured:
- **Student**: \ahul.sharma@mcehassan.ac.in\ / \Student@123\
- **Doctor**: \dr.suresh@mcehassan.ac.in\ / \Doctor@123\
- **Faculty**: \prof.kavitha@mcehassan.ac.in\ / \Faculty@123\
- **Admin**: \dmin@mcehassan.ac.in\ / \Admin@123\

---

### 5. Production Build & Local Validation

\\\ash
# 1. Install dependencies
npm install

# 2. Run end-to-end integration validator
npx tsx e2e_validator.ts

# 3. Create optimized production build
npm run build

# 4. Preview production build
npm run preview
\\\

---

### 6. Deployment Platforms

#### A. Deploying to Vercel (Recommended)
1. Push your code to GitHub / GitLab / Bitbucket.
2. Import the repository into Vercel (https://vercel.com/new).
3. Set **Framework Preset** to \Vite\.
4. In **Environment Variables**, add \VITE_SUPABASE_URL\, \VITE_SUPABASE_ANON_KEY\, and \VITE_GEMINI_API_KEY\.
5. Click **Deploy**.

#### B. Deploying to Netlify
1. Connect your repository in Netlify (https://app.netlify.com).
2. Build command: \
pm run build\
3. Publish directory: \dist\
4. Add environment variables under **Site configuration** -> **Environment variables**.
5. Add a \_redirects\ file in \public/\ if client-side routing is needed: \/* /index.html 200\
6. Click **Deploy Site**.

---

**Developed for Malnad College of Engineering (MCE), Hassan, Karnataka.**
