// CampusCare Real Calendar & Appointment Booking Test Suite
import assert from 'node:assert';

// 1. Setup Mock LocalStorage
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
  generateMonthGrid,
  formatDateFull
} from '../src/utils/dateUtils';
import { doctorAvailabilityService } from '../src/services/doctorAvailabilityService';
import { appointmentService } from '../src/services/appointmentService';

async function runCalendarAppointmentTests() {
  console.log('========================================================');
  console.log('  CAMPUSCARE REAL CALENDAR & APPOINTMENT TEST SUITE');
  console.log('========================================================\n');

  const todayIST = getTodayIST();
  console.log(`Current Asia/Kolkata (IST) Date: ${todayIST} (${getDayOfWeek(todayIST)})\n`);

  // ----------------------------------------------------
  // TEST 1: Select today's date -> Past time slots disabled
  // ----------------------------------------------------
  console.log("[TEST 1] Testing today's date and past time slot handling...");
  const todaySlots = await doctorAvailabilityService.getAvailableSlots('DOC001', todayIST);
  console.log(`  Total slots generated for today: ${todaySlots.length}`);
  const pastSlots = todaySlots.filter(s => s.bookedReason === 'Time slot has passed');
  console.log(`  Past slots disabled for today: ${pastSlots.length}`);
  todaySlots.forEach(s => {
    const isPast = isTimeSlotInPastToday(s.startTime);
    if (isPast) {
      assert.strictEqual(s.isAvailable, false, `Slot ${s.slot} is in the past for today but was marked available`);
      assert.strictEqual(s.bookedReason, 'Time slot has passed');
    }
  });
  console.log("  ✓ TEST 1 PASSED: Past time slots for today are properly disabled\n");

  // ----------------------------------------------------
  // TEST 2: Select tomorrow -> Available slots shown according to doctor's availability
  // ----------------------------------------------------
  console.log("[TEST 2] Testing tomorrow's date available slots...");
  const [y, m, d] = todayIST.split('-').map(Number);
  const tomorrowObj = new Date(y, m - 1, d + 1);
  const tomorrowStr = `${tomorrowObj.getFullYear()}-${String(tomorrowObj.getMonth() + 1).padStart(2, '0')}-${String(tomorrowObj.getDate()).padStart(2, '0')}`;
  const tomorrowDay = getDayOfWeek(tomorrowStr);

  const tomorrowSlots = await doctorAvailabilityService.getAvailableSlots('DOC001', tomorrowStr);
  console.log(`  Tomorrow: ${tomorrowStr} (${tomorrowDay})`);
  if (tomorrowDay === 'Sunday') {
    assert.strictEqual(tomorrowSlots.length, 0, 'DOC001 does not work on Sunday');
    console.log("  ✓ Tomorrow is Sunday; doctor is off duty");
  } else {
    assert(tomorrowSlots.length > 0, 'Doctor should have active consultation slots on working day');
    const available = tomorrowSlots.filter(s => s.isAvailable);
    assert(available.length > 0, 'Doctor should have available slots for tomorrow');
    console.log(`  ✓ Generated ${tomorrowSlots.length} clinical slots (${available.length} available)`);
  }
  console.log("  ✓ TEST 2 PASSED: Tomorrow's slots match doctor's clinical duty schedule\n");

  // ----------------------------------------------------
  // TEST 3: Navigate to next month -> Future dates selectable
  // ----------------------------------------------------
  console.log('[TEST 3] Testing calendar grid navigation to next month...');
  const nextMonthY = m === 12 ? y + 1 : y;
  const nextMonthM = m === 12 ? 1 : m + 1;
  const nextMonthGrid = generateMonthGrid(nextMonthY, nextMonthM);

  const nextMonthDays = nextMonthGrid.filter(c => c.isCurrentMonth);
  assert(nextMonthDays.length >= 28, 'Next month should have at least 28 days');
  nextMonthDays.forEach(cell => {
    assert.strictEqual(cell.isPast, false, `Date ${cell.dateStr} in next month should not be marked past`);
  });
  console.log(`  ✓ Generated ${nextMonthDays.length} days for ${nextMonthY}-${String(nextMonthM).padStart(2, '0')}`);
  console.log('  ✓ TEST 3 PASSED: Future dates in next month are selectable and not disabled\n');

  // ----------------------------------------------------
  // TEST 4: Navigate to next year -> Future years selectable (e.g. 2027, 2028)
  // ----------------------------------------------------
  console.log('[TEST 4] Testing calendar grid navigation to future years (2027, 2028)...');
  const futureYear2027Grid = generateMonthGrid(2027, 1); // 15 January 2027
  const jan15_2027 = futureYear2027Grid.find(c => c.dateStr === '2027-01-15');
  assert(jan15_2027 !== undefined, '15 January 2027 must be present in grid');
  assert.strictEqual(jan15_2027.isPast, false, '15 January 2027 must not be past');

  const futureYear2028Grid = generateMonthGrid(2028, 8); // 20 August 2028
  const aug20_2028 = futureYear2028Grid.find(c => c.dateStr === '2028-08-20');
  assert(aug20_2028 !== undefined, '20 August 2028 must be present in grid');
  assert.strictEqual(aug20_2028.isPast, false, '20 August 2028 must not be past');

  console.log(`  ✓ 15 January 2027 is valid and selectable (${formatDateFull('2027-01-15')})`);
  console.log(`  ✓ 20 August 2028 is valid and selectable (${formatDateFull('2028-08-20')})`);
  console.log('  ✓ TEST 4 PASSED: Future years navigation operates correctly without range limitation\n');

  // ----------------------------------------------------
  // TEST 5: Select a Sunday when doctor is unavailable -> No booking slots
  // ----------------------------------------------------
  console.log('[TEST 5] Testing doctor availability on Sunday (Doctor OFF day)...');
  // Find the next Sunday
  let checkDateObj = new Date(y, m - 1, d);
  while (checkDateObj.getDay() !== 0) { // 0 is Sunday
    checkDateObj.setDate(checkDateObj.getDate() + 1);
  }
  const sundayStr = `${checkDateObj.getFullYear()}-${String(checkDateObj.getMonth() + 1).padStart(2, '0')}-${String(checkDateObj.getDate()).padStart(2, '0')}`;
  assert.strictEqual(getDayOfWeek(sundayStr), 'Sunday');

  const sundaySlots = await doctorAvailabilityService.getAvailableSlots('DOC001', sundayStr);
  assert.strictEqual(sundaySlots.length, 0, 'DOC001 should have 0 slots on Sunday');
  console.log(`  ✓ Sunday (${sundayStr}) returned 0 slots for Dr. Kiran Gowda (DOC001)`);
  console.log('  ✓ TEST 5 PASSED: Doctor off-days correctly yield zero available slots\n');

  // ----------------------------------------------------
  // TEST 6: Select a past date -> Date disabled / rejected
  // ----------------------------------------------------
  console.log('[TEST 6] Testing past date prevention...');
  const pastDateStr = '2025-01-01';
  assert.strictEqual(isDateInPast(pastDateStr), true, '2025-01-01 must be recognized as in the past');

  const pastSlotsResult = await doctorAvailabilityService.getAvailableSlots('DOC001', pastDateStr);
  assert.strictEqual(pastSlotsResult.length, 0, 'Past dates must return 0 slots');

  // Also verify booking attempt on past date throws error
  let pastBookingFailed = false;
  try {
    await appointmentService.createAppointment({
      doctorId: 'DOC001',
      doctorName: 'Dr. Kiran Gowda',
      doctorSpecialization: 'General Medicine',
      serviceId: 'srv-1',
      serviceName: 'General Consultation',
      appointmentDate: pastDateStr,
      timeSlot: '10:00 AM',
      startTime: '10:00',
      endTime: '10:30',
      consultationType: 'video',
      reason: 'Testing past date rejection',
      symptoms: ['Fever'],
      patientId: 'usr-student-1',
      patientName: 'Rahul Sharma',
      patientRole: 'student',
      patientEmail: 'rahul.sharma@mcehassan.ac.in',
      patientPhone: '+91 98765 43210',
      patientUSNorEmpId: '4MC21CS089',
      status: 'pending'
    });
  } catch (err: any) {
    pastBookingFailed = true;
    assert(err.message.includes('past date'), 'Error message should indicate past date');
  }
  assert.strictEqual(pastBookingFailed, true, 'Booking for past date must be rejected');
  console.log('  ✓ Past dates return 0 slots and createAppointment rejects them with clear error');
  console.log('  ✓ TEST 6 PASSED: Past dates are completely prevented from booking\n');

  // ----------------------------------------------------
  // TEST 7: Select already-booked slot -> Cannot book duplicate appointment
  // ----------------------------------------------------
  console.log('[TEST 7] Testing double-booking prevention...');
  // Find a valid future working day (Monday - Saturday)
  let futureWorkDateObj = new Date(y, m - 1, d + 7);
  while (futureWorkDateObj.getDay() === 0) {
    futureWorkDateObj.setDate(futureWorkDateObj.getDate() + 1);
  }
  const testBookingDate = `${futureWorkDateObj.getFullYear()}-${String(futureWorkDateObj.getMonth() + 1).padStart(2, '0')}-${String(futureWorkDateObj.getDate()).padStart(2, '0')}`;
  const testTimeSlot = '10:30 AM';
  const testStartTime = '10:30';
  const testEndTime = '11:00';

  // First booking
  const firstApt = await appointmentService.createAppointment({
    doctorId: 'DOC001',
    doctorName: 'Dr. Kiran Gowda',
    doctorSpecialization: 'General Medicine',
    serviceId: 'srv-1',
    serviceName: 'General Consultation',
    appointmentDate: testBookingDate,
    timeSlot: testTimeSlot,
    startTime: testStartTime,
    endTime: testEndTime,
    consultationType: 'video',
    reason: 'Initial consultation',
    symptoms: ['Headache'],
    patientId: 'usr-student-1',
    patientName: 'Rahul Sharma',
    patientRole: 'student',
    patientEmail: 'rahul.sharma@mcehassan.ac.in',
    patientPhone: '+91 98765 43210',
    patientUSNorEmpId: '4MC21CS089',
    status: 'pending'
  });
  assert(firstApt && firstApt.id, 'First booking should succeed');
  console.log(`  ✓ Initial appointment created successfully: ${firstApt.bookingId} for ${testBookingDate} at ${testTimeSlot}`);

  // Now attempt duplicate booking for the SAME doctor, date, and slot
  let doubleBookingCaught = false;
  let doubleBookingMsg = '';
  try {
    await appointmentService.createAppointment({
      doctorId: 'DOC001',
      doctorName: 'Dr. Kiran Gowda',
      doctorSpecialization: 'General Medicine',
      serviceId: 'srv-1',
      serviceName: 'General Consultation',
      appointmentDate: testBookingDate,
      timeSlot: testTimeSlot,
      startTime: testStartTime,
      endTime: testEndTime,
      consultationType: 'video',
      reason: 'Conflicting appointment attempt',
      symptoms: ['Cough'],
      patientId: 'usr-student-2',
      patientName: 'Pooja Patil',
      patientRole: 'student',
      patientEmail: 'pooja.patil@mcehassan.ac.in',
      patientPhone: '+91 98765 43211',
      patientUSNorEmpId: '4MC21CS090',
      status: 'pending'
    });
  } catch (err: any) {
    doubleBookingCaught = true;
    doubleBookingMsg = err.message;
  }
  assert.strictEqual(doubleBookingCaught, true, 'Duplicate booking must throw an error');
  assert(
    doubleBookingMsg.includes('already booked') || doubleBookingMsg.includes('Time slot no longer available'),
    `Expected double booking error message, got: "${doubleBookingMsg}"`
  );
  console.log(`  ✓ Double booking caught with expected message: "${doubleBookingMsg}"`);

  // Also verify that getAvailableSlots reflects this slot as unavailable
  const updatedSlots = await doctorAvailabilityService.getAvailableSlots('DOC001', testBookingDate);
  const bookedSlotCheck = updatedSlots.find(s => s.slot === testTimeSlot);
  assert(bookedSlotCheck !== undefined);
  assert.strictEqual(bookedSlotCheck.isAvailable, false);
  assert.strictEqual(bookedSlotCheck.bookedReason, 'Slot already reserved');
  console.log('  ✓ getAvailableSlots correctly marks reserved slot as isAvailable: false');
  console.log('  ✓ TEST 7 PASSED: Double booking is prevented both in slot generator and booking transaction\n');

  // ----------------------------------------------------
  // TEST 8: Select valid future date + available slot -> Saved successfully
  // ----------------------------------------------------
  console.log('[TEST 8] Testing valid future date booking and persistence in YYYY-MM-DD format...');
  const validSlot = updatedSlots.find(s => s.isAvailable);
  assert(validSlot !== undefined, 'There should be another available slot');

  const secondApt = await appointmentService.createAppointment({
    doctorId: 'DOC001',
    doctorName: 'Dr. Kiran Gowda',
    doctorSpecialization: 'General Medicine',
    serviceId: 'srv-1',
    serviceName: 'General Consultation',
    appointmentDate: testBookingDate,
    timeSlot: validSlot.slot,
    startTime: validSlot.startTime,
    endTime: validSlot.endTime,
    consultationType: 'video',
    reason: 'Follow-up consultation',
    symptoms: ['Fever'],
    patientId: 'usr-student-1',
    patientName: 'Rahul Sharma',
    patientRole: 'student',
    patientEmail: 'rahul.sharma@mcehassan.ac.in',
    patientPhone: '+91 98765 43210',
    patientUSNorEmpId: '4MC21CS089',
    status: 'pending'
  });

  assert(secondApt && secondApt.id, 'Appointment should be saved');
  assert.strictEqual(secondApt.appointmentDate, testBookingDate, 'Date must be stored in YYYY-MM-DD');
  assert(!secondApt.appointmentDate.includes('Wed'), 'Date must NOT be stored as formatted UI string');
  assert.strictEqual(secondApt.timeSlot, validSlot.slot);
  assert.strictEqual(secondApt.status, 'pending');

  const allApts = await appointmentService.getAppointments();
  const found = allApts.find(a => a.id === secondApt.id);
  assert(found !== undefined, 'Saved appointment must exist in appointment repository');
  console.log(`  ✓ Appointment ${secondApt.bookingId} saved and retrieved: ${secondApt.appointmentDate} at ${secondApt.timeSlot}`);
  console.log('  ✓ TEST 8 PASSED: Appointment successfully created, validated, and persisted\n');

  console.log('========================================================');
  console.log('  ALL 8 REAL CALENDAR & APPOINTMENT TESTS PASSED! ✓');
  console.log('========================================================\n');
}

runCalendarAppointmentTests().catch(err => {
  console.error('\n❌ Calendar appointment test suite failed:', err);
  process.exit(1);
});
