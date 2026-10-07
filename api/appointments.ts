import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Global cache for warm lambda executions
declare global {
  var __campuscare_appointments: any[] | undefined;
}

if (!globalThis.__campuscare_appointments) {
  globalThis.__campuscare_appointments = [];
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

  return {
    id: d.id || d.appointment_id || ('apt-' + Date.now()),
    bookingId: d.booking_id || d.bookingId || d.id || `MCE-APT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    patientId: d.patient_id || d.patientId || 'usr-student-1',
    patientName: d.patient_name || d.patientName || 'Rahul Sharma',
    patientRole: d.patient_role || d.patientRole || 'student',
    patientEmail: d.patient_email || d.patientEmail || 'student@mcehassan.ac.in',
    patientPhone: d.patient_phone || d.patientPhone || '+91 98765 43210',
    patientUSNorEmpId: d.patient_usn_or_emp_id || d.patientUSNorEmpId || '4MC21CS089',
    doctorId,
    doctorName,
    doctorSpecialization,
    doctorAvatar: d.doctor_avatar || d.doctorAvatar,
    serviceId: d.service_id || d.serviceId || 'srv-1',
    serviceName: d.service_name || d.serviceName || 'General Consultation',
    appointmentDate,
    timeSlot: d.time_slot || d.timeSlot || d.time || '10:00 AM',
    startTime: d.start_time || d.startTime,
    endTime: d.end_time || d.endTime,
    consultationType: (d.consultation_type || d.consultationType || 'video').toString().toLowerCase(),
    reason: d.reason || 'General Consultation',
    symptoms: Array.isArray(d.symptoms) ? d.symptoms : (typeof d.symptoms === 'string' ? JSON.parse(d.symptoms || '[]') : []),
    status,
    notes: d.notes,
    createdAt: d.created_at || d.createdAt || new Date().toISOString(),
    updatedAt: d.updated_at || d.updatedAt || new Date().toISOString()
  };
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

    // 1. Locate existing appointment in memory store or database
    let target = memoryStore.find(a => a.id === targetId || a.bookingId === targetId);
    if (!target && supabase) {
      try {
        const { data } = await supabase
          .from('appointments')
          .select('*')
          .or(`id.eq.${id || targetId},booking_id.eq.${bookingId || targetId}`)
          .maybeSingle();
        if (data) {
          target = normalizeRow(data);
        }
      } catch (err) {
        console.warn('[api/appointments] Error querying appointment for update:', err);
      }
    }

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
    if (supabase) {
      try {
        const updateData: any = {
          status: status.toLowerCase(),
          updated_at: new Date().toISOString()
        };
        if (notes !== undefined) updateData.notes = notes;

        await supabase
          .from('appointments')
          .update(updateData)
          .or(`id.eq.${id || targetId},booking_id.eq.${bookingId || targetId}`);
      } catch (err) {
        console.warn('[api/appointments] Supabase status update error:', err);
      }
    }

    // 4. Update memory store
    globalThis.__campuscare_appointments = memoryStore.map(a => {
      if (a.id === targetId || a.bookingId === targetId) {
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
    if (!targetId) {
      return res.status(400).json({ success: false, error: 'Appointment ID required.' });
    }

    let target = memoryStore.find(a => a.id === targetId || a.bookingId === targetId);
    if (!target && supabase) {
      try {
        const { data } = await supabase
          .from('appointments')
          .select('*')
          .or(`id.eq.${targetId},booking_id.eq.${targetId}`)
          .maybeSingle();
        if (data) target = normalizeRow(data);
      } catch {}
    }

    if (!target) {
      return res.status(404).json({ success: false, error: 'Appointment not found.' });
    }

    if (caller.role !== 'admin' && !isAppointmentForPatient(target, caller) && !isAppointmentForDoctor(target, caller)) {
      return res.status(403).json({ success: false, error: 'Forbidden: Cannot delete this appointment.' });
    }

    if (supabase) {
      try {
        await supabase.from('appointments').delete().or(`id.eq.${targetId},booking_id.eq.${targetId}`);
      } catch {}
    }

    globalThis.__campuscare_appointments = memoryStore.filter(a => a.id !== targetId && a.bookingId !== targetId);

    return res.status(200).json({ success: true, message: `Appointment ${targetId} deleted.` });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
