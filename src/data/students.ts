import { User } from '../types';

export const mockUsers: User[] = [
  {
    id: 'usr-student-1',
    email: 'rahul.sharma@mcehassan.ac.in',
    role: 'student',
    fullName: 'Rahul Sharma',
    phone: '+91 98765 43210',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200',
    createdAt: '2025-08-10T10:00:00Z',
    usn: '4MC21CS089',
    branch: 'Computer Science & Engineering',
    semester: 7,
    section: 'B',
    hostelRoom: 'Kavery Hostel, Block A, Room 304',
    bloodGroup: 'O+ Positive',
    allergies: ['Penicillin', 'Dust Mites'],
    emergencyContactName: 'Rajesh Sharma (Father)',
    emergencyContactPhone: '+91 94480 11223'
  },
  {
    id: 'usr-doctor-1',
    email: 'dr.priyarao@mcehassan.ac.in',
    role: 'doctor',
    fullName: 'Dr. Priya Rao',
    phone: '+91 8172 240501',
    avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200',
    createdAt: '2024-01-15T08:00:00Z',
    doctorId: 'MCE-MED-001',
    specialization: 'General Medicine & Campus Physician',
    qualification: 'MBBS, MD (General Medicine)',
    licenseNumber: 'KMC/2012/67843',
    experienceYears: 12,
    bio: 'Lead Medical Officer at MCE Health Centre Hassan.',
    rating: 4.9,
    isAvailable: true,
    roomNumber: 'MCE Health Centre Room 101'
  },
  {
    id: 'usr-faculty-1',
    email: 'suresh.kumar@mcehassan.ac.in',
    role: 'faculty',
    fullName: 'Prof. Suresh Kumar H.N.',
    phone: '+91 98451 98765',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    createdAt: '2024-02-20T09:00:00Z',
    employeeId: 'MCE-FAC-CSE-014',
    department: 'Computer Science & Engineering',
    designation: 'Associate Professor & HOD In-charge',
    bloodGroup: 'B+ Positive',
    emergencyContactName: 'Geetha Suresh (Spouse)',
    emergencyContactPhone: '+91 98451 98766'
  },
  {
    id: 'usr-admin-1',
    email: 'admin.health@mcehassan.ac.in',
    role: 'admin',
    fullName: 'Dr. B.S. Anand',
    phone: '+91 8172 240500',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200',
    createdAt: '2023-01-01T00:00:00Z',
    employeeId: 'MCE-ADMIN-MED-001',
    department: 'MCE Campus Health Administration',
    designation: 'Campus Health Director'
  }
];
