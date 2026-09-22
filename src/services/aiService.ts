import { SymptomGuidanceRequest, SymptomGuidanceResponse, MedicineInfo } from '../types';

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

    // 1. Immediate Deterministic Red-Flag Safety Check (Before network call)
    let detectedRedFlagReason = '';
    for (const rf of EMERGENCY_RED_FLAGS) {
      if (rf.pattern.test(combinedSymptomText)) {
        detectedRedFlagReason = rf.reason;
        break;
      }
    }

    if (detectedRedFlagReason || clampedSeverity >= 9) {
      return {
        symptom_summary: 'Acute high-risk red-flag indicators detected requiring immediate emergency medical evaluation.',
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
        pregnancyStatus: request.pregnancyStatus
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
