# CampusCare Production Deployment Checklist

## 1. Environment & Infrastructure
- [x] Environment variable template established (`.env.example`)
- [x] No hardcoded API keys or secrets in source code
- [x] `npm run build` passes with 0 TypeScript and 0 Vite bundler errors
- [x] Production error boundary active on all views

## 2. Supabase Database & Security
- [x] `supabase/schema.sql` applied with all 19 relational tables
- [x] Row Level Security (RLS) enabled on all tables
- [x] Realtime publication (`supabase_realtime`) configured for appointments, notifications, emergencies, and consultations
- [x] Medical records storage bucket created with authenticated user folder isolation

## 3. WebRTC & Teleconsultation
- [x] Google STUN server configured (`stun:stun.l.google.com:19302`)
- [ ] TURN server configured (Required for cross-NAT production cellular traversal)
- [x] Realtime broadcast signaling channel active
- [x] Session duration logging and resource cleanup verified

## 4. Healthcare Directory & Emergency Triage
- [x] Hassan doctor directory categorized with `directory_only` status
- [x] Zero simulated hospital or pharmacy coordinates
- [x] Campus First-Aid Centre configured with pending verification notice
- [x] Zero fake ambulance dispatch claims
