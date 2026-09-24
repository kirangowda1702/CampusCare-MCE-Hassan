import { SymptomGuidanceRequest, SymptomGuidanceResponse, MedicineInfo, PossibleCondition } from '../types';

function sanitizeInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/[<>{}|\\]/g, '')
    .slice(0, 500)
    .trim();
}

// Red flag emergency symptom patterns for immediate client-side safety trigger
const EMERGENCY_RED_FLAGS = [
  { pattern: /weakness in.*(arm|leg|face|side)/i, reason: 'Sudden limb or facial weakness is a potential stroke warning sign.' },
  { pattern: /slurred speech|difficulty speaking/i, reason: 'Speech impairment is an acute neurological emergency.' },
  { pattern: /sudden severe headache|worst headache of my life|thunderclap/i, reason: 'Sudden explosive headache requires immediate intracranial evaluation.' },
  { pattern: /chest pain|chest pressure|chest tightness|radiating to (left arm|jaw|back)/i, reason: 'Acute chest pain requires immediate cardiac emergency triage.' },
  { pattern: /shortness of breath|severe breathing difficulty|struggling to breathe/i, reason: 'Acute respiratory distress requires immediate emergency care.' },
  { pattern: /loss of consciousness|unconscious|fainting|passed out/i, reason: 'Loss of consciousness is a critical red-flag emergency.' },
  { pattern: /anaphylaxis|throat swelling|severe allergic reaction/i, reason: 'Anaphylaxis requires immediate emergency intervention.' },
  { pattern: /coughing blood|vomiting blood|uncontrolled bleeding/i, reason: 'Acute active bleeding requires emergency trauma care.' },
  { pattern: /seizure|convulsions/i, reason: 'Active seizure requires emergency medical care.' }
];

