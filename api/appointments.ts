import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Global cache for warm lambda executions
declare global {
  var __campuscare_appointments: any[] | undefined;
}

if (!globalThis.__campuscare_appointments) {
  globalThis.__campuscare_appointments = [];
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PATCH,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabase = getSupabaseClient();
  const memoryStore = globalThis.__campuscare_appointments || [];

  // ==========================================
  // GET: Retrieve all appointments
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

    const appointments = Array.from(new Set(appointmentMap.values())).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return res.status(200).json({
      success: true,
      count: appointments.length,
      isSupabaseConnected: Boolean(supabase),
      appointments
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

    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const appointmentId = body.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : ('apt-' + Date.now()));
    const bookingId = body.bookingId || `MCE-APT-2026-${randomNum}`;

    const newApt = normalizeRow({
      id: appointmentId,
      bookingId,
      ...body,
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

          // Relaxed fallback: attempt insert without strict UUID foreign keys if FK failed
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
  // PATCH: Update appointment status / notes
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

    // 1. Update in Supabase
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

    // 2. Update memory store
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

  return res.status(405).json({ error: 'Method not allowed' });
}
