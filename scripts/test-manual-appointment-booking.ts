// CampusCare Manual Appointment Date & Time Selection Integration Test
import assert from 'node:assert';

// Setup Mock LocalStorage & Fetch
class MockLocalStorage {
  private store: Record<string, string> = {};
  getItem(key: string): string | null {
    return this.store[key] || null;
  }
  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }
  removeItem(key: string): void {
    delete this.store[key];
  }
  clear(): void {
    this.store = {};
  }
}

const mockStorage = new MockLocalStorage();
(globalThis as any).localStorage = mockStorage;

import {
  getTodayIST,
  isDateInPast,
  isDateToday,
  isTimeSlotInPastToday,
  getDayOfWeek,
  convert24To12,
  convert12To24,
  calculateSlotEndTime,
  formatAppointmentScheduleDisplay,
  getAppointmentEpochMsIST,
  checkAppointmentAccessIST
} from '../src/utils/dateUtils';
import { doctorAvailabilityService } from '../src/services/doctorAvailabilityService';
import { appointmentService } from '../src/services/appointmentService';

async function runManualBookingTests() {
  console.log('================================================================');
  console.log('  CAMPUSCARE MANUAL APPOINTMENT DATE & TIME SELECTION TESTS');
  console.log('================================================================\n');

  const todayIST = getTodayIST();
  console.log(`Current Asia/Kolkata (IST) Date: ${todayIST} (${getDayOfWeek(todayIST)})\n`);

  // ------------------------------------------------------------------
  // TEST 1: Time Conversion & Calculation Helpers
  // ------------------------------------------------------------------
  console.log('[TEST 1] Testing time conversion and 30-min duration helpers...');
  assert.strictEqual(convert24To12('10:00'), '10:00 AM');
  assert.strictEqual(convert24To12('11:30'), '11:30 AM');
  assert.strictEqual(convert24To12('12:00'), '12:00 PM');
  assert.strictEqual(convert24To12('13:30'), '01:30 PM');
  assert.strictEqual(convert24To12('14:45'), '02:45 PM');

  assert.strictEqual(convert12To24('10:00 AM'), '10:00');
  assert.strictEqual(convert12To24('11:30 AM'), '11:30');
  assert.strictEqual(convert12To24('12:00 PM'), '12:00');
  assert.strictEqual(convert12To24('01:30 PM'), '13:30');

  assert.strictEqual(calculateSlotEndTime('10:00', 30), '10:30');
  assert.strictEqual(calculateSlotEndTime('11:30', 30), '12:00');
  assert.strictEqual(calculateSlotEndTime('12:45', 30), '13:15');
  console.log('  ✓ TEST 1 PASSED: Time format conversions and end time calculations verified.\n');

  // ------------------------------------------------------------------
  // TEST 2: Future Date & Past Date Validation
  // ------------------------------------------------------------------
  console.log('[TEST 2] Testing future date and past date validation...');
  assert.strictEqual(isDateInPast('2020-01-01'), true, 'Past date 2020-01-01 must be flagged in past');
  assert.strictEqual(isDateInPast(todayIST), false, "Today's date is not in the past");
  assert.strictEqual(isDateInPast('2099-12-31'), false, 'Future date 2099-12-31 must not be in past');

  // Past date booking attempt should throw error
  let pastDateError = false;
  try {
    await appointmentService.createAppointment({
      doctorId: 'DOC001',
      doctorName: 'Dr. Kiran Gowda',
      doctorSpecialization: 'General Medicine',
      serviceId: 'srv-1',
      serviceName: 'General Consultation',
      appointmentDate: '2020-01-01',
      timeSlot: '10:00 AM',
      startTime: '10:00',
      endTime: '10:30',
      consultationType: 'video',
      reason: 'Old test',
      patientId: 'usr-student-1',
      patientName: 'Rahul Sharma',
      patientRole: 'student',
      patientEmail: 'student@mcehassan.ac.in',
      status: 'pending'
    });
  } catch (err: any) {
    pastDateError = true;
    assert(err.message.includes('past date'), 'Error should state cannot book for a past date');
  }
  assert.strictEqual(pastDateError, true, 'Booking for past date must be rejected');
  console.log('  ✓ TEST 2 PASSED: Past dates strictly rejected, future dates accepted.\n');

  // ------------------------------------------------------------------
  // TEST 3: Manual Appointment Booking with Custom Future Date & Time
  // ------------------------------------------------------------------
  console.log('[TEST 3] Testing manual date & time appointment booking...');
  // Pick future date: 5 days from today
  const [currY, currM, currD] = todayIST.split('-').map(Number);
  const futureDateObj = new Date(Date.UTC(currY, currM - 1, currD + 5));
  const futureDateStr = futureDateObj.toISOString().slice(0, 10);
  const manualTime = '11:30';
  const manualSlot = convert24To12(manualTime); // '11:30 AM'
  const manualEndTime = calculateSlotEndTime(manualTime, 30); // '12:00'

  const studentContext = {
    id: 'usr-student-rahul',
    role: 'student',
    email: 'rahul.sharma@mcehassan.ac.in',
    fullName: 'Rahul Sharma',
    usn: '4MC21CS089'
  };

  const bookedApt = await appointmentService.createAppointment({
    doctorId: 'DOC001',
    doctorName: 'Dr. Kiran Gowda',
    doctorSpecialization: 'General Medicine',
    serviceId: 'srv-1',
    serviceName: 'General Consultation',
    appointmentDate: futureDateStr,
    timeSlot: manualSlot,
    startTime: manualTime,
    endTime: manualEndTime,
    consultationType: 'video',
    reason: 'Fever and cold for 2 days',
    patientId: studentContext.id,
    patientName: studentContext.fullName,
    patientRole: studentContext.role,
    patientEmail: studentContext.email,
    patientUSNorEmpId: studentContext.usn,
    status: 'pending'
  }, studentContext);

  assert(bookedApt.id, 'Appointment must have an authoritative ID');
  assert(bookedApt.bookingId.startsWith('MCE-APT-2026-'), 'Booking ID must match MCE-APT-2026-XXXX format');
  assert.strictEqual(bookedApt.appointmentDate, futureDateStr, 'Appointment date must match selected date');
  assert.strictEqual(bookedApt.timeSlot, manualSlot, 'Time slot must match selected time');
  assert.strictEqual(bookedApt.startTime, manualTime, 'Start time must match selected time');
  assert.strictEqual(bookedApt.endTime, manualEndTime, 'End time must match calculated end time');
  assert.strictEqual(bookedApt.status, 'pending', 'Initial status must be pending');

  console.log(`  ✓ Created Appointment: ${bookedApt.bookingId}`);
  console.log(`    Date: ${bookedApt.appointmentDate}, Slot: ${bookedApt.timeSlot}`);
  console.log(`    Patient: ${bookedApt.patientName}, Doctor: ${bookedApt.doctorName}\n`);

  // ------------------------------------------------------------------
  // TEST 4: Double Booking Prevention Across Patients
  // ------------------------------------------------------------------
  console.log('[TEST 4] Testing double-booking prevention for the same doctor and slot...');
  let doubleBookingRejected = false;
  const studentBContext = {
    id: 'usr-student-ananya',
    role: 'student',
    email: 'ananya.p@mcehassan.ac.in',
    fullName: 'Ananya P',
    usn: '4MC21CS015'
  };

  try {
    // Student B attempts to book the same doctor (DOC001) at the same date and time
    await appointmentService.createAppointment({
      doctorId: 'DOC001',
      doctorName: 'Dr. Kiran Gowda',
      doctorSpecialization: 'General Medicine',
      serviceId: 'srv-1',
      serviceName: 'General Consultation',
      appointmentDate: futureDateStr,
      timeSlot: manualSlot,
      startTime: manualTime,
      endTime: manualEndTime,
      consultationType: 'video',
      reason: 'Headache',
      patientId: studentBContext.id,
      patientName: studentBContext.fullName,
      patientRole: studentBContext.role,
      patientEmail: studentBContext.email,
      status: 'pending'
    }, studentBContext);
  } catch (err: any) {
    doubleBookingRejected = true;
    console.log(`  Expected double booking rejection caught: "${err.message}"`);
    assert(
      err.message.includes('already booked') || err.message.includes('already reserved'),
      'Error message must indicate slot is already booked'
    );
  }
  assert.strictEqual(doubleBookingRejected, true, 'Second booking for the same doctor and slot MUST be rejected');
  console.log('  ✓ TEST 4 PASSED: Double booking is strictly prevented across different students.\n');

  // ------------------------------------------------------------------
  // TEST 5: Doctor Dashboard Retrieval & Identity Preservation
  // ------------------------------------------------------------------
  console.log('[TEST 5] Testing Doctor Dashboard retrieval and schedule preservation...');
  const doctorContext = {
    id: 'usr-doctor-kiran',
    doctorId: 'DOC001',
    role: 'doctor',
    email: 'doctor.kiran@mcehassan.ac.in',
    fullName: 'Dr. Kiran Gowda'
  };

  const doctorAppointments = await appointmentService.getAppointments(doctorContext);
  const doctorApt = doctorAppointments.find(a => a.bookingId === bookedApt.bookingId);
  assert(doctorApt, `Doctor dashboard must find appointment ${bookedApt.bookingId}`);
  assert.strictEqual(doctorApt.appointmentDate, bookedApt.appointmentDate, 'Doctor view must show identical date');
  assert.strictEqual(doctorApt.timeSlot, bookedApt.timeSlot, 'Doctor view must show identical time slot');
  assert.strictEqual(doctorApt.patientName, studentContext.fullName, 'Doctor view must show identical patient name');
  console.log('  ✓ TEST 5 PASSED: Doctor dashboard retrieves authoritative record with identical details.\n');

  // ------------------------------------------------------------------
  // TEST 6: Doctor Accept Booking Without Altering Date/Time
  // ------------------------------------------------------------------
  console.log('[TEST 6] Testing Doctor Accept action preserving schedule...');
  await appointmentService.updateAppointmentStatus(bookedApt.id, 'confirmed', 'Accepted for video consultation', doctorContext);

  const updatedAppointments = await appointmentService.getAppointments(doctorContext);
  const updatedApt = updatedAppointments.find(a => a.id === bookedApt.id);
  assert(updatedApt, 'Updated appointment must exist');
  assert.strictEqual(updatedApt.status, 'confirmed', 'Status must be updated to confirmed');
  assert.strictEqual(updatedApt.appointmentDate, futureDateStr, 'Appointment date must remain unchanged');
  assert.strictEqual(updatedApt.timeSlot, manualSlot, 'Appointment timeSlot must remain unchanged');
  assert.strictEqual(updatedApt.startTime, manualTime, 'Appointment startTime must remain unchanged');
  console.log(`  ✓ Doctor accepted appointment. Status: ${updatedApt.status}, Date: ${updatedApt.appointmentDate}, Time: ${updatedApt.timeSlot}`);
  console.log('  ✓ TEST 6 PASSED: Doctor accept does NOT modify student-selected date and time.\n');

  // ------------------------------------------------------------------
  // TEST 7: Video Consultation Policy Lock Check
  // ------------------------------------------------------------------
  console.log('[TEST 7] Testing Video Consultation policy time-lock on future appointment...');
  const accessFuture = checkAppointmentAccessIST(updatedApt);
  assert.strictEqual(accessFuture.isStatusPermitted, true, 'Confirmed status is permitted');
  assert.strictEqual(accessFuture.isTimeReached, false, 'Future appointment scheduled time has NOT arrived yet');
  assert.strictEqual(accessFuture.isAccessible, false, 'Future consultation must be locked');
  assert(accessFuture.message.includes(manualSlot), 'Lock message must inform user when consultation will be available');
  console.log(`  Access message: "${accessFuture.message}"`);

  // Now test access for an appointment whose time HAS arrived
  const pastEpochScheduled = getAppointmentEpochMsIST(todayIST, '08:00 AM');
  assert(pastEpochScheduled !== null, 'Scheduled epoch ms must be calculated');
  const accessCurrent = checkAppointmentAccessIST({
    appointmentDate: todayIST,
    timeSlot: '08:00 AM',
    startTime: '08:00',
    status: 'confirmed'
  }, pastEpochScheduled + 60000); // simulate server time after scheduled time
  assert.strictEqual(accessCurrent.isAccessible, true, 'Appointment whose scheduled time has arrived must be accessible');
  console.log('  ✓ TEST 7 PASSED: Video consultation unlocks strictly according to configured policy.\n');

  // ------------------------------------------------------------------
  // TEST 8: Timezone Conversion & Display Consistency
  // ------------------------------------------------------------------
  console.log('[TEST 8] Testing Timezone Conversion & Display Consistency...');
  const scheduleDisplay = formatAppointmentScheduleDisplay(futureDateStr, manualSlot, manualTime);
  assert.strictEqual(scheduleDisplay.dateIST, futureDateStr);
  assert.strictEqual(scheduleDisplay.timeSlotIST, manualSlot);
  assert(scheduleDisplay.displayIST.includes('IST'));
  assert(scheduleDisplay.displayFullIST.includes('IST'));
  console.log(`  Formatted IST Display: ${scheduleDisplay.displayFullIST}`);
  console.log(`  User Local Timezone: ${scheduleDisplay.localTimezone}`);
  console.log(`  Is Local Timezone Different: ${scheduleDisplay.isLocalDifferent}`);
  console.log('  ✓ TEST 8 PASSED: Timezone conversion and display formatting verified.\n');

  console.log('================================================================');
  console.log('  ALL 8 TESTS PASSED SUCCESSFULLY! MANUAL BOOKING VERIFIED.');
  console.log('================================================================\n');
}

runManualBookingTests().catch(err => {
  console.error('FATAL TEST FAILURE:', err);
  process.exit(1);
});
