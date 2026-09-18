import { SymptomOption, SymptomTriageResult } from '../types';

export const mockSymptomsList: SymptomOption[] = [
  { id: 'fever_high', label: 'High Fever (>101°F)', category: 'General', description: 'Body temperature significantly above normal with chills' },
  { id: 'fever_mild', label: 'Mild Fever / Warmth', category: 'General', description: 'Low grade fever or feeling flushed' },
  { id: 'cough_dry', label: 'Persistent Dry Cough', category: 'Respiratory', description: 'Irritating cough with no phlegm' },
  { id: 'cough_wet', label: 'Productive Cough with Phlegm', category: 'Respiratory', description: 'Coughing up yellowish or greenish mucus' },
  { id: 'throat_pain', label: 'Sore Throat / Difficulty Swallowing', category: 'Respiratory', description: 'Scratchy or burning pain in the throat' },
  { id: 'shortness_breath', label: 'Shortness of Breath / Wheezing', category: 'Respiratory', description: 'Struggling to catch breath or chest tightness' },
  { id: 'headache_severe', label: 'Severe Throbbing Headache', category: 'Neurological', description: 'Intense headache with light sensitivity' },
  { id: 'headache_mild', label: 'Mild Tension Headache', category: 'Neurological', description: 'Dull ache across forehead or temples' },
  { id: 'stomach_cramps', label: 'Stomach Cramps & Nausea', category: 'Gastrointestinal', description: 'Sharp abdominal pain, bloating or vomiting' },
  { id: 'diarrhea', label: 'Loose Motions / Diarrhea', category: 'Gastrointestinal', description: 'Frequent watery stools (>3 times/day)' },
  { id: 'skin_rash', label: 'Itchy Skin Rash / Red Patches', category: 'Dermatology', description: 'Red bumps, itching or hives on skin' },
  { id: 'joint_sprain', label: 'Joint Swelling or Ankle Sprain', category: 'Orthopedics', description: 'Pain and swelling following sports or twisting movement' },
  { id: 'chest_pain', label: 'Crushing Chest Pain / Pressure', category: 'Emergency', description: 'Heavy sensation or pain radiating to left arm' },
  { id: 'anxiety_panic', label: 'Severe Anxiety / Racing Heart', category: 'Mental Health', description: 'Intense panic, palpitations or exam stress' },
  { id: 'eye_redness', label: 'Eye Redness & Gritty Feeling', category: 'Ophthalmology', description: 'Burning, watering or discharge from eyes' },
  { id: 'tooth_ache', label: 'Pulsing Toothache or Gum Pain', category: 'Dental', description: 'Sharp tooth pain aggravated by cold or hot drinks' }
];

