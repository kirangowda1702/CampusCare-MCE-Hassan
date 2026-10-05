import type { VercelRequest, VercelResponse } from '@vercel/node';

// Red-flag emergency indicators with negation filtering
const EMERGENCY_RED_FLAGS = [
  { pattern: /\b(chest pain|pressure in chest|tightness in chest|pain radiating to (?:left arm|jaw|back))\b/i, reason: 'Acute chest pain requires immediate cardiac emergency evaluation.' },
  { pattern: /\b(severe breathing difficulty|struggling to breathe|cannot catch breath|shortness of breath|wheezing with significant respiratory distress|wheezing and (?:difficulty|struggling)|acute respiratory distress)\b/i, reason: 'Acute respiratory distress requires immediate emergency medical care.' },
  { pattern: /\b(sudden explosive onset|sudden explosive severe headache|sudden explosive headache|thunderclap headache|worst headache of (?:my\s+)?life|explosive thunderclap)\b/i, reason: 'Sudden explosive or thunderclap headache requires urgent neurological evaluation.' },
  { pattern: /\b(weakness in (?:arm|leg|face|side)|slurred speech|facial droop|difficulty speaking|acute speech change)\b/i, reason: 'Limb weakness or acute speech changes are potential stroke warning signs.' },
  { pattern: /\b(passed out|loss of consciousness|fainted|unconscious)\b/i, reason: 'Loss of consciousness is a critical red-flag emergency.' },
  { pattern: /\b(throat swelling|swollen lips|difficulty swallowing|anaphylaxis|severe allergic reaction)\b/i, reason: 'Throat swelling or anaphylaxis requires immediate emergency care.' },
  { pattern: /\b(coughing blood|vomiting blood|uncontrolled bleeding|active hemorrhage)\b/i, reason: 'Acute active bleeding requires emergency casualty care.' },
  { pattern: /\b(active seizure|convulsions)\b/i, reason: 'Active seizure requires emergency medical care.' }
];

export function isClauseNegated(fullText: string, matchIndex: number): boolean {
  const lookback = fullText.slice(Math.max(0, matchIndex - 70), matchIndex).toLowerCase();
  const clauses = lookback.split(/[,.;:!?|\n]|\bbut\b|\bhowever\b/);
  const immediateClause = clauses[clauses.length - 1] || '';
  const negationRegex = /\b(no|not|without|denies|denied|negative for|neither|never|free of|rule out)\b/i;
  return negationRegex.test(immediateClause);
}

export function evaluateRedFlags(rawText: string): { isEmergency: boolean; reason?: string } {
  if (!rawText || typeof rawText !== 'string') return { isEmergency: false };

  for (const rf of EMERGENCY_RED_FLAGS) {
    const regex = new RegExp(rf.pattern.source, 'gi');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(rawText)) !== null) {
      if (!isClauseNegated(rawText, match.index)) {
        return { isEmergency: true, reason: rf.reason };
      }
    }
  }

  return { isEmergency: false };
}

