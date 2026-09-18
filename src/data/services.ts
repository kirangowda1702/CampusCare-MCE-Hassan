import { HealthService } from '../types';

export const mockServices: HealthService[] = [
  {
    id: 'srv-1',
    name: 'General Medicine & Primary Care',
    slug: 'general-medicine',
    category: 'General Healthcare',
    description: 'Comprehensive evaluation for fevers, cough, fatigue, stomach aches, flu, headaches, and general health diagnostics.',
    iconName: 'Stethoscope',
    isCampusFree: true,
    availableDoctorsCount: 2,
    commonSymptoms: ['Fever', 'Cough & Cold', 'Headache', 'Abdominal Pain', 'Fatigue']
  },
  {
    id: 'srv-2',
    name: 'Mental Health & Student Counseling',
    slug: 'mental-health',
    category: 'Mental Wellness',
    description: 'Confidential support for exam pressure, hostel adjustment, anxiety, stress, insomnia, and depression.',
    iconName: 'Brain',
    isCampusFree: true,
    availableDoctorsCount: 1,
    commonSymptoms: ['Exam Anxiety', 'Insomnia / Sleep Issues', 'Depressed Mood', 'Panic Attacks', 'Burnout']
  },
  {
    id: 'srv-3',
    name: 'Dermatology & Skin Care',
    slug: 'dermatology',
    category: 'Specialist Care',
    description: 'Treatment for acne, fungal infections, allergic rashes, dandruff, hair thinning, and sun burns.',
    iconName: 'Sparkles',
    isCampusFree: true,
    availableDoctorsCount: 1,
    commonSymptoms: ['Acne Breakouts', 'Skin Rash / Itching', 'Fungal Infection', 'Hair Fall', 'Eczema']
  },
  {
    id: 'srv-4',
    name: 'Orthopedics & Sports Injury',
    slug: 'orthopedics',
    category: 'Specialist Care',
    description: 'Care for college sports injuries, ankle sprains, knee pain, lower back discomfort, and ergonomic issues.',
    iconName: 'Activity',
    isCampusFree: true,
    availableDoctorsCount: 1,
    commonSymptoms: ['Ankle Sprain', 'Back Pain from Sitting', 'Joint Pain', 'Muscle Strain', 'Wrist Pain']
  },
  {
    id: 'srv-5',
    name: 'Dental Care & Oral Hygiene',
    slug: 'dental-care',
    category: 'Dental',
    description: 'Oral screenings, toothache remedies, cavity checks, wisdom tooth pain guidance, and scaling.',
    iconName: 'Smile',
    isCampusFree: true,
    availableDoctorsCount: 1,
    commonSymptoms: ['Toothache', 'Bleeding Gums', 'Wisdom Tooth Pain', 'Bad Breath', 'Sensitivity']
  },
  {
    id: 'srv-6',
    name: 'Eye Care & Vision Strain',
    slug: 'eye-care',
    category: 'Specialist Care',
    description: 'Diagnosis of computer vision syndrome, blurry vision, dry eyes, allergic conjunctivitis, and optical prescription checks.',
    iconName: 'Eye',
    isCampusFree: true,
    availableDoctorsCount: 1,
    commonSymptoms: ['Digital Eye Strain', 'Red Eyes / Burning', 'Blurry Vision', 'Watery Eyes']
  },
  {
    id: 'srv-7',
    name: 'Nutrition & Dietetics',
    slug: 'nutrition-diet',
    category: 'Wellness',
    description: 'Guidance on balanced hostel diet plans, weight management, anemia prevention, and sports nutrition.',
    iconName: 'Apple',
    isCampusFree: true,
    availableDoctorsCount: 1,
    commonSymptoms: ['Hostel Diet Nutrition', 'Weight Management', 'Iron Deficiency / Anemia', 'Digestive Issues']
  },
  {
    id: 'srv-8',
    name: 'First Aid & Minor Trauma',
    slug: 'first-aid',
    category: 'Emergency / Urgent',
    description: 'Immediate dressing for lab burns, playground cuts, heat stroke, minor fractures, and wound disinfection.',
    iconName: 'ShieldAlert',
    isCampusFree: true,
    availableDoctorsCount: 2,
    commonSymptoms: ['Lab Chemical Spill', 'Cut / Bleeding Wound', 'Burn', 'Fainting / Dizziness']
  },
  {
    id: 'srv-9',
    name: 'Physiotherapy & Ergonomics',
    slug: 'physiotherapy',
    category: 'Rehabilitation',
    description: 'Post-injury physical recovery, neck stiffness from coding/laptop usage, and posture correction.',
    iconName: 'HeartPulse',
    isCampusFree: true,
    availableDoctorsCount: 1,
    commonSymptoms: ['Tech Neck', 'Shoulder Stiffness', 'Post-Fracture Rehab', 'Sciatica']
  },
  {
    id: 'srv-10',
    name: 'Campus Pharmacy & Diagnostics',
    slug: 'pharmacy-diagnostics',
    category: 'Support Services',
    description: 'Dispensing essential generic medicines, rapid blood sugar/BP tests, CBC samples, and dengue testing.',
    iconName: 'Pill',
    isCampusFree: true,
    availableDoctorsCount: 1,
    commonSymptoms: ['Blood Test Requisition', 'Prescription Refill', 'Blood Pressure Check']
  }
];
