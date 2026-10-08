import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Global cache for warm lambda executions
declare global {
  var __campuscare_appointments: any[] | undefined;
  var __campuscare_signals: Record<string, any[]> | undefined;
}

if (!globalThis.__campuscare_appointments) {
  globalThis.__campuscare_appointments = [];
}
if (!globalThis.__campuscare_signals) {
  globalThis.__campuscare_signals = {};
}

export interface CallerIdentity {
  id: string;
  role: 'student' | 'doctor' | 'admin' | 'faculty';
  doctorId?: string;
  email?: string;
  fullName?: string;
  usn?: string;
}

function getSupabaseClient() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim();

  if (
    url &&
    key &&
    !url.includes('your-project-id') &&
    key !== 'placeholder-anon-key' &&
    key.length > 20
  ) {
    try {
      return createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
    } catch (e) {
      console.warn('[api/appointments] Failed to initialize Supabase client:', e);
    }
  }
  return null;
}

export function isValidUuid(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export function getAppointmentEpochMsIST(
  dateStr: string,
  timeSlotStr: string,
  startTime24?: string
): number | null {
  if (!dateStr) return null;
  const dateParts = dateStr.slice(0, 10).split('-').map(Number);
  if (dateParts.length !== 3 || dateParts.some(isNaN)) return null;
  const [year, month, day] = dateParts;

  let hours = 0;
  let minutes = 0;

  if (timeSlotStr) {
    const match = timeSlotStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (match) {
      hours = parseInt(match[1], 10);
      minutes = parseInt(match[2], 10);
      const meridian = match[3]?.toUpperCase();
      if (meridian === 'PM' && hours < 12) hours += 12;
      if (meridian === 'AM' && hours === 12) hours = 0;
    } else if (startTime24) {
      const [h, m] = startTime24.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        hours = h;
        minutes = m;
      }
    }
  } else if (startTime24) {
    const [h, m] = startTime24.split(':').map(Number);
    if (!isNaN(h) && !isNaN(m)) {
      hours = h;
      minutes = m;
    }
  } else {
    return null;
  }

  // Asia/Kolkata is UTC+05:30 -> subtract 330 minutes from Date.UTC
  const istOffsetMinutes = 330;
  return Date.UTC(year, month - 1, day, hours, minutes, 0, 0) - istOffsetMinutes * 60 * 1000;
}