function sanitize(str: string): string {
  if (!str) return '';
  return str.replace(/[<>{}|\\]/g, '').slice(0, 500).trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Health check endpoint
  if (req.method === 'GET' || req.body?.healthCheck === true || req.query?.healthCheck === 'true') {
    const apiKey = process.env.GEMINI_API_KEY || '';
    return res.status(200).json({
      status: apiKey && apiKey.length >= 10 ? 'CONFIGURED' : 'UNCONFIGURED',
      keyDetected: Boolean(apiKey && apiKey.length >= 10),
      modelConfigured: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      endpoint: '/api/symptom-checker',
      timestamp: new Date().toISOString()
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const {
      symptoms = [],
      freeText = '',
      severity = 4,
      durationDays = 2,
      ageGroup = 'college_student',
      followUpAnswers = {}
    } = req.body || {};

    // 1. INPUT VALIDATION: Test missing/empty symptoms
    const sanitizedSymptoms = Array.isArray(symptoms)
      ? symptoms.map((s: string) => sanitize(String(s))).filter(Boolean)
      : [];
    const sanitizedFreeText = sanitize(String(freeText)).trim();

    if (sanitizedSymptoms.length === 0 && !sanitizedFreeText) {
      return res.status(400).json({
        error: 'Please provide at least one symptom or describe your symptoms.'
      });
    }

    const clampedSeverity = Math.min(Math.max(Number(severity) || 1, 1), 10);
    const clampedDuration = Math.min(Math.max(Number(durationDays) || 1, 1), 365);
    const combinedSymptomText = (sanitizedSymptoms.join(' ') + ' ' + sanitizedFreeText).trim().toLowerCase();

    // 2. DETERMINISTIC RED-FLAG EMERGENCY CHECK (Must take priority over AI)
    const followUpText = Object.values(followUpAnswers || {})
      .flatMap(v => (Array.isArray(v) ? v : [String(v)]))
      .join(' ')
      .toLowerCase();
    const fullEvaluatedText = (combinedSymptomText + ' ' + followUpText).trim();

    const redFlagEvaluation = evaluateRedFlags(fullEvaluatedText);
    const isEmergency = redFlagEvaluation.isEmergency || clampedSeverity >= 9;
    const emergencyReason = redFlagEvaluation.isEmergency
      ? redFlagEvaluation.reason
      : 'Severe pain intensity (9-10/10) reported.';

    if (isEmergency) {
      return res.status(200).json({
        summary: 'Acute high-risk red-flag indicators detected requiring immediate emergency medical evaluation.',
        possibleConditions: [
          'Acute Medical Emergency (Requires Immediate Hospital Evaluation)'
        ],
        riskLevel: 'High',
        recommendation: 'These symptoms require immediate emergency medical attention. Contact MCE First Aid immediately at +91 9110885805 or trigger Campus Emergency SOS.',
        doctorConsultationRecommended: true,
        selfCare: [
          'Do not drive or transport alone; seek immediate campus or emergency assistance',
          'Keep seated or lying down comfortably in a safe position',
          'Loosen restrictive clothing around neck and chest',
          'Do NOT administer unprescribed oral medications before clinical evaluation'
        ],
        disclaimer: 'This AI-generated information is for preliminary guidance only and is not a medical diagnosis.',
        // Backwards-compatible fields for CampusCare UI components
        symptom_summary: 'Acute high-risk red-flag indicators detected requiring immediate emergency medical evaluation.',
        possible_conditions: [
          {
            name: 'Acute Medical Emergency (Requires Immediate Hospital Evaluation)',
            likelihood: 'High',
            explanation: emergencyReason || 'Reported symptoms include acute red-flag indicators that warrant immediate hospital casualty evaluation.'
          }
        ],
        urgency: 'EMERGENCY',
        red_flags: [
          emergencyReason || 'Acute high-risk symptom detected',
          'Emergency contact: MCE First Aid (+91 9110885805)'
        ],
        recommended_action: 'These symptoms require immediate emergency medical attention. Contact MCE First Aid immediately at +91 9110885805 or trigger Campus Emergency SOS.',
        recommended_specialty: 'Emergency Medicine / Casualty (HIMS Hassan)',
        common_otc_options: [
          'Do NOT take oral medications or self-prescribe OTC drugs during an acute emergency before clinical evaluation.'
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
        isRealAI: false,
        provider: 'deterministic-red-flag-engine'
      });
    }

    // 3. SECURE GOOGLE GEMINI API CALL (Server-side ONLY)
    const apiKey = process.env.GEMINI_API_KEY || '';

    if (!apiKey || apiKey.length < 10) {
      return res.status(503).json({
        error: 'AI Symptom Checker service is not configured with GEMINI_API_KEY in the server environment. Please consult Campus Health Centre or a doctor.'
      });
    }

    // Determine specialty category
    let inferredSpecialty = 'General Medicine';
    if (combinedSymptomText.includes('skin') || combinedSymptomText.includes('itch') || combinedSymptomText.includes('rash')) {
      inferredSpecialty = 'Dermatology';
    } else if (combinedSymptomText.includes('back') || combinedSymptomText.includes('joint') || combinedSymptomText.includes('bone') || combinedSymptomText.includes('sprain')) {
      inferredSpecialty = 'Orthopedics';
    } else if (combinedSymptomText.includes('eye') || combinedSymptomText.includes('vision')) {
      inferredSpecialty = 'Ophthalmology';
    } else if (combinedSymptomText.includes('ear') || combinedSymptomText.includes('throat') || combinedSymptomText.includes('sinus')) {
      inferredSpecialty = 'ENT';
    } else if (combinedSymptomText.includes('anxiety') || combinedSymptomText.includes('depression') || combinedSymptomText.includes('panic') || combinedSymptomText.includes('stress')) {
      inferredSpecialty = 'Mental Health / Psychiatry';
    }

    const systemPrompt = `You are a clinical decision-support and health guidance assistant for CampusCare at Malnad College of Engineering (MCE Hassan, Karnataka).
Analyze the student's symptoms for PRELIMINARY GUIDANCE ONLY.

CRITICAL MEDICAL SAFETY RULES:
1. Never claim a definitive medical diagnosis. State possible causes to discuss with a healthcare professional.
2. Never prescribe prescription medicines or individualized dosing schedules.
3. Suggest supportive general self-care guidance (rest, hydration, etc.) appropriate for the symptoms.
4. Risk level must be strictly one of: "Low", "Moderate", "High".
5. Recommend doctor consultation whenever symptoms are persistent, severe, or ambiguous.
6. Clearly include the exact disclaimer: "This AI-generated information is for preliminary guidance only and is not a medical diagnosis."
7. Return ONLY a single valid JSON object adhering strictly to the schema below. No markdown fences outside the JSON, no introductory or conversational remarks.

Student Context:
- Reported Symptoms: ${sanitizedSymptoms.join(', ') || 'See description'}
- Description: ${sanitizedFreeText || 'None'}
- Severity (1-10): ${clampedSeverity}
- Duration: ${clampedDuration} day(s)
- Demographics: ${sanitize(ageGroup)}

JSON Output Schema:
{
  "summary": "1-2 sentence clinical summary of the entered symptoms",
  "possibleConditions": ["Possible condition 1", "Possible condition 2", "Possible condition 3"],
  "riskLevel": "Low | Moderate | High",
  "recommendation": "Recommended actionable next step for the student",
  "doctorConsultationRecommended": true | false,
  "selfCare": ["Self-care guidance point 1", "Self-care guidance point 2", "Self-care guidance point 3"],
  "disclaimer": "This AI-generated information is for preliminary guidance only and is not a medical diagnosis."
}`;

    const candidateModels = [
      process.env.GEMINI_MODEL,
      'gemini-1.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-pro'
    ].filter(Boolean) as string[];

    let rawAiText = '';
    let successfulModel = '';

    for (const model of candidateModels) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey
            },
            signal: AbortSignal.timeout(8000),
            body: JSON.stringify({
              contents: [{ parts: [{ text: systemPrompt }] }],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 1000,
                responseMimeType: 'application/json'
              }
            })
          }
        );

        if (response.ok) {
          const geminiData = await response.json();
          const candidateText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
          if (candidateText) {
            rawAiText = candidateText;
            successfulModel = model;
            break;
          }
        }
      } catch (err: any) {
        console.warn(`[Gemini] Model ${model} invocation attempt failed:`, err.message);
      }
    }

    if (!rawAiText) {
      return res.status(503).json({
        error: 'AI Symptom Checker is temporarily unavailable. Please consult Campus Health Centre or a doctor.'
      });
    }

    let parsed: any = null;
    let cleanJson = rawAiText.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    }

    try {
      parsed = JSON.parse(cleanJson);
    } catch {
      const match = cleanJson.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {}
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      return res.status(503).json({
        error: 'Failed to parse AI symptom evaluation response.'
      });
    }

    const summary = sanitize(parsed.summary || parsed.symptom_summary || 'Preliminary symptom guidance completed.');
    const rawPossibleConditions: string[] = Array.isArray(parsed.possibleConditions)
      ? parsed.possibleConditions.map((c: any) => typeof c === 'string' ? sanitize(c) : sanitize(c.name || ''))
      : Array.isArray(parsed.possible_conditions)
      ? parsed.possible_conditions.map((c: any) => typeof c === 'string' ? sanitize(c) : sanitize(c.name || ''))
      : ['General Symptom Evaluation'];

    const riskLevel: 'Low' | 'Moderate' | 'High' = ['Low', 'Moderate', 'High'].includes(parsed.riskLevel)
      ? parsed.riskLevel
      : clampedSeverity >= 7 ? 'High' : clampedSeverity >= 4 ? 'Moderate' : 'Low';

    const recommendation = sanitize(parsed.recommendation || parsed.recommended_action || 'Consult with a qualified healthcare professional if symptoms persist.');
    const doctorConsultationRecommended = typeof parsed.doctorConsultationRecommended === 'boolean'
      ? parsed.doctorConsultationRecommended
      : (riskLevel === 'High' || clampedSeverity >= 5 || clampedDuration >= 3);

    const selfCare: string[] = Array.isArray(parsed.selfCare)
      ? parsed.selfCare.map((s: any) => sanitize(String(s))).filter(Boolean)
      : Array.isArray(parsed.common_otc_options)
      ? parsed.common_otc_options.map((s: any) => sanitize(String(s))).filter(Boolean)
      : [
          'Get adequate rest and stay well hydrated',
          'Monitor symptoms and seek medical evaluation if condition worsens'
        ];

    const disclaimer = 'This AI-generated information is for preliminary guidance only and is not a medical diagnosis.';

    // Construct unified response containing exact requested format and rich UI bindings
    const structuredResponse = {
      summary,
      possibleConditions: rawPossibleConditions,
      riskLevel,
      recommendation,
      doctorConsultationRecommended,
      selfCare,
      disclaimer,

      // Complementary mappings for CampusCare UI components
      symptom_summary: summary,
      possible_conditions: rawPossibleConditions.map(name => ({
        name,
        likelihood: 'Possible' as const,
        explanation: 'Possible cause to discuss with a qualified healthcare provider.'
      })),
      urgency: (riskLevel === 'High' ? 'URGENT' : riskLevel === 'Moderate' ? 'MODERATE' : 'LOW') as 'LOW' | 'MODERATE' | 'URGENT',
      red_flags: [
        'Sudden acute worsening of symptoms',
        'Difficulty breathing or acute chest pain',
        'High persistent fever (>102°F)'
      ],
      recommended_action: recommendation,
      recommended_specialty: inferredSpecialty,
      common_otc_options: selfCare,
      medicine_precautions: [
        'Do not exceed recommended dosages of any OTC medicine.',
        'Consult a doctor before combining multiple medicines or if you have pre-existing conditions.'
      ],
      sources: [
        { name: 'MedlinePlus Health Topics', url: 'https://medlineplus.gov/all_healthtopics.html' },
        { name: 'WHO Health Topics', url: 'https://www.who.int/health-topics' }
      ],
      emergency: false,
      isRealAI: true,
      provider: `Google Gemini (${successfulModel})`
    };

    return res.status(200).json(structuredResponse);

  } catch (err: any) {
    console.error('[SymptomChecker] Server execution error:', err);
    return res.status(500).json({
      error: 'An internal error occurred while processing the symptom check.'
    });
  }
}
