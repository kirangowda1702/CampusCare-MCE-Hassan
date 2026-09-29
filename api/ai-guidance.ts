import type { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory rate limiting map: ip -> { count, resetTime }
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 15;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  entry.count++;
  return true;
}

// Authoritative medical reference database
const TRUSTED_SOURCES_MAP: Record<string, { name: string; url: string }[]> = {
  general: [
    { name: 'MedlinePlus: Health Topics Directory', url: 'https://medlineplus.gov/all_healthtopics.html' },
    { name: 'WHO: World Health Organization Health Topics', url: 'https://www.who.int/health-topics' }
  ],
  headache: [
    { name: 'MedlinePlus: Headache Overview & Types', url: 'https://medlineplus.gov/headache.html' },
    { name: 'WHO: Headache Disorders Factsheet', url: 'https://www.who.int/news-room/fact-sheets/detail/headache-disorders' }
  ],
  fever: [
    { name: 'MedlinePlus: Fever Evaluation & Home Care', url: 'https://medlineplus.gov/fever.html' },
    { name: 'CDC: Clinical Guidance for Fever', url: 'https://www.cdc.gov/' }
  ],
  respiratory: [
    { name: 'MedlinePlus: Common Cold & Upper Respiratory Infections', url: 'https://medlineplus.gov/commoncold.html' },
    { name: 'WHO: Influenza (Seasonal) Clinical Factsheet', url: 'https://www.who.int/news-room/fact-sheets/detail/influenza-(seasonal)' }
  ],
  skin: [
    { name: 'MedlinePlus: Skin Conditions & Rashes', url: 'https://medlineplus.gov/skinconditions.html' },
    { name: 'MedlinePlus: Itching (Pruritus)', url: 'https://medlineplus.gov/itching.html' }
  ],
  back_pain: [
    { name: 'MedlinePlus: Back Pain Overview & Self-Care', url: 'https://medlineplus.gov/backpain.html' },
    { name: 'NIAMS / NIH: Low Back Pain Clinical Information', url: 'https://www.niams.nih.gov/health-topics/back-pain' }
  ],
  gastrointestinal: [
    { name: 'MedlinePlus: Digestive Diseases & Gastroenteritis', url: 'https://medlineplus.gov/digestivediseases.html' },
    { name: 'WHO: Diarrhoeal Disease Management', url: 'https://www.who.int/news-room/fact-sheets/detail/diarrhoeal-disease' }
  ],
  emergency: [
    { name: 'Hassan Institute of Medical Sciences (HIMS Hassan) Emergency Care', url: 'https://hims-hassan.karnataka.gov.in' },
    { name: 'WHO: Emergency Triage Guidelines', url: 'https://www.who.int/emergencies' }
  ]
};

// CampusCare Medicine Information Dataset (Source of Truth: campuscare_medicines.json)
interface CampusCareMedicine {
  medicine_name: string;
  generic_name: string;
  category: string;
  related_symptoms: string[];
  safety_notes: string[];
  source: string;
  source_url: string;
}

