import { NotificationItem } from '../types';

export const mockNotifications: NotificationItem[] = [
  {
    id: 'notif-1',
    userId: 'usr-student-1',
    title: 'Appointment Confirmed',
    message: 'Your teleconsultation with Dr. Priya Rao is confirmed for tomorrow at 10:00 AM.',
    type: 'appointment',
    link: '/consultation/apt-101',
    isRead: false,
    timestamp: '2026-09-17T08:30:00Z'
  },
  {
    id: 'notif-2',
    userId: 'usr-student-1',
    title: 'Medicine Reminder: Afternoon Dose',
    message: 'Time to take Trypsin Chymotrypsin (Chymoral Forte) - 30 mins before food.',
    type: 'reminder',
    link: '/medications',
    isRead: false,
    timestamp: '2026-09-17T07:45:00Z'
  },
  {
    id: 'notif-3',
    userId: 'usr-student-1',
    title: 'Campus Health Advisory',
    message: 'Seasonal viral flu precaution drive at MCE Health Center: Free vitamin supplements and steam stations available.',
    type: 'system',
    link: '/services',
    isRead: true,
    timestamp: '2026-09-16T12:00:00Z'
  },
  {
    id: 'notif-4',
    userId: 'usr-doctor-1',
    title: 'New Consultation Request',
    message: 'Rahul Sharma (4MC21CS089) requested a video appointment for tomorrow at 10:00 AM.',
    type: 'appointment',
    link: '/doctor/dashboard',
    isRead: false,
    timestamp: '2026-09-17T08:30:00Z'
  },
  {
    id: 'notif-5',
    userId: 'usr-admin-1',
    title: 'Campus Emergency Protocol Standby',
    message: 'Campus ambulance inspection completed. 24x7 driver roster updated for September 2026.',
    type: 'emergency',
    link: '/emergency',
    isRead: true,
    timestamp: '2026-09-15T09:00:00Z'
  }
];