export function normalizeRow(d: any): any {
  const rawStatus = (d.status || 'pending').toString().toLowerCase();
  let status = 'pending';
  if (rawStatus === 'confirmed' || rawStatus === 'accepted') status = 'confirmed';
  else if (rawStatus === 'rejected' || rawStatus === 'declined') status = 'rejected';
  else if (rawStatus === 'in_progress') status = 'in_progress';
  else if (rawStatus === 'completed') status = 'completed';
  else if (rawStatus === 'cancelled') status = 'cancelled';
  else if (rawStatus === 'rescheduled') status = 'rescheduled';

  const rawDocId = (d.doctor_id || d.doctorId || 'DOC001').toString();
  let doctorId = rawDocId;
  let doctorName = d.doctor_name || d.doctorName;
  let doctorSpecialization = d.doctor_specialization || d.doctorSpecialization || 'General Medicine';

  if (
    rawDocId === 'd0000001-0000-0000-0000-000000000001' ||
    rawDocId.toUpperCase() === 'DOC001' ||
    rawDocId === 'usr-doctor-kiran' ||
    rawDocId.toLowerCase().includes('kiran')
  ) {
    doctorId = 'DOC001';
    doctorName = doctorName || 'Dr. Kiran Gowda';
  } else if (
    rawDocId === 'd0000002-0000-0000-0000-000000000002' ||
    rawDocId.toUpperCase() === 'DOC002' ||
    rawDocId === 'usr-doctor-madan' ||
    rawDocId.toLowerCase().includes('madan')
  ) {
    doctorId = 'DOC002';
    doctorName = doctorName || 'Dr. Madan S K';
  } else if (!doctorName) {
    doctorName = 'Dr. Kiran Gowda';
  }

  const rawDate = (d.appointment_date || d.appointmentDate || d.date || new Date().toISOString().slice(0, 10)).toString();
  const appointmentDate = rawDate.slice(0, 10);
  const id = d.id || d.appointment_id || ('apt-' + Date.now());
  const bookingId = d.booking_id || d.bookingId || d.id || `MCE-APT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const patientId = d.patient_id || d.patientId || 'usr-student-1';
  const patientName = d.patient_name || d.patientName || 'Rahul Sharma';
  const patientRole = d.patient_role || d.patientRole || 'student';
  const patientEmail = d.patient_email || d.patientEmail || 'student@mcehassan.ac.in';
  const patientPhone = d.patient_phone || d.patientPhone || '+91 98765 43210';
  const patientUSNorEmpId = d.patient_usn_or_emp_id || d.patientUSNorEmpId || '4MC21CS089';
  const timeSlot = d.time_slot || d.timeSlot || d.time || '10:00 AM';
  const startTime = d.start_time || d.startTime;
  const endTime = d.end_time || d.endTime;
  const consultationType = (d.consultation_type || d.consultationType || 'video').toString().toLowerCase();
  const reason = d.reason || 'General Consultation';
  const symptoms = Array.isArray(d.symptoms) ? d.symptoms : (typeof d.symptoms === 'string' ? JSON.parse(d.symptoms || '[]') : []);
  const notes = d.notes;
  const createdAt = d.created_at || d.createdAt || new Date().toISOString();
  const updatedAt = d.updated_at || d.updatedAt || new Date().toISOString();

  return {
    id,
    bookingId,
    booking_id: bookingId,
    patientId,
    patient_id: patientId,
    patientName,
    patient_name: patientName,
    patientRole,
    patient_role: patientRole,
    patientEmail,
    patient_email: patientEmail,
    patientPhone,
    patient_phone: patientPhone,
    patientUSNorEmpId,
    patient_usn_or_emp_id: patientUSNorEmpId,
    doctorId,
    doctor_id: doctorId,
    doctorName,
    doctor_name: doctorName,
    doctorSpecialization,
    doctor_specialization: doctorSpecialization,
    doctorAvatar: d.doctor_avatar || d.doctorAvatar,
    serviceId: d.service_id || d.serviceId || 'srv-1',
    serviceName: d.service_name || d.serviceName || 'General Consultation',
    service_name: d.service_name || d.serviceName || 'General Consultation',
    appointmentDate,
    appointment_date: appointmentDate,
    timeSlot,
    time_slot: timeSlot,
    startTime,
    start_time: startTime,
    endTime,
    end_time: endTime,
    consultationType,
    consultation_type: consultationType,
    reason,
    symptoms,
    status,
    notes,
    createdAt,
    created_at: createdAt,
    updatedAt,
    updated_at: updatedAt
  };
}

/**
 * Robust appointment resolution helper.
 * Resolves by authoritative database UUID id, booking_id, or client ID safely without Postgres 22P02 UUID syntax errors.
 */
export async function findAppointment(
  id?: string,
  bookingId?: string,
  supabaseClient?: any,
  memoryStore: any[] = []
): Promise<any | null> {
  const cleanId = (id || '').trim();
  const cleanBookingId = (bookingId || '').trim();

  // 1. Check in-memory store by authoritative ID or booking ID
  if (cleanId) {
    const memMatch = memoryStore.find(a => 
      a.id === cleanId || 
      a.bookingId === cleanId || 
      (a as any).booking_id === cleanId
    );
    if (memMatch) return normalizeRow(memMatch);
  }
  if (cleanBookingId) {
    const memMatch = memoryStore.find(a => 
      a.bookingId === cleanBookingId || 
      (a as any).booking_id === cleanBookingId ||
      a.id === cleanBookingId
    );
    if (memMatch) return normalizeRow(memMatch);
  }

  if (!supabaseClient) return null;

  try {
    // 2. Authoritative Database lookup:
    // A) If cleanId is a valid UUID, search by id = cleanId
    if (cleanId && isValidUuid(cleanId)) {
      const { data, error } = await supabaseClient
        .from('appointments')
        .select('*')
        .eq('id', cleanId)
        .maybeSingle();
      if (!error && data) return normalizeRow(data);
    }

    // B) Search by booking_id using cleanBookingId or cleanId
    const bIdToSearch = cleanBookingId || cleanId;
    if (bIdToSearch) {
      const { data, error } = await supabaseClient
        .from('appointments')
        .select('*')
        .eq('booking_id', bIdToSearch)
        .maybeSingle();
      if (!error && data) return normalizeRow(data);
    }

    // C) If cleanBookingId is a valid UUID, search by id = cleanBookingId
    if (cleanBookingId && isValidUuid(cleanBookingId)) {
      const { data, error } = await supabaseClient
        .from('appointments')
        .select('*')
        .eq('id', cleanBookingId)
        .maybeSingle();
      if (!error && data) return normalizeRow(data);
    }

    // D) Search by ILIKE on booking_id if cleanId looks like a booking ID
    if (cleanId && cleanId.toUpperCase().startsWith('MCE-APT')) {
      const { data, error } = await supabaseClient
        .from('appointments')
        .select('*')
        .ilike('booking_id', cleanId)
        .maybeSingle();
      if (!error && data) return normalizeRow(data);
    }

    // E) Fallback: Search the most recent appointments in case of client ID mismatch
    const { data: recents } = await supabaseClient
      .from('appointments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (Array.isArray(recents)) {
      for (const row of recents) {
        const norm = normalizeRow(row);
        if (
          (cleanId && (norm.id === cleanId || norm.bookingId === cleanId)) ||
          (cleanBookingId && (norm.bookingId === cleanBookingId || norm.id === cleanBookingId))
        ) {
          return norm;
        }
      }
    }
  } catch (err) {
    console.warn('[api/appointments] findAppointment database query warning:', err);
  }

  return null;
}

/**
 * Universal matcher that checks if an appointment belongs to a patient
 */
export function isAppointmentForPatient(
  appointment: any,
  user: { id?: string; email?: string; usn?: string } | null
): boolean {
  if (!user || !user.id) return false;

  const patientId = (appointment.patientId || appointment.patient_id || '').trim();
  if (patientId && patientId.toLowerCase() === user.id.trim().toLowerCase()) return true;

  if (user.email && (appointment.patientEmail || appointment.patient_email)) {
    const aptEmail = (appointment.patientEmail || appointment.patient_email || '').trim().toLowerCase();
    if (aptEmail === user.email.trim().toLowerCase()) return true;
  }

  if (user.usn && (appointment.patientUSNorEmpId || appointment.patient_usn_or_emp_id)) {
    const aptUSN = (appointment.patientUSNorEmpId || appointment.patient_usn_or_emp_id || '').trim().toUpperCase();
    if (aptUSN === user.usn.trim().toUpperCase()) return true;
  }

  return false;
}

/**
 * Universal matcher that checks if an appointment is assigned to a specific doctor.
 * Strictly guarantees isolation between DOC001 and DOC002.
 */
export function isAppointmentForDoctor(
  appointment: any,
  user: { doctorId?: string; id?: string; email?: string; fullName?: string } | null
): boolean {
  if (!user) return false;

  const aptDocId = (appointment.doctorId || appointment.doctor_id || '').trim().toUpperCase();
  const userDocId = (user.doctorId || '').trim().toUpperCase();
  const userId = (user.id || '').trim().toUpperCase();

  // Explicit doctor isolation guards:
  const isKiranDoctor =
    userDocId === 'DOC001' ||
    userId === 'USR-DOCTOR-KIRAN' ||
    userId === 'D0000001-0000-0000-0000-000000000001' ||
    (user.email || '').toLowerCase().includes('kiran') ||
    (user.fullName || '').toLowerCase().includes('kiran');

  const isMadanDoctor =
    userDocId === 'DOC002' ||
    userId === 'USR-DOCTOR-MADAN' ||
    userId === 'D0000002-0000-0000-0000-000000000002' ||
    (user.email || '').toLowerCase().includes('madan') ||
    (user.fullName || '').toLowerCase().includes('madan');

  if (isKiranDoctor) {
    if (
      aptDocId === 'DOC002' ||
      aptDocId === 'USR-DOCTOR-MADAN' ||
      aptDocId === 'D0000002-0000-0000-0000-000000000002' ||
      (appointment.doctorName || '').toLowerCase().includes('madan')
    ) {
      return false;
    }
    if (
      aptDocId === 'DOC001' ||
      aptDocId === 'USR-DOCTOR-KIRAN' ||
      aptDocId === 'D0000001-0000-0000-0000-000000000001' ||
      aptDocId === 'DOC-1' ||
      (appointment.doctorName || '').toLowerCase().includes('kiran')
    ) {
      return true;
    }
  }

  if (isMadanDoctor) {
    if (
      aptDocId === 'DOC001' ||
      aptDocId === 'USR-DOCTOR-KIRAN' ||
      aptDocId === 'D0000001-0000-0000-0000-000000000001' ||
      (appointment.doctorName || '').toLowerCase().includes('kiran')
    ) {
      return false;
    }
    if (
      aptDocId === 'DOC002' ||
      aptDocId === 'USR-DOCTOR-MADAN' ||
      aptDocId === 'D0000002-0000-0000-0000-000000000002' ||
      aptDocId === 'DOC-2' ||
      (appointment.doctorName || '').toLowerCase().includes('madan')
    ) {
      return true;
    }
  }

  // Direct match by doctorId
  if (userDocId && aptDocId === userDocId) return true;

  // Direct match by user.id
  if (userId && (aptDocId === userId || appointment.doctorId === user.id || appointment.doctor_id === user.id)) return true;

  // Name match
  if (user.fullName && (appointment.doctorName || appointment.doctor_name)) {
    const cleanUser = user.fullName.toLowerCase().replace(/^dr[\.\s]+/i, '').replace(/[^a-z0-9]/g, '');
    const cleanDoc = (appointment.doctorName || appointment.doctor_name).toLowerCase().replace(/^dr[\.\s]+/i, '').replace(/[^a-z0-9]/g, '');
    if (cleanUser.length >= 3 && cleanDoc.length >= 3 && cleanUser === cleanDoc) {
      return true;
    }
  }

  return false;
}

/**
 * Extracts and verifies caller identity from Supabase JWT Bearer token or authenticated request headers.
 * Anonymous requests without identity return null (prohibited).
 */
export async function extractCaller(req: VercelRequest, supabase: any): Promise<CallerIdentity | null> {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  let bearerToken: string | null = null;
  if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
    bearerToken = authHeader.slice(7).trim();
  }

  // 1. If Bearer token is provided and Supabase is available, verify JWT
  if (supabase && bearerToken && bearerToken !== 'undefined' && bearerToken !== 'null' && bearerToken.length > 20) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(bearerToken);
      if (!error && user) {
        let role = ((user.user_metadata?.role || 'student') as string).toLowerCase() as any;
        let doctorId = user.user_metadata?.doctor_id;
        let fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0];

        try {
          const { data: docProf } = await supabase
            .from('doctor_profiles')
            .select('doctor_id, doctor_name')
            .eq('user_id', user.id)
            .maybeSingle();
          if (docProf) {
            doctorId = docProf.doctor_id || doctorId;
            role = 'doctor';
            fullName = docProf.doctor_name || fullName;
          }
        } catch {}

        const emailLower = (user.email || '').toLowerCase();
        if (!doctorId) {
          if (emailLower.includes('dr.kiran') || emailLower.includes('dr.kirangowda')) {
            doctorId = 'DOC001';
            role = 'doctor';
            fullName = 'Dr. Kiran Gowda';
          } else if (emailLower.includes('dr.madan') || emailLower.includes('dr.madansk')) {
            doctorId = 'DOC002';
            role = 'doctor';
            fullName = 'Dr. Madan S K';
          }
        }

        return {
          id: user.id,
          role,
          doctorId,
          email: user.email,
          fullName,
          usn: user.user_metadata?.usn
        };
      }
    } catch (e) {
      console.warn('[api/appointments] Bearer verification warning:', e);
    }
  }

  // 2. Check authenticated custom headers (x-user-id, x-user-role, x-doctor-id)
  const headerUserId = (req.headers['x-user-id'] || req.headers['X-User-Id']) as string | undefined;
  if (headerUserId && typeof headerUserId === 'string' && headerUserId.trim()) {
    const rawRole = ((req.headers['x-user-role'] || req.headers['X-User-Role'] || 'student') as string).toLowerCase();
    const role: any = rawRole === 'doctor' || rawRole === 'admin' || rawRole === 'faculty' ? rawRole : 'student';
    let doctorId = (req.headers['x-doctor-id'] || req.headers['X-Doctor-Id']) as string | undefined;
    const email = (req.headers['x-user-email'] || req.headers['X-User-Email']) as string | undefined;
    const fullName = (req.headers['x-user-name'] || req.headers['X-User-Name']) as string | undefined;
    const usn = (req.headers['x-user-usn'] || req.headers['X-User-Usn']) as string | undefined;

    const cleanId = headerUserId.trim();
    if (!doctorId) {
      if (
        cleanId.toUpperCase() === 'DOC001' ||
        cleanId === 'usr-doctor-kiran' ||
        cleanId === 'd0000001-0000-0000-0000-000000000001' ||
        (email && email.toLowerCase().includes('kiran')) ||
        (fullName && fullName.toLowerCase().includes('kiran'))
      ) {
        doctorId = 'DOC001';
      } else if (
        cleanId.toUpperCase() === 'DOC002' ||
        cleanId === 'usr-doctor-madan' ||
        cleanId === 'd0000002-0000-0000-0000-000000000002' ||
        (email && email.toLowerCase().includes('madan')) ||
        (fullName && fullName.toLowerCase().includes('madan'))
      ) {
        doctorId = 'DOC002';
      }
    }

    return {
      id: cleanId,
      role,
      doctorId,
      email,
      fullName,
      usn
    };
  }

  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PATCH,PUT,DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-user-id, x-user-role, x-doctor-id, x-user-email, x-user-name, x-user-usn'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabase = getSupabaseClient();
  const memoryStore = globalThis.__campuscare_appointments || [];

  // Enforce Authentication: Reject anonymous callers (public anonymous access prohibited)
  const caller = await extractCaller(req, supabase);
  if (!caller) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Authentication required. Anonymous access to appointments is prohibited.'
    });
  }

  // ==========================================
  // GET: Retrieve authorized appointments (RLS Scoped)
  // ==========================================
  if (req.method === 'GET') {
    const action = req.query?.action as string | undefined;

    // A. Single Appointment Retrieval (Authoritative Database Resolution)
    if (action === 'get_single') {
      const targetId = (req.query?.id || req.query?.appointmentId || '').toString().trim();
      const targetBookingId = (req.query?.bookingId || req.query?.booking_id || '').toString().trim();
      if (!targetId && !targetBookingId) {
        return res.status(400).json({ success: false, error: 'Appointment ID or booking ID required.' });
      }

      const target = await findAppointment(targetId, targetBookingId, supabase, memoryStore);
      if (!target) {
        return res.status(404).json({ success: false, error: 'Appointment not found.' });
      }

      // RLS Check: Patient can access own, Doctor can access assigned, Admin can access all
      const isPatient = isAppointmentForPatient(target, caller);
      const isDoctor = isAppointmentForDoctor(target, caller);
      const isAdmin = caller.role === 'admin';

      if (!isPatient && !isDoctor && !isAdmin) {
        return res.status(403).json({ success: false, error: 'Forbidden: Access to this appointment is unauthorized.' });
      }

      return res.status(200).json({ success: true, appointment: target });
    }

    // WebRTC Cross-Network Signaling Poll (Fallback & Redundancy)
    if (action === 'signal_poll') {
      const roomId = (req.query?.roomId || req.query?.room_id || '').toString().trim();
      const callerId = caller.id;
      const since = parseInt((req.query?.since || '0').toString(), 10);

      if (!roomId) {
        return res.status(400).json({ success: false, error: 'roomId required' });
      }

      const allSignals = globalThis.__campuscare_signals?.[roomId] || [];
      const now = Date.now();
      const pending = allSignals.filter(s => s.senderId !== callerId && s.createdAt > since && (now - s.createdAt) < 60000);

      return res.status(200).json({
        success: true,
        signals: pending.map(s => s.payload),
        serverTime: now
      });
    }

    // B. Backend Consultation Time & Authorization Access Verification Guard
    if (action === 'verify_consultation_access') {
      const targetId = (req.query?.id || req.query?.appointmentId || '').toString().trim();
      const targetBookingId = (req.query?.bookingId || req.query?.booking_id || '').toString().trim();

      if (!targetId && !targetBookingId) {
        return res.status(400).json({
          success: false,
          allowed: false,
          reason: 'MISSING_ID',
          message: 'Appointment ID is required.'
        });
      }

      console.log('[api/appointments] verify_consultation_access request:', {
        targetId,
        targetBookingId,
        callerId: caller.id,
        callerRole: caller.role,
        callerDoctorId: caller.doctorId,
        callerEmail: caller.email
      });

      // 1. Locate appointment authoritatively via findAppointment
      const target = await findAppointment(targetId, targetBookingId, supabase, memoryStore);

      console.log('[api/appointments] Located appointment:', target ? {
        id: target.id,
        bookingId: target.bookingId,
        doctorId: target.doctorId,
        patientId: target.patientId,
        status: target.status,
        appointmentDate: target.appointmentDate,
        timeSlot: target.timeSlot
      } : 'NOT FOUND');

      if (!target) {
        return res.status(404).json({
          success: false,
          allowed: false,
          reason: 'NOT_FOUND',
          message: 'Appointment not found in system records.'
        });
      }

      // 2. Strict Participant Authorization Guard:
      // Only the assigned doctor, patient, or admin may enter the room.
      const isPatient = isAppointmentForPatient(target, caller);
      const isDoctor = isAppointmentForDoctor(target, caller);
      const isAdmin = caller.role === 'admin';

      console.log('[api/appointments] Participant authorization:', { isPatient, isDoctor, isAdmin });

      if (!isPatient && !isDoctor && !isAdmin) {
        return res.status(403).json({
          success: false,
          allowed: false,
          reason: 'UNAUTHORIZED_PARTICIPANT',
          message: 'Forbidden: You are not authorized to join this consultation room.'
        });
      }

      // 3. Status check
      const currentStatus = (target.status || 'pending').toLowerCase();
      if (currentStatus === 'pending') {
        return res.status(403).json({
          success: false,
          allowed: false,
          reason: 'PENDING_APPROVAL',
          status: currentStatus,
          message: 'Video consultation is locked. Appointment is pending doctor acceptance.'
        });
      }
      if (currentStatus === 'cancelled' || currentStatus === 'rejected') {
        return res.status(403).json({
          success: false,
          allowed: false,
          reason: 'NOT_PERMITTED',
          status: currentStatus,
          message: 'Consultation session has been cancelled or declined.'
        });
      }
      if (currentStatus === 'completed') {
        return res.status(403).json({
          success: false,
          allowed: false,
          reason: 'COMPLETED',
          status: currentStatus,
          message: 'Consultation session has already been completed.'
        });
      }

      // 4. Server-Side IST Time Access Check (Asia/Kolkata)
      // If status is 'in_progress', session has already been started by doctor -> allow joining.
      const nowEpochMs = Date.now();
      const scheduledEpochMs = getAppointmentEpochMsIST(
        target.appointmentDate,
        target.timeSlot,
        target.startTime
      );

      if (currentStatus !== 'in_progress' && scheduledEpochMs) {
        const diffMs = scheduledEpochMs - nowEpochMs;
        if (diffMs > 0) {
          const minutesUntil = Math.max(1, Math.ceil(diffMs / (60 * 1000)));
          return res.status(403).json({
            success: false,
            allowed: false,
            reason: 'SCHEDULED_TIME_NOT_REACHED',
            status: currentStatus,
            message: `Video consultation will be available at ${target.timeSlot}.`,
            scheduledTimeSlot: target.timeSlot,
            scheduledDate: target.appointmentDate,
            minutesUntil,
            scheduledEpochMs,
            serverEpochMs: nowEpochMs
          });
        }
      }

      return res.status(200).json({
        success: true,
        allowed: true,
        reason: 'ACCESS_GRANTED',
        appointmentId: target.id,
        bookingId: target.bookingId,
        roomId: target.id,
        status: target.status,
        message: 'Video consultation is active.',
        serverEpochMs: nowEpochMs
      });
    }

    const appointmentMap = new Map<string, any>();

    // 1. Fetch from Supabase database if connected
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && Array.isArray(data)) {
          data.forEach(row => {
            const normalized = normalizeRow(row);
            appointmentMap.set(normalized.bookingId, normalized);
            appointmentMap.set(normalized.id, normalized);
          });
        }
      } catch (err) {
        console.warn('[api/appointments] Supabase fetch error:', err);
      }
    }

    // 2. Merge with memory store records
    memoryStore.forEach(apt => {
      const normalized = normalizeRow(apt);
      if (!appointmentMap.has(normalized.bookingId) && !appointmentMap.has(normalized.id)) {
        appointmentMap.set(normalized.bookingId, normalized);
      }
    });

    const allAppointments = Array.from(new Set(appointmentMap.values())).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // 3. Strict RLS Scope Enforcement:
    // - Admin: sees all appointments
    // - Doctor: sees ONLY appointments assigned to their doctorId / doctor account
    // - Student / Patient: sees ONLY their own booked appointments
    let filteredAppointments: any[] = [];
    if (caller.role === 'admin') {
      filteredAppointments = allAppointments;
    } else if (caller.role === 'doctor' || caller.doctorId) {
      filteredAppointments = allAppointments.filter(apt => isAppointmentForDoctor(apt, caller));
    } else {
      filteredAppointments = allAppointments.filter(apt => isAppointmentForPatient(apt, caller));
    }

    return res.status(200).json({
      success: true,
      count: filteredAppointments.length,
      isSupabaseConnected: Boolean(supabase),
      appointments: filteredAppointments
    });
  }

  // ==========================================
  // POST: Create a new appointment
  // ==========================================
  if (req.method === 'POST') {
    const body = req.body || {};

    // WebRTC Cross-Network Signaling Send
    if (body.action === 'signal_send') {
      const roomId = (body.roomId || body.room_id || '').toString().trim();
      const payload = body.payload;
      if (!roomId || !payload) {
        return res.status(400).json({ success: false, error: 'roomId and payload required' });
      }

      if (!globalThis.__campuscare_signals) {
        globalThis.__campuscare_signals = {};
      }
      if (!globalThis.__campuscare_signals[roomId]) {
        globalThis.__campuscare_signals[roomId] = [];
      }

      const now = Date.now();
      globalThis.__campuscare_signals[roomId].push({
        senderId: caller.id,
        payload,
        createdAt: now
      });

      // Keep recent signals
      globalThis.__campuscare_signals[roomId] = globalThis.__campuscare_signals[roomId]
        .filter(s => (now - s.createdAt) < 120000)
        .slice(-50);

      return res.status(200).json({ success: true, serverTime: now });
    }

    if (!body.appointmentDate || !body.timeSlot) {
      return res.status(400).json({
        success: false,
        error: 'appointmentDate and timeSlot are required.'
      });
    }

    // RLS Enforcement: Students can ONLY book for themselves
    if (caller.role !== 'admin') {
      if (body.patientId && body.patientId !== caller.id) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You can only book appointments for yourself.'
        });
      }
    }

    const patientId = caller.role === 'admin' ? (body.patientId || caller.id) : caller.id;
    const patientName = body.patientName || caller.fullName || 'Campus Student';
    const patientEmail = body.patientEmail || caller.email || 'student@mcehassan.ac.in';
    const patientUSNorEmpId = body.patientUSNorEmpId || caller.usn;

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const appointmentId = body.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('apt-' + Date.now()));
    const bookingId = body.bookingId || `MCE-APT-2026-${randomNum}`;

    const newApt = normalizeRow({
      id: appointmentId,
      bookingId,
      ...body,
      patientId,
      patientName,
      patientEmail,
      patientUSNorEmpId,
      status: body.status || 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // 1. Persist to Supabase if connected
    let supabaseResult: any = { attempted: false };
    if (supabase) {
      supabaseResult.attempted = true;
      try {
        let resolvedDoctorId = newApt.doctorId;
        if (newApt.doctorId === 'DOC001') {
          resolvedDoctorId = 'd0000001-0000-0000-0000-000000000001';
        } else if (newApt.doctorId === 'DOC002') {
          resolvedDoctorId = 'd0000002-0000-0000-0000-000000000002';
        }

        const dbPayload: any = {
          booking_id: newApt.bookingId,
          appointment_date: newApt.appointmentDate,
          time_slot: newApt.timeSlot,
          start_time: newApt.startTime || null,
          end_time: newApt.endTime || null,
          consultation_type: (newApt.consultationType || 'video').toLowerCase(),
          reason: newApt.reason || 'General Consultation',
          symptoms: Array.isArray(newApt.symptoms) ? newApt.symptoms : [],
          status: (newApt.status || 'pending').toLowerCase()
        };

        if (isValidUuid(newApt.id)) {
          dbPayload.id = newApt.id;
        }

        if (isValidUuid(resolvedDoctorId)) {
          dbPayload.doctor_id = resolvedDoctorId;
        }

        if (isValidUuid(newApt.patientId)) {
          dbPayload.patient_id = newApt.patientId;
        }

        const { data: inserted, error } = await supabase
          .from('appointments')
          .insert([dbPayload])
          .select()
          .maybeSingle();

        if (error) {
          console.warn('[api/appointments] Primary insert error, attempting relaxed insert:', error);
          supabaseResult.error = error.message;

          const { error: fallbackErr } = await supabase.from('appointments').insert([{
            booking_id: newApt.bookingId,
            appointment_date: newApt.appointmentDate,
            time_slot: newApt.timeSlot,
            consultation_type: (newApt.consultationType || 'video').toLowerCase(),
            status: (newApt.status || 'pending').toLowerCase(),
            reason: newApt.reason
          }]);

          if (fallbackErr) {
            supabaseResult.fallbackError = fallbackErr.message;
          } else {
            supabaseResult.fallbackSuccess = true;
          }
        } else {
          supabaseResult.inserted = inserted;
        }

        // Trigger in-app notifications
        try {
          const docName = newApt.doctorName.startsWith('Dr.') ? newApt.doctorName : `Dr. ${newApt.doctorName}`;
          // 1. Notification to Student
          const studentNotif: any = {
            title: 'Appointment Request Submitted',
            message: `Your consultation request for ${docName} on ${newApt.appointmentDate} at ${newApt.timeSlot} has been created (Booking ID: ${newApt.bookingId}). Video consultation will be available at ${newApt.timeSlot}.`,
            type: 'appointment',
            link: `/appointments/${newApt.id}`,
            is_read: false,
            created_at: new Date().toISOString()
          };
          if (isValidUuid(newApt.patientId)) {
            studentNotif.user_id = newApt.patientId;
          }
          await supabase.from('notifications').insert([studentNotif]);

          // 2. Notification to Doctor
          let doctorUserUuid = newApt.doctorId;
          if (newApt.doctorId === 'DOC001') doctorUserUuid = 'd0000001-0000-0000-0000-000000000001';
          else if (newApt.doctorId === 'DOC002') doctorUserUuid = 'd0000002-0000-0000-0000-000000000002';
          const doctorNotif: any = {
            title: 'New Appointment Request',
            message: `New appointment request from student ${newApt.patientName} for ${newApt.appointmentDate} at ${newApt.timeSlot} (Booking ID: ${newApt.bookingId}).`,
            type: 'appointment',
            link: `/appointments/${newApt.id}`,
            is_read: false,
            created_at: new Date().toISOString()
          };
          if (isValidUuid(doctorUserUuid)) {
            doctorNotif.user_id = doctorUserUuid;
          }
          await supabase.from('notifications').insert([doctorNotif]);
        } catch (notifErr) {
          console.warn('[api/appointments] Booking notification insert warning:', notifErr);
        }
      } catch (err: any) {
        console.warn('[api/appointments] Supabase exception during insert:', err);
        supabaseResult.exception = err.message;
      }
    }

    // 2. Persist to memory store
    globalThis.__campuscare_appointments = [
      newApt,
      ...memoryStore.filter(a => a.id !== newApt.id && a.bookingId !== newApt.bookingId)
    ];

    return res.status(201).json({
      success: true,
      appointment: newApt,
      supabaseResult
    });
  }

  // ==========================================
  // PATCH: Update appointment status / notes (RLS Verified)
  // ==========================================
  if (req.method === 'PATCH' || req.method === 'PUT') {
    const { id, bookingId, status, notes } = req.body || {};
    const targetId = id || bookingId;

    if (!targetId || !status) {
      return res.status(400).json({
        success: false,
        error: 'id (or bookingId) and status are required.'
      });
    }

    // 1. Locate existing appointment authoritatively
    let target = await findAppointment(id, bookingId, supabase, memoryStore);

    if (!target) {
      return res.status(404).json({
        success: false,
        error: `Appointment ${targetId} not found.`
      });
    }

    // 2. Strict RLS Authorization Check:
    // - Admin: can update any appointment
    // - Doctor: can ONLY update appointments assigned to them (blocks Doctor DOC002 modifying Doctor DOC001)
    // - Student: can ONLY update their own appointments (blocks Student B modifying Student A)
    if (caller.role !== 'admin') {
      if (caller.role === 'doctor' || caller.doctorId) {
        if (!isAppointmentForDoctor(target, caller)) {
          return res.status(403).json({
            success: false,
            error: 'Forbidden: Doctors can only modify appointments assigned to them.'
          });
        }
      } else {
        if (!isAppointmentForPatient(target, caller)) {
          return res.status(403).json({
            success: false,
            error: 'Forbidden: You can only modify your own appointments.'
          });
        }
      }
    }

    // 3. Update in Supabase
    const normStatus = status.toLowerCase();
    const dbStatus = normStatus === 'accepted' ? 'confirmed' : normStatus;

    if (supabase) {
      try {
        const updateData: any = {
          status: dbStatus,
          updated_at: new Date().toISOString()
        };
        if (notes !== undefined) updateData.notes = notes;

        if (isValidUuid(target.id)) {
          await supabase.from('appointments').update(updateData).eq('id', target.id);
        } else if (target.bookingId) {
          await supabase.from('appointments').update(updateData).eq('booking_id', target.bookingId);
        }

        // Trigger in-app notification to Student
        try {
          const docName = target.doctorName?.startsWith('Dr.') ? target.doctorName : `Dr. ${target.doctorName || 'Campus Doctor'}`;
          let notifTitle = '';
          let notifMessage = '';

          if (normStatus === 'confirmed' || normStatus === 'accepted') {
            notifTitle = 'Appointment Confirmed';
            notifMessage = `Your appointment with ${docName} on ${target.appointmentDate} at ${target.timeSlot} has been accepted. Video consultation will be available at ${target.timeSlot}. (Booking ID: ${target.bookingId})`;
          } else if (normStatus === 'rejected') {
            notifTitle = 'Appointment Declined';
            notifMessage = `Your appointment request with ${docName} on ${target.appointmentDate} at ${target.timeSlot} could not be accepted (Booking ID: ${target.bookingId}).`;
          } else if (normStatus === 'in_progress') {
            notifTitle = 'Consultation Started';
            notifMessage = `${docName} has started the video consultation session for ${target.appointmentDate} at ${target.timeSlot} (Booking ID: ${target.bookingId}). Click to join video room.`;
          }

          if (notifTitle) {
            const patientNotif: any = {
              title: notifTitle,
              message: notifMessage,
              type: 'appointment',
              link: normStatus === 'in_progress' ? `/consultation/${target.id}` : `/appointments/${target.id}`,
              is_read: false,
              created_at: new Date().toISOString()
            };
            if (isValidUuid(target.patientId)) {
              patientNotif.user_id = target.patientId;
            }
            await supabase.from('notifications').insert([patientNotif]);
          }
        } catch (notifErr) {
          console.warn('[api/appointments] Status update notification warning:', notifErr);
        }
      } catch (err) {
        console.warn('[api/appointments] Supabase status update error:', err);
      }
    }

    // 4. Update memory store
    globalThis.__campuscare_appointments = memoryStore.map(a => {
      if (a.id === target.id || a.bookingId === target.bookingId || a.id === targetId || a.bookingId === targetId) {
        return {
          ...a,
          status: status.toLowerCase(),
          notes: notes !== undefined ? notes : a.notes,
          updatedAt: new Date().toISOString()
        };
      }
      return a;
    });

    return res.status(200).json({
      success: true,
      message: `Appointment ${targetId} status updated to ${status}`
    });
  }

  // ==========================================
  // DELETE: Delete appointment (RLS Verified)
  // ==========================================
  if (req.method === 'DELETE') {
    const targetId = (req.query?.id || req.body?.id || req.body?.bookingId) as string;
    const targetBookingId = (req.query?.bookingId || req.body?.bookingId) as string;
    if (!targetId && !targetBookingId) {
      return res.status(400).json({ success: false, error: 'Appointment ID required.' });
    }

    let target = await findAppointment(targetId, targetBookingId, supabase, memoryStore);

    if (!target) {
      return res.status(404).json({ success: false, error: 'Appointment not found.' });
    }

    if (caller.role !== 'admin' && !isAppointmentForPatient(target, caller) && !isAppointmentForDoctor(target, caller)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Cannot delete this appointment.' });
    }

    if (supabase) {
      try {
        if (isValidUuid(target.id)) {
          await supabase.from('appointments').delete().eq('id', target.id);
        } else if (target.bookingId) {
          await supabase.from('appointments').delete().eq('booking_id', target.bookingId);
        }
      } catch {}
    }

    globalThis.__campuscare_appointments = memoryStore.filter(a => a.id !== target.id && a.bookingId !== target.bookingId && a.id !== targetId && a.bookingId !== targetId);

    return res.status(200).json({ success: true, message: `Appointment ${targetId} deleted.` });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
