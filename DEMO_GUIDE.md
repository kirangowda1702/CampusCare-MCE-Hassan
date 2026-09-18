# CampusCare – MCE Hassan Telemedicine & Digital Healthcare Platform
## Comprehensive Demo Guide & Final Evaluation Walkthrough

---

### Institutional Context & Purpose
**CampusCare** is a production-ready college digital healthcare and telemedicine management system designed specifically for **Malnad College of Engineering (MCE), Hassan, Karnataka**.

> [!NOTE]
> **Academic & Prototype Notice**: Sample doctor profiles, demonstration credentials, and emergency mock dispatch units are simulated for academic evaluation and clinical workflow demonstration.

---

### Demo User Accounts & Roles

| Role | Name | Email | Default Password | Specialization / Context |
| :--- | :--- | :--- | :--- | :--- |
| **Student** | Rahul Sharma | `rahul.sharma@mcehassan.ac.in` | `MceCampus@2026` | USN: `4MC21CS089` (7th Sem CSE, Kavery Hostel) |
| **Doctor** | Dr. Priya Rao | `dr.priyarao@mcehassan.ac.in` | `MceCampus@2026` | MCE Chief Medical Officer (Reg: `KMC/2012/67843`) |
| **Faculty** | Prof. Suresh Kumar | `suresh.kumar@mcehassan.ac.in` | `MceCampus@2026` | Associate Professor & HOD (Dept. of CSE) |
| **Admin** | Dr. B.S. Anand | `admin.health@mcehassan.ac.in` | `MceCampus@2026` | Campus Health Director & Emergency Commander |

---

### 9-Step End-to-End Evaluation Workflow

```
1. Student Login (Rahul Sharma)
       │
2. Book Teleconsultation (7-Step Wizard)
       │
3. Realtime Doctor Queue & Acceptance
       │
4. WebRTC Video Room & Hardware Stream
       │
5. In-Call Chat & Doctor Clinical Notes
       │
6. Issue Digital Prescription & Dosage
       │
7. Automated Pill Reminder & Adherence
       │
8. Medical Document Upload to E-Vault
       │
9. 1-Click Campus SOS & Dispatch Telemetry
```

#### **Step 1: Student Login**
1. Navigate to `/login`.
2. Click the **"Quick Demo Login: Student (Rahul Sharma)"** button or type `rahul.sharma@mcehassan.ac.in`.
3. View the student health dashboard with active reminders, recent appointments, and E-Vault summary.

#### **Step 2: Book Telemedicine Appointment**
1. Navigate to `/appointments/book`.
2. Step 1: Choose **"General Outpatient Care (OPD)"**.
3. Step 2: Select **"Dr. Priya Rao"**.
4. Step 3: Choose **"Online Video Call"** and select a preferred consultation date.
5. Step 4: Pick an available time slot (e.g., `10:00 AM`).
6. Step 5: Describe symptoms: *"Sore throat, mild fever (100.2°F), and fatigue for 2 days"*.
7. Step 6: Review 100% Free Campus Coverage under MCE Student Health Trust.
8. Step 7: Click **"Confirm & Book Consultation"** $\rightarrow$ Receive generated booking code (e.g., `MCE-APT-2026-XXXX`).

#### **Step 3: Doctor Receives & Accepts Appointment**
1. Switch user to **Doctor** via top-right user menu or login as `dr.priyarao@mcehassan.ac.in`.
2. View the pending appointment in the **Doctor Dashboard** queue.
3. Click **"Accept"** to confirm the schedule.

#### **Step 4: Join Live Teleconsultation Room**
1. Open the consultation room via `/consultation/apt-xxx`.
2. Allow browser camera/microphone permissions.
3. Test **Mute/Unmute**, **Camera Toggle (PiP)**, and **Screen Share simulation**.
4. View the active call duration timer and encrypted stream status.

#### **Step 5: Consultation In-Call Chat & Notes**
1. Open the **Live Chat** drawer to exchange realtime messages between patient and doctor.
2. The doctor inputs clinical observations in the **Clinical Notes** panel.

#### **Step 6: Digital Prescription Issuance**
1. Doctor clicks **"Issue Rx"** button inside the video room or at `/prescriptions`.
2. Add medication lines (e.g., *Paracetamol 650mg*, *Trypsin Chymotrypsin*), dosage, frequency (`1-0-1`), timing (*After Food*), and duration.
3. Submit prescription $\rightarrow$ Formats the certified institutional prescription with printable letterhead.

#### **Step 7: Medicine Reminders & Adherence Tracker**
1. Patient visits `/medications`.
2. The prescribed medications appear as timed daily alarms (Morning, Noon, Night).
3. Tap **"Mark Taken"** $\rightarrow$ Adherence score recalculates in realtime.

#### **Step 8: Upload Health Record to E-Vault**
1. Navigate to `/medical-records`.
2. Click **"Upload Medical Record"**.
3. Select a document (PDF / Image), categorize as *Lab Diagnostic Report*, and enter issuer details (*MCE Campus Clinical Lab*).
4. File is processed and stored in the encrypted health vault.

#### **Step 9: Emergency SOS & Dispatch Telemetry**
1. Tap the **"CAMPUS SOS"** button on the top navigation or at `/emergency`.
2. Select emergency type (*Accident/Trauma*, *Severe Allergy*, etc.) and campus location (*Kavery Hostel Block A*).
3. 5-second cancelable countdown broadcasts the SOS request to campus responders.
4. Admin console tracks response times and ambulance unit dispatch.

---

### Environment Setup & Deployment

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Set Supabase project credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
3. Run SQL migration in Supabase SQL Editor from [`supabase/schema.sql`](supabase/schema.sql).
4. Launch local development server:
   ```bash
   npm run dev
   ```
