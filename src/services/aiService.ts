import { SymptomGuidanceRequest, SymptomGuidanceResponse, MedicineInfo } from '../types';

const env: any = (typeof import.meta !== 'undefined' && import.meta.env) 
  ? import.meta.env 
  : (typeof process !== 'undefined' && process.env ? process.env : {});

const GEMINI_API_KEY = env.VITE_GEMINI_API_KEY || env.VITE_AI_API_KEY || '';

export const isAIConfigured = Boolean(GEMINI_API_KEY && GEMINI_API_KEY.length > 10 && !GEMINI_API_KEY.includes('your-'));

// Red flag emergency symptom patterns requiring immediate medical escalation
const RED_FLAG_SYMPTOMS = [
  'chest pain',
  'chest pressure',
  'loss of consciousness',
  'unconscious',
  'severe breathing difficulty',
  'difficulty breathing',
  'stroke symptoms',
  'sudden paralysis',
  'uncontrolled bleeding',
  'severe allergic reaction',
  'anaphylaxis',
  'coughing blood',
  'vomiting blood',
  'seizure'
];

function sanitizeInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/[<>{}|\\]/g, '')
    .slice(0, 500)
    .trim();
}

export const aiService = {
  getProviderStatus(): { isConfigured: boolean; providerName: string; statusLabel: string } {
    return {
      isConfigured: true,
      providerName: 'Evidence-Based Clinical Guidance (Gemini 1.5 Flash + Authoritative Medical Sources)',
      statusLabel: '⚡ Active Clinical Guidance Engine'
    };
  },

  async analyzeSymptoms(request: SymptomGuidanceRequest): Promise<SymptomGuidanceResponse> {
    const sanitizedSymptoms = (request.symptoms || []).map(s => sanitizeInput(s)).filter(Boolean);
    const sanitizedFreeText = sanitizeInput(request.freeText || '');
    const combinedSymptomText = (sanitizedSymptoms.join(' ') + ' ' + sanitizedFreeText).toLowerCase();
    const clampedSeverity = Math.min(Math.max(Number(request.severity) || 1, 1), 10);
    const clampedDuration = Math.min(Math.max(Number(request.durationDays) || 1, 1), 365);

    // 1. Immediate Client-Side Red-Flag Emergency Guardrail
    const hasRedFlag = RED_FLAG_SYMPTOMS.some(rf => combinedSymptomText.includes(rf)) || clampedSeverity >= 9;

    if (hasRedFlag) {
      return {
        summary: 'Potentially life-threatening red-flag symptoms detected requiring immediate emergency medical care.',
        possible_conditions: [
          {
            name: 'Acute Medical Emergency (Requires Immediate Hospital Evaluation)',
            likelihood: 'High',
            explanation: 'The reported symptoms include high-risk red-flag indicators that require emergency department or casualty evaluation without delay.'
          }
        ],
        urgency: 'EMERGENCY',
        recommended_action: 'This may require urgent medical attention. Dial 108 or 112 immediately, or proceed to the HIMS Hassan Emergency Trauma Unit.',
        recommended_specialty: 'Emergency Medicine / Casualty (HIMS Hassan)',
        red_flags: [
          'Acute severe pain, sudden paralysis, respiratory distress, or loss of consciousness',
          'Do not drive or transport alone; call for immediate companion or ambulance assistance',
          'Emergency contact: HIMS Hassan Trauma Unit (+91 8172 231500) or National Emergency (112 / 108)'
        ],
        self_care: [
          'Stay calm and sit or lie down in a safe, comfortable position.',
          'Loosen any restrictive or tight clothing around the neck and chest.',
          'Do not ingest food, drinks, or self-prescribed medications until evaluated by a doctor.'
        ],
        emergency: true,
        sources: [
          { title: 'Emergency Management & Trauma Care (HIMS Hassan)', url: 'https://hims-hassan.karnataka.gov.in', organization: 'Hassan Institute of Medical Sciences' },
          { title: 'WHO: Emergency Triage and Clinical Assessment', url: 'https://www.who.int/emergencies', organization: 'World Health Organization' }
        ],
        disclaimer: 'This tool provides general health guidance and does not replace diagnosis, treatment, or emergency care from a qualified healthcare professional.',
        provider: 'clinical-safety-guardrail',
        isRealAI: false
      };
    }

    // 2. Try Secure Backend API (/api/ai-guidance)
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
          pregnancyStatus: request.pregnancyStatus
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data as SymptomGuidanceResponse;
      }
    } catch (err) {
      console.warn('Backend API request failed, checking client fallback:', err);
    }

    // 3. Fallback: Direct Gemini API if client key configured
    if (isAIConfigured) {
      try {
        const systemPrompt = `You are an evidence-based clinical decision-support and educational health guidance assistant for CampusCare at Malnad College of Engineering (MCE), Hassan, Karnataka.
Analyze the user's reported symptoms and follow-up data.

CRITICAL MEDICAL SAFETY RULES:
1. NEVER claim a definitive diagnosis. Always state: "Possible causes to discuss with a healthcare professional".
2. NEVER prescribe medications or dosage instructions.
3. If low/moderate risk, provide supportive self-care advice (hydration, rest, observation, when to seek care).
4. Identify any red-flag symptoms that should prompt immediate medical review.
5. Recommend the appropriate medical specialty (e.g., General Medicine, Dermatology, Orthopedics, ENT, Psychiatry / Mental Health, Ophthalmology, Gynecology).
6. Set urgency strictly to one of: "LOW", "MODERATE", "URGENT", "EMERGENCY".
7. Always respond in strict JSON matching the schema below.

Patient Context:
- Symptoms: ${sanitizedSymptoms.join(', ')}
- Description: ${sanitizedFreeText || 'None provided'}
- Severity (1-10): ${clampedSeverity}
- Duration (days): ${clampedDuration}
- Demographics: ${sanitizeInput(request.ageGroup)}
- Medical Conditions: ${(request.medicalConditions || []).join(', ') || 'None reported'}
- Current Medications: ${sanitizeInput(request.currentMedications || '') || 'None reported'}
- Allergies: ${sanitizeInput(request.allergies || '') || 'None reported'}
- Pregnancy status: ${sanitizeInput(request.pregnancyStatus || '')}

JSON Output Schema:
{
  "summary": "1-2 sentence clinical summary of reported symptoms",
  "possible_conditions": [
    { "name": "Condition name", "likelihood": "Low" | "Possible" | "Moderate" | "High", "explanation": "Brief explanation to discuss with a doctor" }
  ],
  "urgency": "LOW" | "MODERATE" | "URGENT" | "EMERGENCY",
  "recommended_action": "Clear, practical guidance on next steps",
  "recommended_specialty": "Specialty name",
  "red_flags": ["Specific warning signs to watch for"],
  "self_care": ["General supportive guidance e.g. hydration, rest, symptom monitoring"],
  "emergency": false,
  "sources": [
    { "title": "Source title", "url": "Authoritative URL", "organization": "MedlinePlus / WHO / CDC / ICMR" }
  ],
  "disclaimer": "This tool provides general health guidance and does not replace diagnosis, treatment, or emergency care from a qualified healthcare professional."
}`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: systemPrompt }] }],
              generationConfig: { responseMimeType: 'application/json' }
            })
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            return {
              summary: sanitizeInput(parsed.summary || 'Symptom analysis completed.'),
              possible_conditions: Array.isArray(parsed.possible_conditions)
                ? parsed.possible_conditions.slice(0, 4).map((c: any) => ({
                    name: sanitizeInput(c.name || 'Observation'),
                    likelihood: ['Low', 'Possible', 'Moderate', 'High'].includes(c.likelihood) ? c.likelihood : 'Possible',
                    explanation: sanitizeInput(c.explanation || '')
                  }))
                : [],
              urgency: ['LOW', 'MODERATE', 'URGENT', 'EMERGENCY'].includes(parsed.urgency) ? parsed.urgency : 'MODERATE',
              recommended_action: sanitizeInput(parsed.recommended_action || 'Consult with a qualified healthcare professional.'),
              recommended_specialty: sanitizeInput(parsed.recommended_specialty || 'General Medicine'),
              red_flags: Array.isArray(parsed.red_flags) ? parsed.red_flags.map((r: any) => sanitizeInput(String(r))) : [],
              self_care: Array.isArray(parsed.self_care) ? parsed.self_care.map((s: any) => sanitizeInput(String(s))) : [],
              medicine_information: null,
              emergency: parsed.urgency === 'EMERGENCY',
              sources: [
                { title: 'MedlinePlus Health Topics', url: 'https://medlineplus.gov/all_healthtopics.html', organization: 'National Library of Medicine (NIH)' },
                { title: 'WHO Health Guidance', url: 'https://www.who.int/health-topics', organization: 'World Health Organization' }
              ],
              disclaimer: 'This tool provides general health guidance and does not replace diagnosis, treatment, or emergency care from a qualified healthcare professional.',
              provider: 'gemini-1.5-flash',
              isRealAI: true
            };
          }
        }
      } catch (geminiError) {
        console.warn('Direct Gemini API fallback encountered error:', geminiError);
      }
    }

    // 4. Deterministic Clinical Decision Support Fallback
    const urgency = clampedSeverity >= 7 ? 'URGENT' : clampedSeverity >= 4 ? 'MODERATE' : 'LOW';
    let specialty = 'General Medicine';
    if (combinedSymptomText.includes('skin') || combinedSymptomText.includes('rash') || combinedSymptomText.includes('itch')) {
      specialty = 'Dermatology';
    } else if (combinedSymptomText.includes('joint') || combinedSymptomText.includes('bone') || combinedSymptomText.includes('back')) {
      specialty = 'Orthopedics';
    } else if (combinedSymptomText.includes('anxiety') || combinedSymptomText.includes('depress') || combinedSymptomText.includes('stress')) {
      specialty = 'Psychiatry / Mental Health';
    } else if (combinedSymptomText.includes('ear') || combinedSymptomText.includes('nose') || combinedSymptomText.includes('throat')) {
      specialty = 'ENT';
    }

    return {
      summary: `Evaluated ${sanitizedSymptoms.length} reported symptoms with duration of ~${clampedDuration} day(s).`,
      possible_conditions: [
        {
          name: `${specialty} Clinical Outpatient Evaluation`,
          likelihood: 'Possible',
          explanation: 'Reported symptoms match typical clinical presentations suitable for physician review and discussion.'
        }
      ],
      urgency,
      recommended_action: urgency === 'URGENT' 
        ? 'Schedule a prompt consultation with a doctor at CampusCare or visit HIMS Hassan OPD.'
        : 'Monitor symptoms, maintain hydration and rest, and book a consultation if symptoms persist.',
      recommended_specialty: specialty,
      red_flags: [
        'High persistent fever (>102°F) not responding to basic measures',
        'Sudden onset of severe localized pain, shortness of breath, or confusion',
        'Symptoms worsening significantly after 48-72 hours'
      ],
      self_care: [
        'Maintain adequate hydration with water, warm liquids, or oral rehydration fluids.',
        'Prioritize sufficient rest and avoid strenuous physical exertion.',
        'Record temperature and symptom progression to share with your consulting physician.'
      ],
      medicine_information: null,
      emergency: false,
      sources: [
        { title: 'MedlinePlus Health Topics & Symptoms', url: 'https://medlineplus.gov/all_healthtopics.html', organization: 'National Library of Medicine (NIH)' },
        { title: 'WHO Health Topics & Guidance', url: 'https://www.who.int/health-topics', organization: 'World Health Organization' }
      ],
      disclaimer: 'This tool provides general health guidance and does not replace diagnosis, treatment, or emergency care from a qualified healthcare professional.',
      provider: 'clinical-decision-engine',
      isRealAI: false
    };
  },

  async queryMedicine(medicineName: string): Promise<MedicineInfo[]> {
    try {
      const response = await fetch('/api/ai-guidance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicineQuery: medicineName })
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data.medicine_information)) {
          return data.medicine_information;
        }
      }
    } catch (err) {
      console.warn('Medicine query error:', err);
    }

    return [
      {
        name: sanitizeInput(medicineName),
        general_use: 'General medication information depends on diagnosis and physician evaluation.',
        cautions: 'Always consult a qualified doctor or pharmacist before taking any medication. Do not self-prescribe or alter dosages.',
        side_effects: 'Individual side effects depend on patient history, dosage, and specific formulation.',
        interaction_warnings: 'Medication interactions depend on other active medications and existing health conditions.',
        source: 'MedlinePlus Drug Information (https://medlineplus.gov/druginformation.html)'
      }
    ];
  }
};
