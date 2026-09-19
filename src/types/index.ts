export type UserRole = 'student' | 'faculty' | 'staff' | 'doctor' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  phone: string;
  avatarUrl?: string;
  createdAt: string;
  // Student-specific
  usn?: string;
  branch?: string;
  semester?: number;
  section?: string;
  hostelRoom?: string;
  // Faculty/Staff specific
  employeeId?: string;
  department?: string;
  designation?: string;
  // Doctor-specific
  doctorId?: string;
  specialization?: string;
  qualification?: string;
  licenseNumber?: string;
  experienceYears?: number;
  bio?: string;
  rating?: number;
  isAvailable?: boolean;
  roomNumber?: string;
  // Medical Info
  bloodGroup?: string;
  allergies?: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

export type ConsultationType = 'video' | 'in_person' | 'chat';
export type AppointmentStatus = 
  | 'pending' 
  | 'confirmed' 
  | 'rejected' 
  | 'rescheduled' 
  | 'cancelled' 
  | 'in_progress' 
  | 'completed';

export interface Appointment {
  id: string;
  bookingId: string;
  patientId: string;
  patientName: string;
  patientRole: UserRole;
  patientEmail: string;
  patientPhone: string;
  patientUSNorEmpId?: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialization: string;
  doctorAvatar?: string;
  serviceId: string;
  serviceName: string;
  appointmentDate: string; // YYYY-MM-DD
  timeSlot: string; // e.g. "09:30 AM"
  startTime?: string; // e.g. "09:30"
  endTime?: string; // e.g. "10:00"
  consultationType: ConsultationType;
  reason: string;
  symptoms: string[];
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  isDemo?: boolean;
  dataSource?: string;
}

export type ProviderStatus = 'directory_only' | 'onboarded' | 'active' | 'inactive';
export type ConsentStatus = 'pending' | 'verified' | 'declined';

export interface DoctorAvailability {
  id: string;
  doctorId: string;
  dayOfWeek: string; // 'Monday' | 'Tuesday' | ... | 'Daily'
  startTime: string; // '09:00'
  endTime: string; // '17:00'
  slotDurationMinutes: number; // 15, 20, 30
  breakStartTime?: string; // '13:00'
  breakEndTime?: string; // '14:00'
  isOnlineEnabled: boolean;
  isInPersonEnabled: boolean;
  isActive: boolean;
}

