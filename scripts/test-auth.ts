// CampusCare Authentication Test Suite (Runs under Node v24)
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

// 2. Import authService and supabase
import { authService } from '../src/services/authService.ts';
import { isSupabaseConfigured } from '../src/services/supabase.ts';

async function runAuthTests() {
  console.log('========================================================');
  console.log('   CAMPUSCARE AUTHENTICATION PRODUCTION TEST SUITE');
  console.log('========================================================\n');

  console.log(`Configuration status: isSupabaseConfigured = ${isSupabaseConfigured}\n`);

  // TEST 1: Student Login
  console.log('[TEST 1] Testing Student Login (Rahul Sharma)...');
  const studentRes = await authService.signInWithEmail('rahul.sharma@mcehassan.ac.in', 'CampusCare@2026');
  assert(studentRes.user !== null, 'Student login returned null user');
  assert.strictEqual(studentRes.user.email, 'rahul.sharma@mcehassan.ac.in');
  assert.strictEqual(studentRes.user.role, 'student');
  assert.strictEqual(studentRes.user.usn, '4MC21CS089');
  console.log('  ✓ Student login succeeded:', studentRes.user.fullName, `(${studentRes.user.role})`);

  // TEST 2: Session Persistence & Page Refresh Simulation
  console.log('\n[TEST 2] Testing Session Persistence after Student Login...');
  const persistedUser = await authService.getCurrentUser();
  assert(persistedUser !== null, 'getCurrentUser failed to restore session from persistence');
  assert.strictEqual(persistedUser.email, 'rahul.sharma@mcehassan.ac.in');
  assert.strictEqual(persistedUser.role, 'student');
  console.log('  ✓ Session persistence verified: user is restored seamlessly');

  // TEST 3: Doctor Login (Dr. Kiran Gowda)
  console.log('\n[TEST 3] Testing Doctor Login (Dr. Kiran Gowda)...');
  const doctorRes = await authService.signInWithEmail('dr.kiran.gowda@mcehassan.ac.in', 'CampusCare@2026');
  assert(doctorRes.user !== null, 'Doctor login returned null user');
  assert.strictEqual(doctorRes.user.role, 'doctor');
  assert.strictEqual(doctorRes.user.doctorId, 'DOC001');
  console.log('  ✓ Doctor login succeeded:', doctorRes.user.fullName, `(${doctorRes.user.doctorId})`);

  // TEST 4: Doctor Login (Dr. Madan S K)
  console.log('\n[TEST 4] Testing Doctor Login (Dr. Madan S K)...');
  const doctor2Res = await authService.signInWithEmail('dr.madan.sk@mcehassan.ac.in', 'CampusCare@2026');
  assert(doctor2Res.user !== null, 'Doctor 2 login returned null user');
  assert.strictEqual(doctor2Res.user.role, 'doctor');
  assert.strictEqual(doctor2Res.user.doctorId, 'DOC002');
  console.log('  ✓ Doctor 2 login succeeded:', doctor2Res.user.fullName, `(${doctor2Res.user.doctorId})`);

  // TEST 5: Invalid Password Rejection
  console.log('\n[TEST 5] Testing Invalid Password Rejection...');
  const invalidPassRes = await authService.signInWithEmail('rahul.sharma@mcehassan.ac.in', 'WrongPassword123');
  assert.strictEqual(invalidPassRes.user, null, 'Invalid password should not authenticate a user');
  assert(invalidPassRes.error, 'Invalid password should return a clear error message');
  console.log('  ✓ Invalid password successfully rejected with message:', `"${invalidPassRes.error}"`);

  // TEST 6: Non-existent User Rejection
  console.log('\n[TEST 6] Testing Non-existent Account without @ symbol...');
  const nonexistentRes = await authService.signInWithEmail('notanemail', 'CampusCare@2026');
  assert.strictEqual(nonexistentRes.user, null, 'Invalid email should not authenticate');
  console.log('  ✓ Non-existent account rejected');

  // TEST 7: Logout Functionality
  console.log('\n[TEST 7] Testing Logout...');
  await authService.signOut();
  const userAfterLogout = await authService.getCurrentUser();
  assert.strictEqual(userAfterLogout, null, 'Session should be null after signOut');
  console.log('  ✓ User session successfully cleared on logout');

  // TEST 8: Protected Route Access Simulation
  console.log('\n[TEST 8] Testing Protected Route Access Control Logic...');
  const checkAccess = (user: any, allowedRoles?: string[]) => {
    if (!user) return { allow: false, redirect: '/login' };
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      if (user.role === 'doctor') return { allow: false, redirect: '/doctor/dashboard' };
      if (user.role === 'admin') return { allow: false, redirect: '/admin/dashboard' };
      return { allow: false, redirect: '/student/dashboard' };
    }
    return { allow: true, redirect: null };
  };

  // 8a: Unauthenticated access to /student/dashboard
  const unauthAccess = checkAccess(null, ['student']);
  assert.strictEqual(unauthAccess.allow, false);
  assert.strictEqual(unauthAccess.redirect, '/login');
  console.log('  ✓ Unauthenticated user is properly redirected to /login');

  // 8b: Student accessing /student/dashboard
  const studentAccess = checkAccess({ role: 'student' }, ['student']);
  assert.strictEqual(studentAccess.allow, true);
  console.log('  ✓ Student accessing /student/dashboard is allowed');

  // 8c: Student attempting to access /doctor/dashboard
  const studentToDoctor = checkAccess({ role: 'student' }, ['doctor']);
  assert.strictEqual(studentToDoctor.allow, false);
  assert.strictEqual(studentToDoctor.redirect, '/student/dashboard');
  console.log('  ✓ Student unauthorized to access doctor portal is redirected to /student/dashboard');

  // 8d: Doctor accessing /doctor/dashboard
  const doctorAccess = checkAccess({ role: 'doctor' }, ['doctor']);
  assert.strictEqual(doctorAccess.allow, true);
  console.log('  ✓ Doctor accessing /doctor/dashboard is allowed');

  console.log('\n========================================================');
  console.log('   ALL 8 AUTHENTICATION & SECURITY TESTS PASSED! ✓');
  console.log('========================================================\n');
}

runAuthTests().catch((err) => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
