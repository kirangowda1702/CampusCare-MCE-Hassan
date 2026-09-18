import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { AppointmentProvider } from './context/AppointmentContext';
import { MedicalProvider } from './context/MedicalContext';
import { EmergencyProvider } from './context/EmergencyContext';

// Layouts & Guards
import { MainLayout } from './layouts/MainLayout';
import { DashboardLayout } from './layouts/DashboardLayout';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { LoadingSkeleton } from './components/feedback/LoadingSkeleton';

// Lazy Loaded Pages for Performance & Bundle Splitting
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

// Dashboards
const StudentDashboard = lazy(() => import('./pages/StudentDashboard').then(m => ({ default: m.StudentDashboard })));
const DoctorDashboard = lazy(() => import('./pages/DoctorDashboard').then(m => ({ default: m.DoctorDashboard })));
const FacultyDashboard = lazy(() => import('./pages/FacultyDashboard').then(m => ({ default: m.FacultyDashboard })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));

// Healthcare Action Pages
const AppointmentBookingPage = lazy(() => import('./pages/AppointmentBookingPage').then(m => ({ default: m.AppointmentBookingPage })));
const AppointmentListPage = lazy(() => import('./pages/AppointmentListPage').then(m => ({ default: m.AppointmentListPage })));
const AppointmentDetailPage = lazy(() => import('./pages/AppointmentDetailPage').then(m => ({ default: m.AppointmentDetailPage })));
const DoctorDirectoryPage = lazy(() => import('./pages/DoctorDirectoryPage').then(m => ({ default: m.DoctorDirectoryPage })));
const DoctorDetailPage = lazy(() => import('./pages/DoctorDetailPage').then(m => ({ default: m.DoctorDetailPage })));
const SymptomCheckerPage = lazy(() => import('./pages/SymptomCheckerPage').then(m => ({ default: m.SymptomCheckerPage })));
const VideoConsultationPage = lazy(() => import('./pages/VideoConsultationPage').then(m => ({ default: m.VideoConsultationPage })));
const MedicalRecordsPage = lazy(() => import('./pages/MedicalRecordsPage').then(m => ({ default: m.MedicalRecordsPage })));
const PrescriptionsPage = lazy(() => import('./pages/PrescriptionsPage').then(m => ({ default: m.PrescriptionsPage })));
const MedicineRemindersPage = lazy(() => import('./pages/MedicineRemindersPage').then(m => ({ default: m.MedicineRemindersPage })));
const EmergencyPage = lazy(() => import('./pages/EmergencyPage').then(m => ({ default: m.EmergencyPage })));
const HospitalsPage = lazy(() => import('./pages/HospitalsPage').then(m => ({ default: m.HospitalsPage })));
const PharmaciesPage = lazy(() => import('./pages/PharmaciesPage').then(m => ({ default: m.PharmaciesPage })));
const DiagnosticCentresPage = lazy(() => import('./pages/DiagnosticCentresPage').then(m => ({ default: m.DiagnosticCentresPage })));
const HealthcareServicesPage = lazy(() => import('./pages/HealthcareServicesPage').then(m => ({ default: m.HealthcareServicesPage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then(m => ({ default: m.NotificationsPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppointmentProvider>
          <MedicalProvider>
            <EmergencyProvider>
              <BrowserRouter>
                <Suspense
                  fallback={
                    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
                      <LoadingSkeleton type="card" count={3} />
                    </div>
                  }
                >
                  <Routes>
                    {/* Public Portal Routes */}
                    <Route path="/" element={<MainLayout />}>
                      <Route index element={<HomePage />} />
                      <Route path="login" element={<LoginPage />} />
                      <Route path="register" element={<RegisterPage />} />
                      <Route path="forgot-password" element={<ForgotPasswordPage />} />
                      <Route path="doctors" element={<DoctorDirectoryPage />} />
                      <Route path="doctors/:id" element={<DoctorDetailPage />} />
                      <Route path="services" element={<HealthcareServicesPage />} />
                      <Route path="symptom-checker" element={<SymptomCheckerPage />} />
                      <Route path="hospitals" element={<HospitalsPage />} />
                      <Route path="pharmacies" element={<PharmaciesPage />} />
                      <Route path="diagnostics" element={<DiagnosticCentresPage />} />
                      <Route path="emergency" element={<EmergencyPage />} />
                      <Route path="*" element={<NotFoundPage />} />
                    </Route>

                    {/* Protected Dashboards & Healthcare Hubs */}
                    <Route
                      element={
                        <ProtectedRoute>
                          <DashboardLayout />
                        </ProtectedRoute>
                      }
                    >
                      {/* Role-Specific Guarded Dashboard Routes */}
                      <Route
                        path="student/dashboard"
                        element={
                          <ProtectedRoute allowedRoles={['student', 'faculty', 'staff', 'admin', 'doctor']}>
                            <StudentDashboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="doctor/dashboard"
                        element={
                          <ProtectedRoute allowedRoles={['doctor', 'admin']}>
                            <DoctorDashboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="faculty/dashboard"
                        element={
                          <ProtectedRoute allowedRoles={['faculty', 'staff', 'admin']}>
                            <FacultyDashboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="admin/dashboard"
                        element={
                          <ProtectedRoute allowedRoles={['admin']}>
                            <AdminDashboard />
                          </ProtectedRoute>
                        }
                      />

                      {/* Authenticated Clinical Actions */}
                      <Route path="appointments" element={<AppointmentListPage />} />
                      <Route path="appointments/book" element={<AppointmentBookingPage />} />
                      <Route path="appointments/:id" element={<AppointmentDetailPage />} />
                      <Route path="consultation/:id" element={<VideoConsultationPage />} />
                      <Route path="medical-records" element={<MedicalRecordsPage />} />
                      <Route path="prescriptions" element={<PrescriptionsPage />} />
                      <Route path="medications" element={<MedicineRemindersPage />} />
                      <Route path="notifications" element={<NotificationsPage />} />
                      <Route path="profile" element={<ProfilePage />} />
                      <Route path="settings" element={<SettingsPage />} />
                    </Route>
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </EmergencyProvider>
          </MedicalProvider>
        </AppointmentProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