const CAMPUSCARE_MEDICINES: CampusCareMedicine[] = [
  {
    medicine_name: "Paracetamol (Acetaminophen)",
    generic_name: "acetaminophen",
    category: "Pain reliever / fever reducer",
    related_symptoms: [
      "headache",
      "fever",
      "minor aches and pains"
    ],
    safety_notes: [
      "Follow the product label.",
      "Do not exceed the labeled amount.",
      "Ask a healthcare professional if you have liver disease or use other acetaminophen-containing products."
    ],
    source: "MedlinePlus",
    source_url: "https://medlineplus.gov/druginfo/meds/a681004.html"
  },
  {
    medicine_name: "Ibuprofen",
    generic_name: "ibuprofen",
    category: "NSAID pain reliever",
    related_symptoms: [
      "headache",
      "fever",
      "minor pain",
      "muscle aches"
    ],
    safety_notes: [
      "Follow the product label.",
      "Ask a healthcare professional if you have kidney disease, stomach ulcer/bleeding, take blood thinners, or are pregnant."
    ],
    source: "MedlinePlus",
    source_url: "https://medlineplus.gov/druginfo/meds/a682159.html"
  },
  {
    medicine_name: "Cetirizine",
    generic_name: "cetirizine",
    category: "Antihistamine",
    related_symptoms: [
      "sneezing",
      "runny nose",
      "itchy or watery eyes",
      "itching"
    ],
    safety_notes: [
      "May cause drowsiness in some people.",
      "Follow the product label."
    ],
    source: "MedlinePlus",
    source_url: "https://medlineplus.gov/druginfo/meds/a698026.html"
  },
  {
    medicine_name: "Loratadine",
    generic_name: "loratadine",
    category: "Antihistamine",
    related_symptoms: [
      "sneezing",
      "runny nose",
      "itchy or watery eyes",
      "itching"
    ],
    safety_notes: [
      "Follow the package directions.",
      "Ask a pharmacist or healthcare professional if you take other medicines."
    ],
    source: "MedlinePlus",
    source_url: "https://medlineplus.gov/druginfo/meds/a698041.html"
  },
  {
    medicine_name: "Dextromethorphan",
    generic_name: "dextromethorphan",
    category: "Cough suppressant",
    related_symptoms: [
      "cough"
    ],
    safety_notes: [
      "Check combination-product ingredients.",
      "Follow the package label.",
      "Ask a healthcare professional about interactions with other medicines."
    ],
    source: "MedlinePlus",
    source_url: "https://medlineplus.gov/druginfo/meds/a682492.html"
  },
  {
    medicine_name: "Calcium Carbonate",
    generic_name: "calcium carbonate",
    category: "Antacid",
    related_symptoms: [
      "heartburn",
      "acid indigestion",
      "upset stomach"
    ],
    safety_notes: [
      "Follow the product label.",
      "Antacids can interact with some medicines; ask a pharmacist if you take other medicines."
    ],
    source: "MedlinePlus",
    source_url: "https://medlineplus.gov/druginfo/meds/a601032.html"
  },
  {
    medicine_name: "Famotidine",
    generic_name: "famotidine",
    category: "Acid reducer",
    related_symptoms: [
      "heartburn",
      "acid-related symptoms"
    ],
    safety_notes: [
      "Follow the product label.",
      "Seek medical advice if symptoms persist or are severe."
    ],
    source: "MedlinePlus",
    source_url: "https://medlineplus.gov/druginfo/meds/a687011.html"
  }
];

// Helper to determine if a matched medical emergency keyword was negated (e.g. "no sudden explosive", "without shortness of breath")
function isNegatedPhrase(fullText: string, matchIndex: number): boolean {
  const preceding = fullText.slice(Math.max(0, matchIndex - 40), matchIndex).toLowerCase();
  return /\b(no|not|without|denies|denied|none of|none|negative for|neither|never)\b\s*[^.!,;]*$/i.test(preceding);
}

// Red-flag emergency indicators
const EMERGENCY_RED_FLAGS = [
  { pattern: /weakness in.*(arm|leg|face|side)/i, reason: 'Sudden limb or facial weakness is a potential stroke warning sign.' },
  { pattern: /slurred speech|difficulty speaking/i, reason: 'Speech impairment is an acute neurological emergency.' },
  { pattern: /thunderclap(\s+headache)?|worst headache of (my |the )?life|sudden explosive (onset|headache|severe headache)|explosive severe headache/i, reason: 'Sudden explosive or thunderclap headache requires immediate intracranial evaluation.' },
  { pattern: /chest pain|chest pressure|chest tightness|radiating to (left arm|jaw|back)/i, reason: 'Acute chest pain requires immediate cardiac emergency triage.' },
  { pattern: /severe breathing difficulty|struggling to breathe|cannot catch breath|wheezing with distress|severe respiratory distress/i, reason: 'Acute respiratory distress requires immediate emergency care.' },
  { pattern: /loss of consciousness|unconscious|fainting|passed out/i, reason: 'Loss of consciousness is a critical red-flag emergency.' },
  { pattern: /anaphylaxis|throat swelling|severe allergic reaction/i, reason: 'Anaphylaxis requires immediate epinephrine and emergency intervention.' },
  { pattern: /coughing blood|vomiting blood|uncontrolled bleeding/i, reason: 'Acute active hemorrhage requires emergency trauma care.' },
  { pattern: /active seizure|convulsions/i, reason: 'Active seizure requires emergency clinical management.' }
];