export function evaluateSymptoms(
  symptomIds: string[],
  severity: number,
  durationDays: number,
  ageGroup: string
): SymptomTriageResult {
  const hasChestPain = symptomIds.includes('chest_pain');
  const hasBreathingDifficulty = symptomIds.includes('shortness_breath');
  const hasHighFever = symptomIds.includes('fever_high');
  const hasDiarrhea = symptomIds.includes('diarrhea');
  const hasSkinRash = symptomIds.includes('skin_rash');
  const hasSprain = symptomIds.includes('joint_sprain');
  const hasAnxiety = symptomIds.includes('anxiety_panic');
  const hasEye = symptomIds.includes('eye_redness');
  const hasDental = symptomIds.includes('tooth_ache');

  if (hasChestPain || (hasBreathingDifficulty && severity >= 7)) {
    return {
      riskLevel: 'emergency',
      summary: 'Potential Medical Emergency Detected! Immediate clinical attention required.',
      possibleConditions: [
        { name: 'Acute Cardiorespiratory Distress', likelihood: 'High', explanation: 'Chest tightness or acute respiratory difficulty demands immediate ER triage.' },
        { name: 'Severe Asthmatic Spasm', likelihood: 'Moderate', explanation: 'Acute airway narrowing requiring emergency nebulization/bronchodilators.' }
      ],
      recommendedDepartment: 'Emergency Casualty / HIMS Trauma Care',
      recommendedAction: 'CALL CAMPUS AMBULANCE IMMEDIATELY (+91 8172 240599) or visit HIMS Hassan Casualty without delay.',
      isEmergency: true,
      adviceNotes: [
        'Do not exert yourself physically; sit upright in a comfortable position.',
        'Alert your hostel warden, roommate, or friend nearby right now.',
        'Keep campus ID & health card ready for admission.'
      ]
    };
  }

  if (severity >= 8 || (hasHighFever && durationDays >= 3) || (hasDiarrhea && durationDays >= 2 && severity >= 6)) {
    return {
      riskLevel: 'high',
      summary: 'High Clinical Priority: Symptoms indicate an acute infection or acute condition requiring doctor evaluation within 12-24 hours.',
      possibleConditions: [
        { name: 'Viral/Bacterial Infection (Dengue / Typhoid / Flu)', likelihood: 'High', explanation: 'Persistent high grade fever in Hassan locality warrants complete blood count (CBC) and diagnostic testing.' },
        { name: 'Acute Gastroenteritis / Food Poisoning', likelihood: 'Moderate', explanation: 'Fluid loss requires oral rehydration therapy and prescription medication.' }
      ],
      recommendedDepartment: 'General Medicine (Dr. Priya Rao - MCE Health Centre)',
      recommendedAction: 'Book a priority consultation with campus physician today and drink ORS fluids.',
      isEmergency: false,
      adviceNotes: [
        'Monitor temperature every 4 hours and note it down.',
        'Drink adequate boiled water, coconut water, or Electral solution.',
        'Avoid taking self-prescribed antibiotics without a doctor prescription.'
      ]
    };
  }

  if (hasAnxiety && symptomIds.length <= 2) {
    return {
      riskLevel: 'moderate',
      summary: 'Psychological Stress / Anxiety Pattern Detected.',
      possibleConditions: [
        { name: 'Academic Stress & Performance Anxiety', likelihood: 'High', explanation: 'Common among engineering students before examinations or project reviews.' },
        { name: 'Generalized Sleep & Circadian Disturbance', likelihood: 'Moderate', explanation: 'Late night screen habits triggering palpitations and cognitive fatigue.' }
      ],
      recommendedDepartment: 'Mental Wellness & Counseling (Dr. Sneha Hegde)',
      recommendedAction: 'Schedule a confidential 1-on-1 counseling session at MCE Counseling Cell.',
      isEmergency: false,
      adviceNotes: [
        'Practice 4-7-8 deep breathing exercises (inhale 4s, hold 7s, exhale 8s).',
        'Limit caffeine/energy drink consumption after 6 PM.',
        'Campus counseling is 100% confidential and free of cost for all students & faculty.'
      ]
    };
  }

  if (hasSkinRash) {
    return {
      riskLevel: 'moderate',
      summary: 'Dermatological condition requiring topical evaluation.',
      possibleConditions: [
        { name: 'Contact Dermatitis / Urticaria', likelihood: 'High', explanation: 'Allergic reaction to laundry detergents, dust, or campus vegetation.' },
        { name: 'Fungal Tinea Infection', likelihood: 'Moderate', explanation: 'Common in warm hostel weather; responds well to antifungal treatments.' }
      ],
      recommendedDepartment: 'Dermatology (Dr. Anand Kumar B.S.)',
      recommendedAction: 'Book an appointment with campus dermatologist. Avoid scratching the affected area.',
      isEmergency: false,
      adviceNotes: [
        'Use mild soap and wear loose cotton clothing.',
        'Do not apply over-the-counter steroid creams without doctor guidance.'
      ]
    };
  }

  if (hasSprain) {
    return {
      riskLevel: 'moderate',
      summary: 'Musculoskeletal Strain / Ligament Injury.',
      possibleConditions: [
        { name: 'Grade 1-2 Ligament Sprain', likelihood: 'High', explanation: 'Stretching or partial tearing of ligament fibers around the joint.' },
        { name: 'Muscle Tendonitis', likelihood: 'Moderate', explanation: 'Inflammation due to sudden sporting sprint or uneven college ground.' }
      ],
      recommendedDepartment: 'Orthopedics & Sports Medicine (Dr. Rajesh Gowda)',
      recommendedAction: 'Apply R.I.C.E protocol (Rest, Ice, Compression, Elevation) and consult campus sports physician.',
      isEmergency: false,
      adviceNotes: [
        'Ice the area for 15 minutes every 3-4 hours.',
        'Avoid weight bearing if swelling is severe; obtain a crepe bandage from campus dispensary.'
      ]
    };
  }

  if (hasDental) {
    return {
      riskLevel: 'moderate',
      summary: 'Dental / Odontogenic discomfort.',
      possibleConditions: [
        { name: 'Dental Pulpitis / Cavity', likelihood: 'High', explanation: 'Bacterial penetration causing nerve root inflammation.' },
        { name: 'Impacted Wisdom Tooth Flare-up', likelihood: 'Moderate', explanation: 'Pressure on surrounding gums common in college age group.' }
      ],
      recommendedDepartment: 'Dental Surgery (Dr. Kavitha Murthy)',
      recommendedAction: 'Book a dental screening at MCE Dental Unit.',
      isEmergency: false,
      adviceNotes: [
        'Rinse gently with warm salt water.',
        'Avoid chewing hard foods on the painful side.'
      ]
    };
  }

  if (hasEye) {
    return {
      riskLevel: 'low',
      summary: 'Ophthalmic surface irritation or digital strain.',
      possibleConditions: [
        { name: 'Computer Vision Syndrome / Dry Eye', likelihood: 'High', explanation: 'Reduced blink rate during long coding/study sessions causing tear film drying.' },
        { name: 'Allergic Conjunctivitis', likelihood: 'Moderate', explanation: 'Dust or pollen induced irritation.' }
      ],
      recommendedDepartment: 'Ophthalmology (Dr. Suresh V. Manjunath)',
      recommendedAction: 'Take regular 20-20-20 breaks and consult eye clinic.',
      isEmergency: false,
      adviceNotes: [
        'Use lubricating artificial tears if prescribed.',
        'Wash eyes with clean cold water.'
      ]
    };
  }

  return {
    riskLevel: 'low',
    summary: 'Mild symptomatic presentation. Standard supportive care and symptom tracking recommended.',
    possibleConditions: [
      { name: 'Upper Respiratory Viral Pharyngitis / Mild Cold', likelihood: 'High', explanation: 'Self-limiting viral syndrome common in college hostels.' },
      { name: 'Mild Fatigue / Mild Dehydration', likelihood: 'Moderate', explanation: 'Result of irregular sleep and inadequate fluid intake.' }
    ],
    recommendedDepartment: 'General Medicine (MCE Health Centre)',
    recommendedAction: 'Rest well, maintain hydration, and book an online teleconsultation if symptoms do not improve within 48 hours.',
    isEmergency: false,
    adviceNotes: [
      'Get 7-8 hours of sound sleep.',
      'Drink warm liquids with honey/ginger for throat comfort.',
      'CampusCare Teleconsultation is available if symptoms worsen.'
    ]
  };
}