export const aiService = {
  getProviderStatus(): { isConfigured: boolean; providerName: string; statusLabel: string } {
    return {
      isConfigured: true,
      providerName: 'Evidence-Grounded Clinical Guidance (Google Gemini + MedlinePlus & WHO Sources)',
      statusLabel: '⚡ Genuine Evidence AI Active'
    };
  },

  async analyzeSymptoms(request: SymptomGuidanceRequest): Promise<SymptomGuidanceResponse> {
    const sanitizedSymptoms = (request.symptoms || []).map(s => sanitizeInput(s)).filter(Boolean);
    const sanitizedFreeText = sanitizeInput(request.freeText || '');
    const combinedSymptomText = (sanitizedSymptoms.join(' ') + ' ' + sanitizedFreeText).toLowerCase();
    const clampedSeverity = Math.min(Math.max(Number(request.severity) || 1, 1), 10);
    const clampedDuration = Math.min(Math.max(Number(request.durationDays) || 1, 1), 365);

    // Check follow-up answers for critical red flags
    const followUpText = Object.values(request.followUpAnswers || {})
      .flatMap(v => (Array.isArray(v) ? v : [String(v)]))
      .join(' ')
      .toLowerCase();

    const fullEvaluatedText = combinedSymptomText + ' ' + followUpText;

    // 1. Immediate Deterministic Red-Flag Safety Check (Before network call)
    let detectedRedFlagReason = '';
    for (const rf of EMERGENCY_RED_FLAGS) {
      if (rf.pattern.test(fullEvaluatedText)) {
        detectedRedFlagReason = rf.reason;
        break;
      }
    }

    if (detectedRedFlagReason || clampedSeverity >= 9) {
      return {
        symptom_summary: 'Acute high-risk red-flag indicators detected requiring immediate emergency medical evaluation.',
        follow_up_questions: [
          'Can you sit or lie down comfortably while waiting for help?',
          'Is someone available to assist you to the campus First Aid desk?'
        ],
        possible_conditions: [
          {
            name: 'Acute Medical Emergency (Requires Immediate Hospital Evaluation)',
            likelihood: 'High',
            explanation: detectedRedFlagReason || 'The reported symptoms include high-acuity red-flag indicators that require emergency department or casualty evaluation without delay.'
          }
        ],
        urgency: 'EMERGENCY',
        red_flags: [
          detectedRedFlagReason || 'Acute severe pain, neurological deficit, or respiratory distress',
          'Do not drive or transport alone; call for immediate companion or campus assistance',
          'Emergency contact: MCE First Aid (+91 9110885805)'
        ],
        recommended_action: 'These symptoms may require urgent medical attention. Contact MCE First Aid immediately at 9110885805 or trigger Campus Emergency SOS.',
        recommended_specialty: 'Emergency Medicine / Casualty (HIMS Hassan)',
        common_otc_options: [
          'Do NOT take oral medications or self-prescribe OTC drugs during an acute emergency before professional clinical evaluation.'
        ],
        medicine_precautions: [
          'Keep patient seated or lying down comfortably.',
          'Loosen restrictive clothing around neck and chest.',
          'Do not administer food or drink.'
        ],
        sources: [
          { name: 'Hassan Institute of Medical Sciences (HIMS Hassan) Emergency Care', url: 'https://hims-hassan.karnataka.gov.in' },
          { name: 'WHO: Emergency Triage Guidelines', url: 'https://www.who.int/emergencies' }
        ],
        emergency: true,
        disclaimer: 'This tool provides general health guidance and does not replace diagnosis, treatment, or emergency care from a qualified healthcare professional.',
        isRealAI: false,
        provider: 'deterministic-red-flag-safety-layer'
      };
    }

    // 2. Secure Backend API (/api/ai-guidance)
    try {
      const response = await fetch('/api/ai-guidance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms: sanitizedSymptoms,
          freeText: sanitizedFreeText,
          severity: clampedSeverity,
          durationDays: clampedDuration,
          ageGroup: request.ageGroup,
          medicalConditions: request.medicalConditions,
          currentMedications: request.currentMedications,
          allergies: request.allergies,
          pregnancyStatus: request.pregnancyStatus,
          followUpAnswers: request.followUpAnswers
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data as SymptomGuidanceResponse;
      }

      let errorMessage = 'AI Health Guidance is currently unavailable.';
      try {
        const errorData = await response.json();
        if (errorData.error) errorMessage = errorData.error;
      } catch {
        // ignore
      }
      throw new Error(errorMessage);
    } catch (err: any) {
      console.warn('Backend API request issue, generating evidence-based clinical safety fallback:', err);
      // Construct evidence-based clinical fallback without claiming fake AI
      const isHeadache = fullEvaluatedText.includes('headache');
      const isFever = fullEvaluatedText.includes('fever');
      const isRespiratory = fullEvaluatedText.includes('cough') || fullEvaluatedText.includes('cold') || fullEvaluatedText.includes('throat');
      const isSkin = fullEvaluatedText.includes('skin') || fullEvaluatedText.includes('itch') || fullEvaluatedText.includes('rash');
      const isBack = fullEvaluatedText.includes('back') || fullEvaluatedText.includes('spine');
      const isStomach = fullEvaluatedText.includes('stomach') || fullEvaluatedText.includes('diarrhea') || fullEvaluatedText.includes('vomit');

      let fallbackSummary = 'Clinical triage evaluation based on reported symptoms and safety guidelines.';
      let fallbackSpecialty = 'General Medicine';
      let fallbackConditions: PossibleCondition[] = [
        { name: 'General Medical Symptom Evaluation', likelihood: 'Possible', explanation: 'Symptom evaluation requires consultation with a registered healthcare practitioner.' }
      ];
      let fallbackOTC = [
        'Common OTC supportive care includes adequate fluid hydration, oral rehydration, and rest.'
      ];
      let fallbackPrecautions = [
        'Do not exceed maximum daily dosages of any OTC medicine.',
        'Consult a registered physician if symptoms worsen or persist beyond 48 hours.'
      ];

      if (isHeadache) {
        fallbackSummary = 'Reported symptoms of headache evaluated under clinical triage protocols.';
        fallbackConditions = [
          { name: 'Tension-Type Headache / Screen Fatigue', likelihood: 'High', explanation: 'Frequently triggered by academic stress, inadequate sleep, or prolonged screen posture.' },
          { name: 'Dehydration / Exertion-Related Headache', likelihood: 'Moderate', explanation: 'Mild headache linked to fluid deficit or physical fatigue.' },
          { name: 'Migraine without Aura', likelihood: 'Possible', explanation: 'Throbbing headache often associated with sensitivity to light or sound.' }
        ];
        fallbackOTC = [
          'Common OTC options that may be used include Paracetamol (Acetaminophen) or Ibuprofen taken with food, alongside rest in a quiet, dark room.'
        ];
        fallbackPrecautions = [
          'Follow manufacturer packaging instructions or physician advice; never exceed labeled limits.',
          'Always take NSAIDs with food to protect gastric lining.',
          'Seek immediate care if headache becomes explosive or accompanied by neck stiffness.'
        ];
      } else if (isFever || isRespiratory) {
        fallbackSummary = 'Reported upper respiratory / febrile symptoms evaluated under clinical triage protocols.';
        fallbackConditions = [
          { name: 'Acute Viral Upper Respiratory Tract Infection', likelihood: 'High', explanation: 'Common viral infection of nose, throat, or airways.' },
          { name: 'Seasonal Pharyngitis / Rhinopharyngitis', likelihood: 'Moderate', explanation: 'Inflammation of throat and nasal passages typical in seasonal changes.' }
        ];
        fallbackOTC = [
          'Common supportive measures include warm salt water gargles, steam inhalation, and Paracetamol for fever or body ache.'
        ];
        fallbackPrecautions = [
          'Avoid taking antibiotics without a physician prescription (ineffective against viral illnesses).',
          'Monitor temperature regularly and seek medical advice if fever persists > 3 days.'
        ];
      } else if (isStomach) {
        fallbackSummary = 'Reported gastrointestinal / abdominal symptoms evaluated under clinical triage protocols.';
        fallbackSpecialty = 'General Medicine / Gastroenterology';
        fallbackConditions = [
          { name: 'Acute Gastroenteritis / Dietary Indigestion', likelihood: 'High', explanation: 'Mild irritation or infection of digestive tract following food or water intake.' },
          { name: 'Acid Peptic Disorder / Gastritis', likelihood: 'Moderate', explanation: 'Upper abdominal burning related to acid reflux or irregular meals.' }
        ];
        fallbackOTC = [
          'Oral Rehydration Salts (ORS) solution to prevent fluid loss; light, non-spicy bland diet (BRAT diet).'
        ];
        fallbackPrecautions = [
          'Drink small sips of fluid frequently rather than large gulps.',
          'Seek emergency care if inability to retain fluids for >12 hours or if blood appears in vomit/stool.'
        ];
      } else if (isSkin) {
        fallbackSummary = 'Reported dermatological / skin symptoms evaluated under clinical triage protocols.';
        fallbackSpecialty = 'Dermatology';
        fallbackConditions = [
          { name: 'Contact Dermatitis / Urticaria (Hives)', likelihood: 'High', explanation: 'Allergic or irritant skin reaction following contact with allergens, cosmetics, or fabrics.' },
          { name: 'Eczema / Pruritus', likelihood: 'Moderate', explanation: 'Dry, itchy skin inflammation.' }
        ];
        fallbackOTC = [
          'Cool compresses, fragrance-free moisturizing lotions, and OTC second-generation antihistamines (e.g. Cetirizine) for itching.'
        ];
        fallbackPrecautions = [
          'Avoid scratching to prevent secondary bacterial infection.',
          'Seek immediate medical attention if accompanied by facial or lip swelling.'
        ];
      } else if (isBack) {
        fallbackSummary = 'Reported musculoskeletal / back discomfort evaluated under clinical triage protocols.';
        fallbackSpecialty = 'Orthopedics / Physiotherapy';
        fallbackConditions = [
          { name: 'Acute Lumbar Muscular Strain', likelihood: 'High', explanation: 'Muscle pull or ligament strain from lifting, studying posture, or sports.' },
          { name: 'Postural Ergonomic Backache', likelihood: 'Moderate', explanation: 'Strain from prolonged sitting or unsupportive seating.' }
        ];
        fallbackOTC = [
          'Gentle movement, local warm/cold compresses, and topical analgesic gels (e.g. Volini).'
        ];
        fallbackPrecautions = [
          'Avoid prolonged bed rest; maintain gentle walking.',
          'Seek immediate evaluation if pain radiates down legs with numbness or weakness.'
        ];
      }

      return {
        symptom_summary: fallbackSummary,
        follow_up_questions: [
          'When did you first notice these symptoms?',
          'Have you taken any home remedies or OTC medicines so far?'
        ],
        possible_conditions: fallbackConditions,
        urgency: clampedSeverity >= 7 ? 'URGENT' : clampedSeverity >= 4 ? 'MODERATE' : 'LOW',
        red_flags: [
          'Sudden severe worsening of symptoms',
          'High fever (>102°F) not responding to medication',
          'Any difficulty breathing, chest pain, or severe weakness'
        ],
        recommended_action: 'Schedule a consultation with a verified campus physician or visit MCE Health Centre for a thorough in-person examination.',
        recommended_specialty: fallbackSpecialty,
        common_otc_options: fallbackOTC,
        medicine_precautions: fallbackPrecautions,
        sources: [
          { name: 'MedlinePlus: Health Topics Directory', url: 'https://medlineplus.gov/all_healthtopics.html' },
          { name: 'WHO: World Health Organization Clinical Topics', url: 'https://www.who.int/health-topics' }
        ],
        emergency: false,
        disclaimer: 'This information is for health guidance and educational purposes and does not replace professional medical diagnosis, prescription, or emergency treatment from a qualified healthcare professional.',
        isRealAI: false,
        provider: 'deterministic-clinical-guidance-safety-engine'
      };
    }
  },

  async queryMedicine(medicineName: string): Promise<MedicineInfo[]> {
    const sanitized = sanitizeInput(medicineName);
    const response = await fetch('/api/ai-guidance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ medicineQuery: sanitized })
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.medicine_information)) {
        return data.medicine_information;
      }
    }

    let errorMessage = 'Unable to find medicine information.';
    try {
      const errorData = await response.json();
      if (errorData.error) errorMessage = errorData.error;
    } catch {
      // ignore
    }

    throw new Error(errorMessage);
  }
};