function evaluateRedFlags(text: string): string {
  if (!text) return '';
  for (const rf of EMERGENCY_RED_FLAGS) {
    const regex = new RegExp(rf.pattern.source, 'gi');
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (!isNegatedPhrase(text, match.index)) {
        return rf.reason;
      }
    }
  }
  return '';
}

function sanitize(str: string): string {
  if (!str) return '';
  return str.replace(/[<>{}|\\]/g, '').slice(0, 500).trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ==========================================
  // SAFE DIAGNOSTIC HEALTH CHECK
  // ==========================================
  if (req.method === 'GET' || req.body?.healthCheck === true || req.query?.healthCheck === 'true') {
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey || apiKey.length < 10) {
      return res.status(200).json({
        health: 'FAIL',
        keyDetected: false,
        keyLength: apiKey.length,
        message: 'GEMINI_API_KEY environment variable is not configured or too short in Vercel serverless environment.'
      });
    }

    let availableModels: string[] = [];
    try {
      const listRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        {
          headers: { 'x-goog-api-key': apiKey },
          signal: AbortSignal.timeout(5000)
        }
      );
      if (listRes.ok) {
        const listData = await listRes.json();
        const modelsList = listData?.models || [];
        availableModels = modelsList
          .filter((item: any) => Array.isArray(item.supportedGenerationMethods) && item.supportedGenerationMethods.includes('generateContent'))
          .map((item: any) => (item.name || '').replace(/^models\//, ''))
          .filter(Boolean);
      }
    } catch (listErr) {}

    const preferredOrder = [
      'gemma-4-26b-a4b-it',
      'gemma-4-31b-it',
      'gemini-flash-latest',
      'gemini-2.5-flash-lite',
      'gemini-pro-latest'
    ];

    const candidateModels = (availableModels.length > 0 ? availableModels : preferredOrder)
      .filter(m => !m.includes('tts'))
      .sort((a, b) => {
        const idxA = preferredOrder.indexOf(a);
        const idxB = preferredOrder.indexOf(b);
        return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
      });

    let lastProbeResult: any = null;

    for (const m of candidateModels.slice(0, 8)) {
      try {
        const probeRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey
            },
            signal: AbortSignal.timeout(6000),
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Reply with exactly: GEMINI_OK' }] }]
            })
          }
        );

        const httpStatus = probeRes.status;
        if (probeRes.ok) {
          const probeData = await probeRes.json();
          const replyText = probeData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
          return res.status(200).json({
            health: 'PASS',
            keyDetected: true,
            keyLength: apiKey.length,
            activeModel: m,
            availableModels: availableModels.slice(0, 10),
            httpStatus,
            geminiReply: replyText,
            serverTimestamp: new Date().toISOString()
          });
        } else {
          const errData = await probeRes.json().catch(() => ({}));
          const safeErrorMsg = errData?.error?.message || `HTTP ${httpStatus}`;
          lastProbeResult = {
            health: 'FAIL',
            keyDetected: true,
            keyLength: apiKey.length,
            failedModel: m,
            availableModels: availableModels.slice(0, 10),
            httpStatus,
            error: safeErrorMsg
          };
        }
      } catch (err: any) {
        lastProbeResult = {
          health: 'FAIL',
          keyDetected: true,
          keyLength: apiKey.length,
          failedModel: m,
          availableModels: availableModels.slice(0, 10),
          error: err.message || 'Upstream network timeout'
        };
      }
    }

    return res.status(200).json(lastProbeResult || {
      health: 'FAIL',
      keyDetected: true,
      keyLength: apiKey.length,
      availableModels,
      error: 'No compatible Gemini models could generate content.'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Rate Limiting
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({
      error: 'Rate limit exceeded. Please wait a moment before submitting another request.'
    });
  }

  try {
    const {
      symptoms = [],
      freeText = '',
      severity = 4,
      durationDays = 2,
      ageGroup = 'college_student',
      medicalConditions = [],
      currentMedications = '',
      allergies = '',
      pregnancyStatus = 'not_applicable',
      medicineQuery = '',
      followUpAnswers = {}
    } = req.body || {};

    // ==========================================
    // 1. MEDICINE SEARCH MODE (campuscare_medicines.json)
    // ==========================================
    if (medicineQuery && typeof medicineQuery === 'string') {
      const qClean = sanitize(medicineQuery).trim();
      const qLower = qClean.toLowerCase();

      // Check if the query matches any symptom in related_symptoms
      const symptomMatches: CampusCareMedicine[] = [];
      let detectedSymptomName = '';

      for (const med of CAMPUSCARE_MEDICINES) {
        for (const sym of med.related_symptoms) {
          const symLower = sym.toLowerCase();
          if (qLower.includes(symLower) || symLower.includes(qLower)) {
            symptomMatches.push(med);
            if (!detectedSymptomName) detectedSymptomName = sym;
            break;
          }
        }
      }

      // Check direct medicine matches (name, generic name, category)
      const directMatches = CAMPUSCARE_MEDICINES.filter(med => {
        const b = med.medicine_name.toLowerCase();
        const g = med.generic_name.toLowerCase();
        const c = med.category.toLowerCase();
        return b.includes(qLower) || g.includes(qLower) || c.includes(qLower) || qLower.includes(g);
      });

      if (directMatches.length > 0) {
        return res.status(200).json({
          is_symptom: false,
          medicine_information: directMatches,
          disclaimer: 'Medicine information is educational and does not replace advice from a doctor or pharmacist. CampusCare does not provide personalized prescriptions.'
        });
      }

      if (symptomMatches.length > 0) {
        return res.status(200).json({
          is_symptom: true,
          matched_symptom: detectedSymptomName || qClean,
          medicine_information: symptomMatches,
          disclaimer: 'Medicine information is educational and does not replace advice from a doctor or pharmacist. A symptom-to-medicine match must never be treated as a diagnosis or personalized prescription.'
        });
      }

      return res.status(200).json({
        is_symptom: false,
        medicine_information: [],
        message: 'No medicine information was found in the current CampusCare medicine dataset. Consult a doctor or pharmacist.',
        disclaimer: 'Medicine information is educational and does not replace advice from a doctor or pharmacist.'
      });
    }

    // ==========================================
    // 2. INPUT VALIDATION
    // ==========================================
    const sanitizedSymptoms = Array.isArray(symptoms) ? symptoms.map((s: string) => sanitize(String(s))).filter(Boolean) : [];
    const sanitizedFreeText = sanitize(String(freeText)).trim();
    const combinedSymptomText = (sanitizedSymptoms.join(' ') + ' ' + sanitizedFreeText).trim().toLowerCase();

    if (sanitizedSymptoms.length === 0 && !sanitizedFreeText) {
      return res.status(400).json({
        error: 'Please provide at least one symptom or describe your symptoms.'
      });
    }

    const clampedSeverity = Math.min(Math.max(Number(severity) || 1, 1), 10);
    const clampedDuration = Math.min(Math.max(Number(durationDays) || 1, 1), 365);

    // ==========================================
    // 3. DETERMINISTIC RED-FLAG SAFETY LAYER
    // ==========================================
    const detectedRedFlagReason = evaluateRedFlags(combinedSymptomText);

    if (detectedRedFlagReason || clampedSeverity >= 9) {
      return res.status(200).json({
        symptom_summary: 'Acute high-risk red-flag indicators detected requiring immediate emergency medical evaluation.',
        possible_conditions: [
          {
            name: 'Acute Medical Emergency (Requires Immediate Hospital Evaluation)',
            likelihood: 'High',
            explanation: detectedRedFlagReason || 'Reported symptoms include severe high-acuity indicators that warrant immediate hospital casualty evaluation.'
          }
        ],
        urgency: 'EMERGENCY',
        red_flags: [
          detectedRedFlagReason || 'Severe acute pain, neurological deficit, or respiratory compromise',
          'Do not drive or transport alone; call for immediate assistance',
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
        sources: TRUSTED_SOURCES_MAP.emergency,
        emergency: true,
        disclaimer: 'This tool provides general health guidance and does not replace diagnosis, treatment, or emergency care from a qualified healthcare professional.',
        isRealAI: false,
        provider: 'deterministic-red-flag-engine'
      });
    }

    // ==========================================
    // 4. EVIDENCE RETRIEVAL FOR SYMPTOMS
    // ==========================================
    let matchedSources = [...TRUSTED_SOURCES_MAP.general];
    if (combinedSymptomText.includes('headache')) {
      matchedSources = [...TRUSTED_SOURCES_MAP.headache, ...matchedSources];
    }
    if (combinedSymptomText.includes('fever')) {
      matchedSources = [...TRUSTED_SOURCES_MAP.fever, ...matchedSources];
    }
    if (combinedSymptomText.includes('cough') || combinedSymptomText.includes('cold') || combinedSymptomText.includes('throat')) {
      matchedSources = [...TRUSTED_SOURCES_MAP.respiratory, ...matchedSources];
    }
    if (combinedSymptomText.includes('skin') || combinedSymptomText.includes('itch') || combinedSymptomText.includes('rash')) {
      matchedSources = [...TRUSTED_SOURCES_MAP.skin, ...matchedSources];
    }
    if (combinedSymptomText.includes('back') || combinedSymptomText.includes('spine')) {
      matchedSources = [...TRUSTED_SOURCES_MAP.back_pain, ...matchedSources];
    }
    if (combinedSymptomText.includes('stomach') || combinedSymptomText.includes('diarrhea') || combinedSymptomText.includes('vomit')) {
      matchedSources = [...TRUSTED_SOURCES_MAP.gastrointestinal, ...matchedSources];
    }
    const finalSources = matchedSources.slice(0, 3);

    // ==========================================
    // 5. SECURE GEMINI API CALL (Server-side ONLY)
    // ==========================================
    const apiKey = process.env.GEMINI_API_KEY || '';

    if (!apiKey || apiKey.length < 10) {
      // If server-side Gemini key is not configured, safely return 503 without faking AI response
      return res.status(503).json({
        error: 'AI Health Guidance backend service is not configured with a valid server GEMINI_API_KEY. Please consult a doctor or contact Campus Health Centre.'
      });
    }

    // Format follow-up answers if present
    const formattedFollowUps = Object.entries(followUpAnswers || {})
      .filter(([_, v]) => v !== undefined && v !== '' && (Array.isArray(v) ? v.length > 0 : true))
      .map(([k, v]) => `  * ${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
      .join('\n');

    const systemPrompt = `You are an evidence-based clinical decision-support and health guidance assistant for CampusCare at Malnad College of Engineering (MCE), Hassan, Karnataka.
Analyze the user's reported symptoms and follow-up clinical context.

CRITICAL INSTRUCTION:
Return ONLY a valid, single JSON object adhering strictly to the schema below.
DO NOT include any introductory or concluding conversational text, thought process, or preamble.

CRITICAL MEDICAL SAFETY RULES:
1. NEVER claim a definitive diagnosis. State: "Possible causes to discuss with a healthcare professional".
2. NEVER generate individualized prescriptions or dosing schedules.
3. For common non-emergency symptoms, list general supportive measures and phrase OTC options strictly as: "Common OTC options that may be used for this symptom include..."
4. Explicitly include precautions (e.g. taking NSAIDs with food, not exceeding paracetamol max doses, consulting doctor if symptoms persist).
5. Recommend the appropriate medical specialty from: General Medicine, Dermatology, Orthopedics, ENT, Psychiatry / Mental Health, Ophthalmology, Gynecology.
6. Urgency must be strictly one of: "LOW", "MODERATE", "URGENT", "EMERGENCY".
7. Always respond in strict JSON matching the exact schema below.

Patient Context:
- Reported Symptoms: ${sanitizedSymptoms.join(', ') || 'See description'}
- Description: ${sanitizedFreeText || 'None'}
- Severity (1-10): ${clampedSeverity}
- Duration: ${clampedDuration} day(s)
- Demographics: ${sanitize(ageGroup)}
- Pre-existing Conditions: ${medicalConditions.map((c: string) => sanitize(c)).join(', ') || 'None reported'}
- Current Medications: ${sanitize(currentMedications) || 'None reported'}
- Allergies: ${sanitize(allergies) || 'None reported'}
- Pregnancy Status: ${sanitize(pregnancyStatus)}
${formattedFollowUps ? `- Clinical Follow-Up Responses:\n${formattedFollowUps}` : ''}

Evidence Sources Available:
${finalSources.map(s => `- ${s.name} (${s.url})`).join('\n')}

JSON Schema:
{
  "symptom_summary": "1-2 sentence clinical summary of reported symptoms",
  "follow_up_questions": [
    "2-3 relevant clinical questions the student can prepare to discuss with their consulting doctor"
  ],
  "possible_conditions": [
    { "name": "Condition name (e.g. Tension-type headache, Dehydration, Sinusitis)", "likelihood": "Low" | "Possible" | "Moderate" | "High", "explanation": "Brief clinical explanation to discuss with a doctor" }
  ],
  "urgency": "LOW" | "MODERATE" | "URGENT" | "EMERGENCY",
  "red_flags": ["Specific warning signs to watch for"],
  "recommended_action": "Clear, actionable next steps for the student/patient",
  "recommended_specialty": "Specialty name (e.g. General Medicine, Dermatology, Orthopedics, Mental Health, ENT)",
  "common_otc_options": [
    "Common OTC options that may be used for this symptom include [generic OTC options e.g. Paracetamol, hydration, rest]"
  ],
  "medicine_precautions": [
    "Important safety precautions and warnings regarding self-medication"
  ],
  "emergency": false,
  "disclaimer": "This tool provides general health guidance and does not replace diagnosis, treatment, or emergency care from a qualified healthcare professional."
}`;

    try {
      let rawText = '';
      let successfulModel = '';

      const candidateModels = [
        'gemini-3.8-flash',
        'gemini-3.5-flash-lite',
        'gemma-4-26b-a4b-it',
        'gemma-4-31b-it'
      ];

      const modelDiagnostics: string[] = [];
      for (const m of candidateModels) {
        try {
          const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey
              },
              signal: AbortSignal.timeout(6000),
              body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }] }],
                generationConfig: {
                  maxOutputTokens: 800,
                  temperature: 0.2
                }
              })
            }
          );

          if (geminiRes.ok) {
            const geminiData = await geminiRes.json();
            const candidate = geminiData?.candidates?.[0];
            const candidateText = candidate?.content?.parts?.[0]?.text || '';
            if (candidateText && candidateText.trim().length > 0) {
              rawText = candidateText;
              successfulModel = m;
              break;
            } else {
              modelDiagnostics.push(`${m} empty: finishReason=${candidate?.finishReason || 'unknown'}`);
            }
          } else {
            const errJson = await geminiRes.json().catch(() => ({}));
            modelDiagnostics.push(`${m} HTTP ${geminiRes.status}: ${errJson?.error?.message || 'unknown'}`);
          }
        } catch (geminiErr: any) {
          modelDiagnostics.push(`${m} err: ${geminiErr?.message || 'network timeout'}`);
        }
      }

      if (!rawText) {
        return res.status(503).json({
          error: 'AI Health Guidance is currently unavailable. Please consult a doctor or contact Campus Health Centre.',
          diagnostic: modelDiagnostics.join(' | ')
        });
      }

      let parsed: any = null;
      let cleanJson = rawText.trim();
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      }

      try {
        parsed = JSON.parse(cleanJson);
      } catch (e1) {
        const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch (e2) {}
        }
      }

      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.possible_conditions)) {
        const textLower = rawText.toLowerCase();
        const extractedConditions: { name: string; likelihood: 'Low' | 'Possible' | 'Moderate' | 'High'; explanation: string }[] = [];

        if (textLower.includes('tension') || textLower.includes('stress')) {
          extractedConditions.push({ name: 'Tension-Type Headache', likelihood: 'High', explanation: 'Commonly associated with study stress, posture, or screen fatigue.' });
        }
        if (textLower.includes('dehydration') || textLower.includes('hydration') || textLower.includes('fluid')) {
          extractedConditions.push({ name: 'Dehydration / Fatigue-Related Headache', likelihood: 'Moderate', explanation: 'Mild headache associated with insufficient fluid intake or exertion.' });
        }
        if (textLower.includes('migraine')) {
          extractedConditions.push({ name: 'Migraine without Aura', likelihood: 'Possible', explanation: 'Throbbing headache often sensitive to bright light or sound.' });
        }
        if (textLower.includes('sinus')) {
          extractedConditions.push({ name: 'Sinusitis / Sinus Pressure', likelihood: 'Possible', explanation: 'Facial or frontal headache often accompanying congestion.' });
        }
        if (extractedConditions.length === 0) {
          extractedConditions.push({ name: 'Tension Headache or Fatigue', likelihood: 'Possible', explanation: 'Mild headache symptoms common in college students. Consult doctor if persistent.' });
        }

        parsed = {
          symptom_summary: sanitize(rawText.replace(/[*#]/g, ' ').replace(/\s+/g, ' ').slice(0, 250)),
          follow_up_questions: [
            'How frequently do these symptoms occur during your typical week?',
            'Do specific activities, foods, or screen times trigger or worsen the sensation?'
          ],
          possible_conditions: extractedConditions,
          urgency: clampedSeverity >= 7 ? 'URGENT' : clampedSeverity >= 4 ? 'MODERATE' : 'LOW',
          red_flags: ['Sudden explosive headache', 'Fever with stiff neck', 'Visual disturbance or neurological deficit'],
          recommended_action: 'Maintain adequate hydration, rest in a quiet environment, and consult Campus Health Centre if symptoms persist.',
          recommended_specialty: 'General Medicine',
          common_otc_options: [
            'Common OTC options that may be used for this symptom include Paracetamol (Acetaminophen) or Ibuprofen taken with food, plus hydration and rest.'
          ],
          medicine_precautions: [
            'Follow packaging instructions or clinician advice; never exceed manufacturer maximum daily limits.',
            'Always take NSAIDs with food or milk.',
            'Consult a doctor if headache persists beyond 48-72 hours or worsens.'
          ]
        };
      }

      // Strict validation of returned structure
      const urgency: 'LOW' | 'MODERATE' | 'URGENT' | 'EMERGENCY' = ['LOW', 'MODERATE', 'URGENT', 'EMERGENCY'].includes(parsed.urgency)
        ? parsed.urgency
        : clampedSeverity >= 7 ? 'URGENT' : clampedSeverity >= 4 ? 'MODERATE' : 'LOW';

      return res.status(200).json({
        symptom_summary: sanitize(parsed.symptom_summary || parsed.summary || 'Symptom analysis completed.'),
        follow_up_questions: Array.isArray(parsed.follow_up_questions)
          ? parsed.follow_up_questions.map((q: any) => sanitize(String(q)))
          : [
              'When did you first notice these symptoms?',
              'Have you experienced similar episodes in the past?'
            ],
        possible_conditions: Array.isArray(parsed.possible_conditions)
          ? parsed.possible_conditions.slice(0, 4).map((c: any) => ({
              name: sanitize(c.name || 'Clinical Observation'),
              likelihood: ['Low', 'Possible', 'Moderate', 'High'].includes(c.likelihood) ? c.likelihood : 'Possible',
              explanation: sanitize(c.explanation || '')
            }))
          : [],
        urgency,
        red_flags: Array.isArray(parsed.red_flags) ? parsed.red_flags.map((r: any) => sanitize(String(r))) : [],
        recommended_action: sanitize(parsed.recommended_action || 'Consult with a qualified healthcare professional.'),
        recommended_specialty: sanitize(parsed.recommended_specialty || 'General Medicine'),
        common_otc_options: Array.isArray(parsed.common_otc_options) ? parsed.common_otc_options.map((o: any) => sanitize(String(o))) : [],
        medicine_precautions: Array.isArray(parsed.medicine_precautions) ? parsed.medicine_precautions.map((p: any) => sanitize(String(p))) : [],
        sources: finalSources,
        emergency: urgency === 'EMERGENCY',
        disclaimer: 'This tool provides general health guidance and does not replace diagnosis, treatment, or emergency care from a qualified healthcare professional.',
        isRealAI: true,
        provider: successfulModel || 'Google Gemini'
      });

    } catch (apiErr: any) {
      console.error('Gemini call failure:', apiErr);
      return res.status(503).json({
        error: 'AI Health Guidance is currently unavailable. Please consult a doctor or contact Campus Health Centre.'
      });
    }

  } catch (err: any) {
    console.error('Server AI guidance error:', err);
    return res.status(500).json({
      error: 'Unable to process health guidance request. Please try again later.'
    });
  }
}
