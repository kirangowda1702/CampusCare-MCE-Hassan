import { SymptomTriageResult } from '../types';
import { evaluateSymptoms as ruleBasedTriage } from '../data/symptoms';

const env: any = (typeof import.meta !== 'undefined' && import.meta.env) 
  ? import.meta.env 
  : (typeof process !== 'undefined' && process.env ? process.env : {});

// In production, AI keys should be managed server-side via Supabase Edge Functions.
const GEMINI_API_KEY = env.VITE_GEMINI_API_KEY || env.VITE_AI_API_KEY || '';

export const isAIConfigured = Boolean(GEMINI_API_KEY && GEMINI_API_KEY.length > 10 && !GEMINI_API_KEY.includes('your-'));

export interface AITriageResponse extends SymptomTriageResult {
  provider: 'gemini-1.5-flash' | 'clinical-rule-engine';
  isRealAI: boolean;
  statusMessage?: string;
}

// Red flag emergency symptom patterns requiring immediate medical escalation
const RED_FLAG_SYMPTOMS = [
  'chest pain',
  'loss of consciousness',
  'severe breathing difficulty',
  'stroke symptoms',
  'sudden paralysis',
  'uncontrolled bleeding',
  'severe allergic reaction',
  'anaphylaxis'
];

function sanitizeInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/[<>{}|\\]/g, '')
    .slice(0, 300)
    .trim();
}

export const aiService = {
  getProviderStatus(): { isConfigured: boolean; providerName: string; statusLabel: string } {
    return {
      isConfigured: isAIConfigured,
      providerName: isAIConfigured ? 'Google Gemini 1.5 Flash (API Key Active)' : 'Clinical Decision Rule Engine',
      statusLabel: isAIConfigured ? '⚡ Live AI Active' : 'AI provider not configured.'
    };
  },

  async analyzeSymptoms(
    symptoms: string[],
    severity: number,
    durationDays: number,
    demographics: string
  ): Promise<AITriageResponse> {
    // 1. Sanitize all user inputs (Prompt injection defense)
    const sanitizedSymptoms = symptoms.map(s => sanitizeInput(s)).filter(Boolean);
    const sanitizedDemographics = sanitizeInput(demographics);
    const clampedSeverity = Math.min(Math.max(Number(severity) || 1, 1), 10);
    const clampedDuration = Math.min(Math.max(Number(durationDays) || 1, 1), 365);

    // 2. Safety Layer: Check Red-Flag Emergency Symptoms
    const symptomTextLower = sanitizedSymptoms.join(' ').toLowerCase();
    const hasRedFlag = RED_FLAG_SYMPTOMS.some(rf => symptomTextLower.includes(rf)) || clampedSeverity >= 9;

    if (hasRedFlag) {
      return {
        riskLevel: 'emergency',
        summary: 'Critical red-flag symptoms detected requiring immediate emergency intervention.',
        possibleConditions: [
          {
            name: 'Acute Medical Emergency (Requires Immediate Trauma Care)',
            likelihood: 'High',
            explanation: 'Reported symptoms indicate potential high-acuity condition requiring emergency facility evaluation.'
          }
        ],
        recommendedDepartment: 'Emergency Casualty & Trauma Care (HIMS Hassan)',
        recommendedAction: 'Immediate emergency escalation. Dial 108 or proceed to HIMS Hassan Emergency Trauma Unit immediately.',
        isEmergency: true,
        adviceNotes: [
          'Do not drive yourself. Request an ambulance or companion assistance.',
          'CampusCare internal SOS can be triggered for campus first responders.',
          'HIMS Hassan Emergency Trauma Line: +91 8172 231500 / 108'
        ],
        provider: 'clinical-rule-engine',
        isRealAI: false,
        statusMessage: 'Emergency protocol triggered by clinical safety guardrails.'
      };
    }

    // 3. Live AI Provider Call (if configured)
    if (isAIConfigured) {
      try {
        const prompt = `You are a strict educational campus healthcare triage assistant for Malnad College of Engineering (MCE), Hassan.
Analyze these patient-reported symptoms for educational decision support ONLY.
CRITICAL SAFETY CONSTRAINTS:
- Do NOT prescribe any specific medication or dosage.
- Do NOT provide a definitive medical diagnosis.
- Always include standard educational disclaimers.

Patient Data:
- Symptoms: ${sanitizedSymptoms.join(', ')}
- Severity scale (1-10): ${clampedSeverity}
- Duration (days): ${clampedDuration}
- Patient Demographics: ${sanitizedDemographics}

Respond in strict JSON matching:
{
  "riskLevel": "low" | "moderate" | "high" | "emergency",
  "summary": "Short 1-2 sentence clinical summary",
  "possibleConditions": [
    { "name": "Condition name", "likelihood": "Possible" | "Moderate" | "High", "explanation": "Brief explanation" }
  ],
  "recommendedDepartment": "e.g., General Outpatient Care (OPD) / ENT / Orthopedics",
  "recommendedAction": "Actionable guidance",
  "isEmergency": boolean,
  "adviceNotes": ["Note 1", "Note 2", "Note 3"]
}`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json' }
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            // Schema validation & sanitization
            return {
              riskLevel: ['low', 'moderate', 'high', 'emergency'].includes(parsed.riskLevel) ? parsed.riskLevel : 'moderate',
              summary: sanitizeInput(parsed.summary || 'Clinical summary unavailable.'),
              possibleConditions: Array.isArray(parsed.possibleConditions)
                ? parsed.possibleConditions.slice(0, 4).map((c: any) => ({
                    name: sanitizeInput(c.name || 'Clinical Observation'),
                    likelihood: ['Possible', 'Moderate', 'High'].includes(c.likelihood) ? c.likelihood : 'Possible',
                    explanation: sanitizeInput(c.explanation || '')
                  }))
                : [],
              recommendedDepartment: sanitizeInput(parsed.recommendedDepartment || 'General Outpatient Care (OPD)'),
              recommendedAction: sanitizeInput(parsed.recommendedAction || 'Schedule a consultation with a physician.'),
              isEmergency: Boolean(parsed.isEmergency),
              adviceNotes: Array.isArray(parsed.adviceNotes) ? parsed.adviceNotes.map((n: any) => sanitizeInput(String(n))) : [],
              provider: 'gemini-1.5-flash',
              isRealAI: true,
              statusMessage: 'AI evaluation completed successfully.'
            };
          }
        }
      } catch (err) {
        console.warn('AI API call failed, falling back to verified clinical rule engine.');
      }
    }

    // 4. Deterministic Clinical Decision Support Rule Engine Fallback
    const baseline = ruleBasedTriage(sanitizedSymptoms, clampedSeverity, clampedDuration, sanitizedDemographics);
    return {
      ...baseline,
      provider: 'clinical-rule-engine',
      isRealAI: false,
      statusMessage: 'AI provider not configured. Clinical Decision Support Rule Engine is active.'
    };
  }
};