export interface Doctor {
  id: string;
  doctorId?: string;
  doctor_name: string;
  name: string; // compatibility alias
  specialization: string;
  qualification: string;
  hospital_name: string;
  city: string;
  state: string;
  availability_days?: string[];
  availability_time?: string;
  availableDays: string[];
  timeSlots: string[];
  consultation_type?: ConsultationType;
  source_url: string;
  data_source: string;
  verified_public_profile: boolean;
  provider_status: ProviderStatus;
  campuscare_enabled: boolean;
  appointment_enabled: boolean;
  video_consultation_enabled: boolean;
  consent_status: ConsentStatus;
  consent_date?: string | null;
  image_url?: string;
  avatarUrl?: string; // image alias
  image_source_url?: string;
  image_source_type?: string;
  image_verified?: boolean;
  initials?: string;
  isAvailable?: boolean;
  phone?: string;
  email?: string;
  roomNumber?: string;
  experienceYears?: number;
  rating?: number;
  reviewsCount?: number;
  reviews?: number;
  consultationFee?: number;
  medicalRegistrationNumber?: string;
  registrationAuthority?: string;
  address?: string;
  lastVerified?: string;
  isCampusDoctor?: boolean;
  isDemo?: boolean;
  dataSource?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HealthService {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  iconName: string;
  isCampusFree: boolean;
  availableDoctorsCount: number;
  commonSymptoms: string[];
}

export interface Medication {
  id: string;
  medicineName: string;
  dosage: string;
  frequency: string; // e.g., "1-0-1 (Twice daily)"
  timing: 'before_food' | 'after_food' | 'with_food' | 'as_needed';
  durationDays: number;
  instructions?: string;
}

export interface Prescription {
  id: string;
  prescriptionCode: string;
  appointmentId?: string;
  patientId: string;
  patientName: string;
  patientUSN?: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialization: string;
  doctorLicense: string;
  diagnosis: string;
  medications: Medication[];
  advice: string;
  prescribedDate: string;
  followUpDate?: string;
}

export type ReminderStatus = 'upcoming' | 'taken' | 'missed';

export interface MedicineReminder {
  id: string;
  prescriptionId?: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  timeOfDay: string; // e.g., "08:00 AM"
  mealTiming: 'Before Food' | 'After Food' | 'Anytime';
  startDate: string;
  endDate: string;
  status: ReminderStatus;
  takenAt?: string;
}

export type RecordType = 'lab_report' | 'prescription' | 'vaccination' | 'discharge_summary' | 'consultation_notes' | 'other';

export interface MedicalRecord {
  id: string;
  patientId: string;
  title: string;
  recordType: RecordType;
  recordDate: string;
  doctorOrLabName: string;
  fileUrl: string;
  fileSize: string;
  fileType: 'pdf' | 'image' | 'doc';
  notes?: string;
  tags: string[];
}

export type TriageRiskLevel = 'low' | 'moderate' | 'high' | 'emergency';

export interface SymptomOption {
  id: string;
  label: string;
  category: string;
  description: string;
}

export interface SymptomTriageResult {
  riskLevel: TriageRiskLevel;
  summary: string;
  possibleConditions: Array<{
    name: string;
    likelihood: 'Possible' | 'Moderate' | 'High';
    explanation: string;
  }>;
  recommendedDepartment: string;
  recommendedAction: string;
  isEmergency: boolean;
  adviceNotes: string[];
}

export type EmergencyCampusStatus =
  | 'REQUESTED'
  | 'ACKNOWLEDGED'
  | 'RESPONDER_ASSIGNED'
  | 'ASSISTANCE_IN_PROGRESS'
  | 'REFERRED'
  | 'RESOLVED'
  | 'CANCELLED'
  | 'active'
  | 'dispatched'
  | 'resolved'
  | 'cancelled';

export interface EmergencyRequest {
  id: string;
  userId?: string;
  callerName: string;
  callerPhone: string;
  locationDetails: string;
  description?: string;
  latitude?: number | null;
  longitude?: number | null;
  hasLocationPermission?: boolean;
  locationShared?: boolean;
  emergencyType: 'Cardiac' | 'Accident/Trauma' | 'Respiratory Distress' | 'Severe Allergic Reaction' | 'Unconscious' | 'Other' | string;
  status: EmergencyCampusStatus;
  responderName?: string;
  dispatchedUnit?: string;
  firstAidContactedAt?: string | null;
  responderAssignedAt?: string | null;
  assistanceStartedAt?: string | null;
  referredAt?: string | null;
  resolvedAt?: string | null;
  timestamp: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FirstAidCentre {
  id: string;
  name: string;
  location: string;
  building: string;
  roomNumber: string;
  officialPhone?: string | null;
  secondaryPhone?: string | null;
  operatingHours: string;
  afterHoursContact?: string | null;
  services: string[];
  source?: string;
  verified: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  category: 'Campus First Aid' | 'Campus Security' | 'College Emergency Contact' | 'External Emergency Service' | 'Hospital';
  phone: string;
  description?: string;
  availableHours: string;
  source?: string;
  verified: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface HospitalReferral {
  id: string;
  emergencyRequestId: string;
  hospitalId: string;
  hospitalName?: string;
  referredBy: string;
  reason: string;
  status: 'REFERRED' | 'ACCEPTED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt?: string;
}

export interface Hospital {
  id: string;
  name: string;
  category: 'Campus Health Center' | 'Government Teaching Hospital' | 'Private Multispeciality' | 'Specialty Clinic' | string;
  address: string;
  city?: string;
  state?: string;
  distanceKm?: number;
  liveDistance?: number;
  phone?: string | null;
  emergencyNumber?: string | null;
  website?: string | null;
  ambulanceAvailable?: boolean;
  emergencyAvailable?: boolean;
  openHours?: string | null;
  facilities?: string[];
  services?: string[];
  lat: number;
  lng: number;
  latitude?: number;
  longitude?: number;
  sourceUrl?: string | null;
  dataSource?: string;
  verified: boolean;
  isCampusFacility?: boolean;
  isDemo?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Pharmacy {
  id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  distanceKm?: number;
  liveDistance?: number;
  phone?: string | null;
  website?: string | null;
  homeDelivery?: boolean;
  openHours?: string | null;
  lat: number;
  lng: number;
  latitude?: number;
  longitude?: number;
  sourceUrl?: string | null;
  dataSource?: string;
  verified: boolean;
  isCampusFacility?: boolean;
  isDemo?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DiagnosticCentre {
  id: string;
  name: string;
  address: string;
  city?: string;
  state?: string;
  distanceKm?: number;
  liveDistance?: number;
  phone?: string | null;
  website?: string | null;
  homeSampleCollection?: boolean;
  openHours?: string | null;
  facilities?: string[];
  services?: string[];
  lat: number;
  lng: number;
  latitude?: number;
  longitude?: number;
  sourceUrl?: string | null;
  dataSource?: string;
  verified: boolean;
  isCampusFacility?: boolean;
  isDemo?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'appointment' | 'prescription' | 'reminder' | 'emergency' | 'system';
  link?: string;
  isRead: boolean;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  text: string;
  timestamp: string;
  isDoctorNote?: boolean;
}
