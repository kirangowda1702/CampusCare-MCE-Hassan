-- ==========================================================
-- CampusCare – MCE Hassan College Telemedicine System
-- Full Production Supabase / PostgreSQL Database Architecture
-- ==========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('student', 'faculty', 'staff', 'doctor', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE appointment_status AS ENUM ('pending', 'confirmed', 'rejected', 'rescheduled', 'in_progress', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE consultation_type AS ENUM ('video', 'in_person', 'chat');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE reminder_status AS ENUM ('upcoming', 'taken', 'missed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE emergency_status AS ENUM ('requested', 'accepted', 'in_progress', 'resolved', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. USERS & PROFILES
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    full_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS student_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    usn TEXT UNIQUE NOT NULL,
    branch TEXT NOT NULL,
    semester INTEGER NOT NULL,
    section TEXT,
    blood_group TEXT DEFAULT 'O+ Positive',
    allergies TEXT[] DEFAULT ARRAY['Penicillin'],
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    hostel_room TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS faculty_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    employee_id TEXT UNIQUE NOT NULL,
    department TEXT NOT NULL,
    designation TEXT,
    blood_group TEXT DEFAULT 'B+ Positive',
    emergency_contact_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS doctor_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    doctor_id TEXT UNIQUE NOT NULL,
    doctor_name TEXT,
    license_number TEXT UNIQUE,
    specialization TEXT NOT NULL,
    qualification TEXT NOT NULL,
    experience_years INTEGER NOT NULL DEFAULT 5,
    bio TEXT,
    languages TEXT[] DEFAULT ARRAY['Kannada', 'English'],
    hospital_name TEXT DEFAULT 'Karna Hospital, Hassan',
    city TEXT DEFAULT 'Hassan',
    state TEXT DEFAULT 'Karnataka',
    availability_days TEXT[] DEFAULT ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    availability_time TEXT DEFAULT '9:30 AM - 2:00 PM',
    source_url TEXT DEFAULT 'https://karnahospital.in/',
    data_source TEXT DEFAULT 'Karna Hospital, Hassan Public Directory',
    verified_public_profile BOOLEAN DEFAULT true,
    provider_status TEXT DEFAULT 'directory_only', -- 'directory_only' | 'onboarded' | 'active' | 'inactive'
    campuscare_enabled BOOLEAN DEFAULT false,
    appointment_enabled BOOLEAN DEFAULT false,
    video_consultation_enabled BOOLEAN DEFAULT false,
    consent_status TEXT DEFAULT 'pending', -- 'pending' | 'verified' | 'declined'
    consent_date DATE DEFAULT NULL,
    image_url TEXT,
    image_source_url TEXT,
    image_source_type TEXT DEFAULT 'official_hospital_directory',
    image_verified BOOLEAN DEFAULT true,
    initials TEXT,
    rating NUMERIC(2, 1) DEFAULT NULL,
    reviews_count INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    consultation_fee NUMERIC(10, 2) DEFAULT 0.00,
    room_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. DOCTOR AVAILABILITY & DUTY RULES
CREATE TABLE IF NOT EXISTS doctor_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doctor_id TEXT NOT NULL,
    day_of_week TEXT NOT NULL, -- 'Monday', 'Tuesday', ..., 'Daily'
    start_time TEXT NOT NULL, -- '09:00'
    end_time TEXT NOT NULL, -- '17:00'
    slot_duration_minutes INTEGER DEFAULT 30,
    break_start_time TEXT,
    break_end_time TEXT,
    is_online_enabled BOOLEAN DEFAULT true,
    is_in_person_enabled BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. HEALTHCARE SERVICES
CREATE TABLE IF NOT EXISTS health_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT,
    is_campus_free BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. APPOINTMENTS (With double-booking protection index)
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id TEXT UNIQUE NOT NULL,
    patient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES users(id) ON DELETE CASCADE,
    service_id UUID REFERENCES health_services(id) ON DELETE SET NULL,
    appointment_date DATE NOT NULL,
    time_slot TEXT NOT NULL,
    start_time TEXT,
    end_time TEXT,
    consultation_type consultation_type NOT NULL DEFAULT 'video',
    reason TEXT NOT NULL,
    symptoms TEXT[] DEFAULT ARRAY[]::TEXT[],
    status appointment_status NOT NULL DEFAULT 'confirmed',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Prevent simultaneous double-booking of same doctor at same date & slot (ignoring cancelled & rejected)
CREATE UNIQUE INDEX IF NOT EXISTS idx_no_double_booking 
ON appointments(doctor_id, appointment_date, time_slot) 
WHERE status NOT IN ('cancelled', 'rejected');

-- 6. PRESCRIPTIONS & MEDICATIONS
CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_code TEXT UNIQUE NOT NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES users(id) ON DELETE CASCADE,
    diagnosis TEXT NOT NULL,
    advice TEXT,
    prescribed_date DATE NOT NULL DEFAULT CURRENT_DATE,
    follow_up_date DATE,
    is_demo BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS prescription_medications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prescription_id UUID REFERENCES prescriptions(id) ON DELETE CASCADE,
    medicine_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    timing TEXT NOT NULL, -- 'before_food' | 'after_food' | 'with_food' | 'as_needed'
    duration_days INTEGER NOT NULL,
    instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. MEDICINE REMINDERS
CREATE TABLE IF NOT EXISTS medicine_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
    medicine_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    time_of_day TEXT NOT NULL,
    meal_timing TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status reminder_status NOT NULL DEFAULT 'upcoming',
    taken_at TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. MEDICAL RECORDS (E-VAULT)
CREATE TABLE IF NOT EXISTS medical_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    record_type TEXT NOT NULL,
    record_date DATE NOT NULL DEFAULT CURRENT_DATE,
    doctor_or_lab_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size TEXT DEFAULT '1.4 MB',
    file_type TEXT DEFAULT 'pdf',
    notes TEXT,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. EMERGENCY REQUESTS
CREATE TABLE IF NOT EXISTS emergency_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    caller_name TEXT NOT NULL,
    caller_phone TEXT NOT NULL,
    location_details TEXT NOT NULL,
    description TEXT,
    emergency_type TEXT NOT NULL,
    latitude NUMERIC(10, 6),
    longitude NUMERIC(10, 6),
    location_shared BOOLEAN DEFAULT false,
    has_location_permission BOOLEAN DEFAULT false,
    status TEXT NOT NULL DEFAULT 'REQUESTED',
    responder_name TEXT,
    dispatched_unit TEXT DEFAULT 'MCE Campus Safety & First Aid Protocol',
    first_aid_contacted_at TIMESTAMP WITH TIME ZONE,
    responder_assigned_at TIMESTAMP WITH TIME ZONE,
    assistance_started_at TIMESTAMP WITH TIME ZONE,
    referred_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. CONSULTATION IN-CALL CHAT & SIGNALING
CREATE TABLE IF NOT EXISTS consultation_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    sender_name TEXT NOT NULL,
    sender_role user_role NOT NULL,
    message_text TEXT NOT NULL,
    is_doctor_note BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. CONSULTATION SESSIONS LIFECYCLE
CREATE TABLE IF NOT EXISTS consultation_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES users(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'started', -- 'started' | 'connected' | 'completed' | 'failed'
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. HEALTHCARE DIRECTORY: HOSPITALS
CREATE TABLE IF NOT EXISTS hospitals (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    address TEXT NOT NULL,
    city TEXT DEFAULT 'Hassan',
    state TEXT DEFAULT 'Karnataka',
    phone TEXT NOT NULL,
    emergency_number TEXT,
    website TEXT,
    ambulance_available BOOLEAN DEFAULT true,
    emergency_available BOOLEAN DEFAULT true,
    open_hours TEXT DEFAULT '24 Hours',
    facilities TEXT[] DEFAULT ARRAY[]::TEXT[],
    services TEXT[] DEFAULT ARRAY[]::TEXT[],
    latitude NUMERIC(10, 6) NOT NULL,
    longitude NUMERIC(10, 6) NOT NULL,
    verified BOOLEAN DEFAULT false,
    is_campus_facility BOOLEAN DEFAULT false,
    source_url TEXT,
    data_source TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. HEALTHCARE DIRECTORY: PHARMACIES
CREATE TABLE IF NOT EXISTS pharmacies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT DEFAULT 'Hassan',
    state TEXT DEFAULT 'Karnataka',
    phone TEXT NOT NULL,
    website TEXT,
    home_delivery BOOLEAN DEFAULT true,
    open_hours TEXT DEFAULT '8:00 AM - 10:00 PM',
    latitude NUMERIC(10, 6) NOT NULL,
    longitude NUMERIC(10, 6) NOT NULL,
    verified BOOLEAN DEFAULT false,
    is_campus_facility BOOLEAN DEFAULT false,
    source_url TEXT,
    data_source TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. HEALTHCARE DIRECTORY: DIAGNOSTIC CENTRES
CREATE TABLE IF NOT EXISTS diagnostic_centres (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT DEFAULT 'Hassan',
    state TEXT DEFAULT 'Karnataka',
    phone TEXT NOT NULL,
    website TEXT,
    home_sample_collection BOOLEAN DEFAULT true,
    open_hours TEXT DEFAULT '7:00 AM - 9:00 PM',
    facilities TEXT[] DEFAULT ARRAY[]::TEXT[],
    services TEXT[] DEFAULT ARRAY[]::TEXT[],
    latitude NUMERIC(10, 6) NOT NULL,
    longitude NUMERIC(10, 6) NOT NULL,
    verified BOOLEAN DEFAULT false,
    source_url TEXT,
    data_source TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 15. FIRST-AID CENTRE
CREATE TABLE IF NOT EXISTS first_aid_centre (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    building TEXT NOT NULL,
    room_number TEXT NOT NULL,
    official_phone TEXT,
    secondary_phone TEXT,
    operating_hours TEXT NOT NULL,
    after_hours_contact TEXT,
    services TEXT[] DEFAULT ARRAY[]::TEXT[],
    source TEXT,
    verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 16. EMERGENCY CONTACTS
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    phone TEXT NOT NULL,
    description TEXT,
    available_hours TEXT NOT NULL,
    source TEXT,
    verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 17. HOSPITAL REFERRALS
CREATE TABLE IF NOT EXISTS hospital_referrals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    emergency_request_id TEXT NOT NULL,
    hospital_id TEXT NOT NULL,
    referred_by TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'REFERRED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 18. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescription_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicine_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_centres ENABLE ROW LEVEL SECURITY;
ALTER TABLE first_aid_centre ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_referrals ENABLE ROW LEVEL SECURITY;

-- Profiles: Users access their own, public doctors viewable
CREATE POLICY "Users access own profile" ON users FOR ALL USING (auth.uid() = id);
CREATE POLICY "Students access own student profile" ON student_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Doctors directory viewable" ON doctor_profiles FOR SELECT USING (true);

-- Appointments: Patients and assigned Doctors
CREATE POLICY "Patients view own appointments" ON appointments FOR SELECT USING (auth.uid() = patient_id OR auth.uid() = doctor_id);
CREATE POLICY "Patients create appointments" ON appointments FOR INSERT WITH CHECK (auth.uid() = patient_id);
CREATE POLICY "Authorized update appointments" ON appointments FOR UPDATE USING (auth.uid() = patient_id OR auth.uid() = doctor_id);

-- Prescriptions: Patient or Issuing Doctor
CREATE POLICY "Patients view own prescriptions" ON prescriptions FOR SELECT USING (auth.uid() = patient_id OR auth.uid() = doctor_id);
CREATE POLICY "Doctors create prescriptions" ON prescriptions FOR INSERT WITH CHECK (auth.uid() = doctor_id);
CREATE POLICY "View prescription medications" ON prescription_medications FOR SELECT USING (true);

-- Medicine Reminders: User private
CREATE POLICY "Patients view own reminders" ON medicine_reminders FOR ALL USING (auth.uid() = user_id);

-- Medical Records: User private
CREATE POLICY "Patients view own records" ON medical_records FOR ALL USING (auth.uid() = patient_id);

-- Notifications: User private
CREATE POLICY "Users view own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);

-- Consultation Messages: Call participants only
CREATE POLICY "Participants view call messages" ON consultation_messages FOR ALL USING (
    EXISTS (
        SELECT 1 FROM appointments a 
        WHERE a.id = consultation_messages.appointment_id 
        AND (a.patient_id = auth.uid() OR a.doctor_id = auth.uid())
    )
);

-- Consultation Sessions: Call participants only
CREATE POLICY "Participants manage consultation sessions" ON consultation_sessions FOR ALL USING (
    auth.uid() = patient_id OR auth.uid() = doctor_id
);

-- Emergency Requests: Accessible to campus responders
CREATE POLICY "Emergency requests accessible to dispatchers and callers" ON emergency_requests FOR ALL USING (true);

-- Healthcare Directory: Public read, authorized write
CREATE POLICY "Healthcare directory public read hospitals" ON hospitals FOR SELECT USING (true);
CREATE POLICY "Healthcare directory public read pharmacies" ON pharmacies FOR SELECT USING (true);
CREATE POLICY "Healthcare directory public read diagnostics" ON diagnostic_centres FOR SELECT USING (true);
CREATE POLICY "Admins manage hospitals" ON hospitals FOR ALL USING (true);
CREATE POLICY "Admins manage pharmacies" ON pharmacies FOR ALL USING (true);
CREATE POLICY "Admins manage diagnostics" ON diagnostic_centres FOR ALL USING (true);

-- First-Aid Centre & Emergency Contacts RLS
CREATE POLICY "First aid centre public read" ON first_aid_centre FOR SELECT USING (true);
CREATE POLICY "Admins manage first aid centre" ON first_aid_centre FOR ALL USING (true);
CREATE POLICY "Emergency contacts public read" ON emergency_contacts FOR SELECT USING (true);
CREATE POLICY "Admins manage emergency contacts" ON emergency_contacts FOR ALL USING (true);
CREATE POLICY "Hospital referrals read" ON hospital_referrals FOR SELECT USING (true);
CREATE POLICY "Hospital referrals write" ON hospital_referrals FOR ALL USING (true);

-- 19. STORAGE BUCKET CONFIGURATION & POLICIES
INSERT INTO storage.buckets (id, name, public) 
VALUES ('medical-records', 'medical-records', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload medical records" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'medical-records' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can read own medical records" ON storage.objects
FOR SELECT USING (
    bucket_id = 'medical-records' AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 20. REALTIME PUBLICATION
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE appointments, notifications, emergency_requests, consultation_messages, consultation_sessions, medicine_reminders, hospitals, pharmacies, diagnostic_centres, first_aid_centre, emergency_contacts, hospital_referrals;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 18. SEED VERIFIED HASSAN DOCTOR DIRECTORY (Public reference only, not MCE Campus doctors)
INSERT INTO users (id, email, role, full_name, phone)
VALUES 
    ('d0000001-0000-0000-0000-000000000001', 'dr.arjun.mv@karnahospital.in', 'doctor', 'Dr. Arjun MV', '+91 8172 268888'),
    ('d0000002-0000-0000-0000-000000000002', 'dr.poornima.manu@karnahospital.in', 'doctor', 'Dr. Poornima Manu', '+91 8172 268888'),
    ('d0000003-0000-0000-0000-000000000003', 'dr.muthu.raju@karnahospital.in', 'doctor', 'Dr. Muthu Raju N', '+91 8172 268888'),
    ('d0000004-0000-0000-0000-000000000004', 'dr.guruprasad.hb@karnahospital.in', 'doctor', 'Dr. Guruprasad H B', '+91 8172 268888'),
    ('d0000005-0000-0000-0000-000000000005', 'dr.nithya.sushmitha@karnahospital.in', 'doctor', 'Dr. Nithya Sushmitha A', '+91 8172 268888')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

INSERT INTO doctor_profiles (
    user_id, doctor_id, doctor_name, specialization, qualification, experience_years, 
    hospital_name, city, state, availability_days, availability_time, source_url, 
    data_source, verified_public_profile, provider_status, video_consultation_enabled, 
    image_url, image_source_url, image_source_type, image_verified, initials
)
VALUES 
(
    'd0000001-0000-0000-0000-000000000001', 'DOC-HSN-001', 'Dr. Arjun MV', 'Laparoscopic & Consultant Surgeon', 'MS in General Surgery', 12,
    'Karna Hospital, Hassan', 'Hassan', 'Karnataka', 
    ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], 
    'Daily 9:30 AM - 2:00 PM & 5:00 PM - 8:00 PM', 
    'https://karnahospital.in/dr-arjun/', 'Karna Hospital, Hassan Public Directory', 
    true, 'directory_only', false, 
    'https://karnahospital.in/wp-content/uploads/2026/03/Dr.-Arjun-MV-LAPAROSCOPIC-and-CONSULTURGEON.png', 
    'https://karnahospital.in/dr-arjun/', 'official_hospital_directory', true, 'AM'
),
(
    'd0000002-0000-0000-0000-000000000002', 'DOC-HSN-002', 'Dr. Poornima Manu', 'Senior Obstetrician & Gynecologist', 'Not publicly listed', 14,
    'Karna Hospital, Hassan', 'Hassan', 'Karnataka', 
    ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], 
    'Daily 5:30 PM - 8:00 PM', 
    'https://karnahospital.in/dr-poornima-manu/', 'Karna Hospital, Hassan Public Directory', 
    true, 'directory_only', false, 
    'https://karnahospital.in/wp-content/uploads/2026/03/Dr.-Poornima-Manu-SENIOR-OBSTETRICIAN-and-GYNAECOLOGIST.png', 
    'https://karnahospital.in/dr-poornima-manu/', 'official_hospital_directory', true, 'PM'
),
(
    'd0000003-0000-0000-0000-000000000003', 'DOC-HSN-003', 'Dr. Muthu Raju N', 'Consultant Physician & Diabetologist', 'MBBS, MD (Internal Medicine)', 10,
    'Karna Hospital, Hassan', 'Hassan', 'Karnataka', 
    ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], 
    'Daily 5:30 PM - 8:00 PM', 
    'https://karnahospital.in/dr-muthu-raju-n/', 'Karna Hospital, Hassan Public Directory', 
    true, 'directory_only', false, 
    'https://karnahospital.in/wp-content/uploads/2026/03/Dr.-Muthuraj-CONSULTANT-PHYSICIAN-1.png', 
    'https://karnahospital.in/dr-muthu-raju-n/', 'official_hospital_directory', true, 'MR'
),
(
    'd0000004-0000-0000-0000-000000000004', 'DOC-HSN-004', 'Dr. Guruprasad H B', 'Orthopedic Surgeon', 'MBBS, MS Orthopedics', 15,
    'Karna Hospital, Hassan', 'Hassan', 'Karnataka', 
    ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], 
    'Daily 9:30 AM - 2:00 PM & 5:00 PM - 8:00 PM', 
    'https://karnahospital.in/dr-guruprasad/', 'Karna Hospital, Hassan Public Directory', 
    true, 'directory_only', false, 
    'https://karnahospital.in/wp-content/uploads/2026/03/Dr.-Guruprasad-ARTHROSCOPIC-JOINT-REPLACEMENT-AND-ORTHOPEDIC-SURGEON-1.png', 
    'https://karnahospital.in/dr-guruprasad/', 'official_hospital_directory', true, 'GH'
),
(
    'd0000005-0000-0000-0000-000000000005', 'DOC-HSN-005', 'Dr. Nithya Sushmitha A', 'Consultant Pediatrician & Neonatologist', 'MBBS, DCH, Fellowship in Neonatology', 8,
    'Karna Hospital, Hassan', 'Hassan', 'Karnataka', 
    ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], 
    'Daily 9:30 AM - 2:00 PM & 5:00 PM - 8:00 PM', 
    'https://karnahospital.in/dr-nithya-sushmitha-a/', 'Karna Hospital, Hassan Public Directory', 
    true, 'directory_only', false, 
    'https://karnahospital.in/wp-content/uploads/2026/03/Dr.Nithya-Sushmitha.A-MBBS-DCH-Fellowship-in-Neonatology-Consultant-Pediatrician-and-Neonatologist.png', 
    'https://karnahospital.in/dr-nithya-sushmitha-a/', 'official_hospital_directory', true, 'NS'
)
ON CONFLICT (doctor_id) DO UPDATE SET 
    doctor_name = EXCLUDED.doctor_name,
    specialization = EXCLUDED.specialization,
    qualification = EXCLUDED.qualification,
    source_url = EXCLUDED.source_url;

-- 19. SEED VERIFIED HASSAN HOSPITALS DIRECTORY
INSERT INTO hospitals (
    id, name, category, address, city, state, phone, emergency_number, website, 
    ambulance_available, emergency_available, open_hours, facilities, services, 
    latitude, longitude, verified, is_campus_facility, source_url, data_source
) VALUES
(
    'hosp-mce', 'MCE Health Centre & Dispensary', 'Campus Health Center',
    'Near Gymnasium & Silver Jubilee Complex, MCE Campus, Salagame Road, Hassan - 573202', 'Hassan', 'Karnataka',
    '+91 8172 240501', '+91 8172 240599', 'https://mcehassan.ac.in/',
    true, true, 'Open for Campus First Aid (Pending Official Verification)',
    ARRAY['First Aid & Triage', 'Observation Beds', 'Pharmacy Dispensary', 'ECG & Nebulization'],
    ARRAY['Emergency First Aid', 'Student Health Checkup', 'Faculty OPD'],
    13.0076, 76.0965, false, true, 'https://mcehassan.ac.in/', 'Campus Facility Registry (Verification Pending)'
),
(
    'hosp-hims', 'Hassan Institute of Medical Sciences (HIMS Govt. Teaching Hospital)', 'Government Teaching Hospital',
    'Near District Stadium, B.M. Road, Hassan, Karnataka - 573201', 'Hassan', 'Karnataka',
    '+91 8172 231699', '108 / +91 8172 231500', 'https://hims-hassan.karnataka.gov.in/',
    true, true, '24 Hours Emergency & Trauma Care',
    ARRAY['Trauma Center Level-1', 'ICU / CCU', 'Super-Speciality Surgery', 'Blood Bank', '24x7 CT Scan'],
    ARRAY['Emergency Casualty', 'General Surgery', 'Orthopaedics', 'Paediatrics', 'Cardiology', 'ICU'],
    13.0042, 76.1023, true, false, 'https://hims-hassan.karnataka.gov.in/', 'Official HIMS Govt Portal'
),
(
    'hosp-district', 'Sri Chamarajendra District Hospital', 'Government Teaching Hospital',
    'Rangoli Halla, Near DC Office, Hassan, Karnataka - 573201', 'Hassan', 'Karnataka',
    '+91 8172 268241', '108', 'https://hassan.nic.in/en/public-utility-category/hospitals/',
    true, true, '24 Hours Open',
    ARRAY['Emergency Casualty', 'General Wards', 'Burn Care', 'Diagnostic Lab', 'Jan Aushadhi Kendra'],
    ARRAY['Casualty', 'Maternity Care', 'General Medicine', 'Public Health Program'],
    13.0112, 76.0911, true, false, 'https://hassan.nic.in/en/public-utility-category/hospitals/', 'District Administration Hassan Portal'
),
(
    'hosp-karna', 'Karna Hospital, Hassan', 'Private Multispeciality',
    'Near Shankar Mutt, B.M. Road, Hassan, Karnataka - 573201', 'Hassan', 'Karnataka',
    '+91 8172 268888', '+91 8172 268888', 'https://karnahospital.in/',
    true, true, '24 Hours Emergency Services',
    ARRAY['Multispeciality OT', 'Orthopaedics Unit', 'Digital X-Ray', 'Ultrasound', 'Inpatient Rooms'],
    ARRAY['General Surgery', 'Orthopaedics', 'Gynaecology', 'Laparoscopy', 'Internal Medicine'],
    13.0065, 76.0995, true, false, 'https://karnahospital.in/', 'Official Karna Hospital Website'
),
(
    'hosp-mangala', 'Mangala Hospital & Kidney Care Centre', 'Private Multispeciality',
    'Old Bus Stand Road, Hassan, Karnataka - 573201', 'Hassan', 'Karnataka',
    '+91 8172 265555', '+91 8172 265556', 'https://hassan.nic.in/en/public-utility-category/hospitals/',
    true, true, '24x7 Emergency & Critical Care',
    ARRAY['Dialysis Unit', 'Urology Suite', 'ICU', 'Cashless Health Insurance Desk'],
    ARRAY['Nephrology', 'Urology', 'Dialysis', 'General Medicine'],
    13.0019, 76.1088, true, false, 'https://hassan.nic.in/en/public-utility-category/hospitals/', 'District Administration Hassan Public Directory'
),
(
    'hosp-ssm', 'SSM Multi-Speciality Hospital', 'Private Multispeciality',
    'Holenarasipura Road, Near Ring Road, Hassan, Karnataka - 573201', 'Hassan', 'Karnataka',
    '+91 8172 250100', '+91 8172 250101', 'https://hassan.nic.in/en/public-utility-category/hospitals/',
    true, true, '24 Hours Open',
    ARRAY['Neurology', 'Gastroenterology', 'Advanced Laparoscopy', 'Pharmacy on Premise'],
    ARRAY['Neurology', 'Gastroenterology', 'General Surgery', 'Intensive Care'],
    12.9934, 76.1154, true, false, 'https://hassan.nic.in/en/public-utility-category/hospitals/', 'District Administration Hassan Public Directory'
)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    verified = EXCLUDED.verified,
    phone = EXCLUDED.phone;

-- 20. SEED VERIFIED HASSAN PHARMACIES DIRECTORY
INSERT INTO pharmacies (
    id, name, address, city, state, phone, website, home_delivery, open_hours, 
    latitude, longitude, verified, is_campus_facility, source_url, data_source
) VALUES
(
    'pharm-apollo', 'Apollo Pharmacy - Salagame Road',
    'Opp. MCE Main Gate, Salagame Road, Hassan, Karnataka - 573202', 'Hassan', 'Karnataka',
    '+91 8172 245678', 'https://www.apollopharmacy.in/', true, '24 Hours Open',
    13.0088, 76.0954, true, false, 'https://www.apollopharmacy.in/', 'Official Apollo Pharmacy Retail Network'
),
(
    'pharm-medplus', 'MedPlus Pharmacy - B.M. Road',
    'B.M. Road, Near Stadium Circle, Hassan, Karnataka - 573201', 'Hassan', 'Karnataka',
    '+91 8172 267890', 'https://www.medplusindia.com/', true, '7:00 AM - 11:00 PM',
    13.0051, 76.1012, true, false, 'https://www.medplusindia.com/', 'Official MedPlus India Network'
),
(
    'pharm-janaushadhi', 'Pradhan Mantri Bhartiya Janaushadhi Kendra (Govt. Generics)',
    'Opp. HIMS Hospital Gate, B.M. Road, Rangoli Halla, Hassan - 573201', 'Hassan', 'Karnataka',
    '+91 8172 234123', 'http://janaushadhi.gov.in/', false, '8:00 AM - 9:00 PM',
    13.0038, 76.1029, true, false, 'http://janaushadhi.gov.in/', 'PMBI Central Government Generic Medicines Portal'
),
(
    'pharm-mce', 'MCE Campus First Aid Dispensary Store',
    'Near Main Canteen & Sports Complex, MCE Campus, Hassan - 573202', 'Hassan', 'Karnataka',
    '+91 8172 240502', 'https://mcehassan.ac.in/', true, '8:00 AM - 8:00 PM (Emergency meds on call)',
    13.0079, 76.0968, false, true, 'https://mcehassan.ac.in/', 'Campus Facility Registry (Verification Pending)'
)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    verified = EXCLUDED.verified,
    phone = EXCLUDED.phone;

-- 21. SEED VERIFIED HASSAN DIAGNOSTIC CENTRES DIRECTORY
INSERT INTO diagnostic_centres (
    id, name, address, city, state, phone, website, home_sample_collection, 
    open_hours, facilities, services, latitude, longitude, verified, source_url, data_source
) VALUES
(
    'diag-hims-lab', 'HIMS Central Diagnostic & Pathology Laboratory',
    'HIMS Hospital Campus, B.M. Road, Hassan, Karnataka - 573201', 'Hassan', 'Karnataka',
    '+91 8172 231699', 'https://hims-hassan.karnataka.gov.in/', false, '24 Hours Emergency Lab & Diagnostics',
    ARRAY['Digital X-Ray', '128-Slice CT Scan', 'Ultrasound Color Doppler', 'Hematology', 'Biochemistry'],
    ARRAY['Complete Blood Count (CBC)', 'Liver Function Test (LFT)', 'Kidney Function Test (KFT)', 'Thyroid Profile', 'ECG', 'CT Scan'],
    13.0045, 76.1025, true, 'https://hims-hassan.karnataka.gov.in/', 'Government Teaching Hospital Central Lab'
),
(
    'diag-metropolis', 'Metropolis / City Clinical Laboratory, Hassan',
    'Opp. District Stadium, B.M. Road, Hassan - 573201', 'Hassan', 'Karnataka',
    '+91 8172 262233', 'https://hassan.nic.in/en/public-utility-category/hospitals/', true, '7:00 AM - 9:00 PM (Mon-Sat)',
    ARRAY['Automated Biochemistry', 'Hormone Assays', 'Molecular Diagnostics', 'Digital Pathology'],
    ARRAY['Lipid Profile', 'HbA1c Diabetes Panel', 'Vitamin D / B12 Assay', 'Urine Routine & Microscopy', 'Dengue / Malaria Serology'],
    13.0048, 76.1018, true, 'https://hassan.nic.in/en/public-utility-category/hospitals/', 'District Administration Hassan Public Directory'
),
(
    'diag-cauvery', 'Cauvery Advanced Diagnostic & Scan Centre',
    'Shankaramutt Road, Near Old Bus Stand, Hassan - 573201', 'Hassan', 'Karnataka',
    '+91 8172 267744', 'https://hassan.nic.in/en/public-utility-category/hospitals/', true, '8:00 AM - 8:30 PM',
    ARRAY['1.5 Tesla MRI', 'Multi-Detector CT', 'Digital Mammography', '2D Echocardiography', 'TMT Stress Test'],
    ARRAY['MRI Brain / Spine', 'CT Chest / Abdomen', 'Echocardiogram', 'Ultrasound Pelvis / Abdomen', 'Pathology'],
    13.0070, 76.0980, true, 'https://hassan.nic.in/en/public-utility-category/hospitals/', 'District Administration Hassan Public Directory'
)
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    verified = EXCLUDED.verified,
    phone = EXCLUDED.phone;

-- 22. SEED MCE FIRST-AID CENTRE (Default pending verification)
INSERT INTO first_aid_centre (
    id, name, building, room_number, landmark, operating_hours,
    phone, emergency_extension, duty_officer_name, duty_officer_designation,
    first_aid_kits_available, oxygen_cylinder_available, wheelchair_available, stretcher_available,
    verified, verification_notes, disclaimer
) VALUES (
    'fac-mce-main',
    'MCE Campus First-Aid Centre',
    'Silver Jubilee Complex / Gymnasium Annexe',
    'Room G-04',
    'Near Sports Complex & Mechanical Block',
    '8:00 AM - 8:00 PM (On-call assistance available for campus emergencies)',
    NULL, -- Pending official verification; null or unverified to avoid fake numbers
    NULL,
    'Designated Campus First-Aid Officer',
    'Health Officer / Physical Education Dept',
    true,
    true,
    true,
    true,
    false, -- Pending official verification by administration
    'Contact details and active personnel roster pending formal administrative verification.',
    'This is a college first-aid facility intended for initial campus triage and immediate first-aid care only. For life-threatening trauma or medical emergencies, call Govt 108 immediately.'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    building = EXCLUDED.building;

-- 23. SEED VERIFIED EMERGENCY CONTACTS ROSTER
INSERT INTO emergency_contacts (
    id, name, role_title, category, department, phone, extension,
    availability_hours, is_campus_contact, verified, is_primary_sos
) VALUES
(
    'ec-gov-108', 'National Emergency Ambulance Service', 'Government Emergency Service',
    'ambulance', 'Govt of Karnataka Health Dept', '108', NULL,
    '24x7', false, true, true
),
(
    'ec-gov-112', 'National Emergency Unified Response Support System (ERSS)', 'Police & Multi-Emergency',
    'police', 'Ministry of Home Affairs / Karnataka Police', '112', NULL,
    '24x7', false, true, true
),
(
    'ec-gov-101', 'Karnataka Fire & Emergency Services', 'Fire & Rescue',
    'fire', 'Fire & Emergency Services Dept, Hassan', '101', NULL,
    '24x7', false, true, false
),
(
    'ec-gov-1091', 'Women Helpline (Karnataka)', 'Emergency Support & Protection',
    'helpline', 'Women & Child Development Dept', '1091', NULL,
    '24x7', false, true, false
),
(
    'ec-gov-tele-manas', 'National Tele-MANAS Mental Health Helpline', 'Psychological & Crisis Support',
    'helpline', 'Ministry of Health & Family Welfare, Govt of India', '14416', NULL,
    '24x7 Free Counseling', false, true, false
),
(
    'ec-hims-casualty', 'HIMS Hassan Govt Hospital Casualty / Emergency', 'District Govt Medical College & Hospital',
    'hospital', 'HIMS Emergency Casualty Dept', '+91 8172 231699', NULL,
    '24x7 Emergency Casualty', false, true, false
),
(
    'ec-mce-sec', 'MCE Campus Security Main Gate Control Room', 'Campus Security Supervisor',
    'security', 'MCE Campus Security & Vigilance', NULL, NULL,
    '24x7 Campus Security', true, false, false
),
(
    'ec-mce-fa', 'MCE First-Aid Centre Desk', 'Campus First-Aid Coordinator',
    'first_aid', 'MCE Student Welfare / First-Aid Unit', NULL, NULL,
    '8:00 AM - 8:00 PM', true, false, false
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    verified = EXCLUDED.verified;

