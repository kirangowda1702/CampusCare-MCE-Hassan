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

// Common Verified Medicines Database
const VERIFIED_MEDICINE_DATABASE: Record<string, {
  name: string;
  general_use: string;
  warnings: string;
  cautions: string;
  side_effects: string;
  interaction_warnings: string;
  source: string;
  source_url: string;
}> = {
  paracetamol: {
    name: 'Paracetamol (Acetaminophen)',
    general_use: 'Used for temporary relief of mild-to-moderate pain and reduction of fever.',
    warnings: 'Severe liver injury may occur if taken in excessive amounts, with alcohol, or when combined with other acetaminophen-containing products.',
    cautions: 'Strictly follow package label or clinician/pharmacist dosing instructions. Do not combine with other products containing paracetamol/acetaminophen. Exercise caution in pre-existing liver disease or chronic alcohol use.',
    side_effects: 'Generally well-tolerated at recommended doses; potential allergic skin reactions or acute hepatic toxicity in overdose.',
    interaction_warnings: 'Do not take alongside other paracetamol/acetaminophen-containing medications (including cold/flu remedies) to prevent accidental overdose.',
    source: 'MedlinePlus Drug Information',
    source_url: 'https://medlineplus.gov/druginfo/meds/a681004.html'
  },
  acetaminophen: {
    name: 'Paracetamol (Acetaminophen)',
    general_use: 'Used for temporary relief of mild-to-moderate pain and reduction of fever.',
    warnings: 'Severe liver injury may occur if taken in excessive amounts, with alcohol, or when combined with other acetaminophen-containing products.',
    cautions: 'Strictly follow package label or clinician/pharmacist dosing instructions. Do not combine with other products containing paracetamol/acetaminophen. Exercise caution in pre-existing liver disease or chronic alcohol use.',
    side_effects: 'Generally well-tolerated at recommended doses; potential allergic skin reactions or acute hepatic toxicity in overdose.',
    interaction_warnings: 'Do not take alongside other paracetamol/acetaminophen-containing medications (including cold/flu remedies) to prevent accidental overdose.',
    source: 'MedlinePlus Drug Information',
    source_url: 'https://medlineplus.gov/druginfo/meds/a681004.html'
  },
  ibuprofen: {
    name: 'Ibuprofen',
    general_use: 'Nonsteroidal anti-inflammatory drug (NSAID) used to relieve pain, reduce inflammation, and lower fever.',
    warnings: 'May increase the risk of severe stomach ulcers, gastrointestinal bleeding, or cardiovascular events with prolonged high doses.',
    cautions: 'Always take with food or milk. Avoid in active stomach ulcers, third trimester of pregnancy, severe heart failure, or asthma triggered by NSAIDs.',
    side_effects: 'Stomach ache, heartburn, nausea, dizziness, indigestion.',
    interaction_warnings: 'Interacts with aspirin, anticoagulants (blood thinners), other NSAIDs, steroids, and certain blood pressure medications.',
    source: 'MedlinePlus Drug Information',
    source_url: 'https://medlineplus.gov/druginfo/meds/a682159.html'
  },
  cetirizine: {
    name: 'Cetirizine',
    general_use: 'Second-generation antihistamine used to relieve allergy symptoms such as watery eyes, runny nose, sneezing, itching, and hives.',
    warnings: 'May cause drowsiness. Exercise caution when driving or operating machinery.',
    cautions: 'Use with caution in elderly individuals and patients with moderate-to-severe renal impairment.',
    side_effects: 'Drowsiness, dry mouth, tiredness, mild headache.',
    interaction_warnings: 'Avoid alcohol and central nervous system depressants as they can worsen sedation.',
    source: 'MedlinePlus Drug Information',
    source_url: 'https://medlineplus.gov/druginfo/meds/a698026.html'
  },
  ors: {
    name: 'Oral Rehydration Salts (ORS)',
    general_use: 'Electrolyte and fluid replacement solution recommended by WHO for hydration in acute diarrhea, vomiting, and heat exhaustion.',
    warnings: 'Must be dissolved in the exact specified volume of clean drinking water (usually 1 packet per 1 litre).',
    cautions: 'Do not boil after reconstitution. Consume within 24 hours of preparation.',
    side_effects: 'Safe and well tolerated when mixed in the correct water ratio.',
    interaction_warnings: 'No significant drug interactions; safe for all age groups.',
    source: 'WHO Diarrhoeal Disease Guidance',
    source_url: 'https://www.who.int/news-room/fact-sheets/detail/diarrhoeal-disease'
  }
};

// Known common symptoms list to prevent mislabeling symptoms as drugs
const KNOWN_SYMPTOMS_LIST = [
  'headache', 'fever', 'cough', 'cold', 'sore throat', 'back pain', 'joint pain',
  'stomach pain', 'nausea', 'vomiting', 'diarrhea', 'fatigue', 'rash', 'itchy skin',
  'chest pain', 'shortness of breath', 'dizziness', 'anxiety', 'weakness'
];

// Red-flag emergency indicators
const EMERGENCY_RED_FLAGS = [
  { pattern: /weakness in.*(arm|leg|face|side)/i, reason: 'Sudden limb or facial weakness is a potential stroke warning sign.' },
  { pattern: /slurred speech|difficulty speaking/i, reason: 'Speech impairment is an acute neurological emergency.' },
  { pattern: /sudden severe headache|worst headache of my life|thunderclap/i, reason: 'Sudden explosive headache requires immediate intracranial evaluation.' },
  { pattern: /chest pain|chest pressure|chest tightness|radiating to (left arm|jaw|back)/i, reason: 'Acute chest pain requires immediate cardiac emergency triage.' },
  { pattern: /shortness of breath|severe breathing difficulty|struggling to breathe/i, reason: 'Acute respiratory distress requires immediate emergency care.' },
  { pattern: /loss of consciousness|unconscious|fainting|passed out/i, reason: 'Loss of consciousness is a critical red-flag emergency.' },
  { pattern: /anaphylaxis|throat swelling|severe allergic reaction/i, reason: 'Anaphylaxis requires immediate epinephrine and emergency intervention.' },
  { pattern: /coughing blood|vomiting blood|uncontrolled bleeding/i, reason: 'Acute active hemorrhage requires emergency trauma care.' },
  { pattern: /seizure|convulsions/i, reason: 'Active seizure requires emergency clinical management.' }
];

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
    // 1. MEDICINE SEARCH MODE
    // ==========================================
    if (medicineQuery && typeof medicineQuery === 'string') {
      const qClean = sanitize(medicineQuery).trim();
      const qLower = qClean.toLowerCase();

      // Guard: Do not label a symptom as a drug!
      const isSymptomWord = KNOWN_SYMPTOMS_LIST.some(s => qLower === s || qLower.includes(s));
      if (isSymptomWord && !VERIFIED_MEDICINE_DATABASE[qLower]) {
        return res.status(400).json({
          error: `"${qClean}" is a medical symptom, not a drug or medication. Please use the Symptom Guidance tool to evaluate this symptom.`
        });
      }

      const matchedKey = Object.keys(VERIFIED_MEDICINE_DATABASE).find(k => qLower.includes(k) || k.includes(qLower));

      if (matchedKey) {
        const medInfo = VERIFIED_MEDICINE_DATABASE[matchedKey];
        return res.status(200).json({
          medicine_information: [medInfo],
          disclaimer: 'Medication choice depends on your symptoms, medical history, allergies, current medicines, age, and other clinical factors. Please consult a qualified healthcare professional.'
        });
      } else {
        return res.status(200).json({
          medicine_information: [
            {
              name: qClean,
              general_use: 'General medication information requires prescription and clinical evaluation.',
              warnings: 'Always consult a certified medical practitioner or pharmacist before taking any medication. Do not self-medicate.',
              cautions: 'Use strictly as advised by a qualified healthcare professional.',
              side_effects: 'Individual side effects vary by patient history and drug formulation.',
              interaction_warnings: 'Medication interactions depend on active ingredients and co-administered drugs.',
              source: 'MedlinePlus Drug Information Database',
              source_url: 'https://medlineplus.gov/druginformation.html'
            }
          ],
          disclaimer: 'Medication choice depends on your symptoms, medical history, allergies, current medicines, age, and other clinical factors. Please consult a qualified healthcare professional.'
        });
      }
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
    let detectedRedFlagReason = '';
    for (const rf of EMERGENCY_RED_FLAGS) {
      if (rf.pattern.test(combinedSymptomText)) {
        detectedRedFlagReason = rf.reason;
        break;
      }
    }

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
      const primaryModel = 'gemma-4-31b-it';

      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${primaryModel}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(8500),
            body: JSON.stringify({
              contents: [{ parts: [{ text: systemPrompt }] }]
            })
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      } catch (geminiErr: any) {
        // Immediate safe exit on upstream timeout or network failure
      }

      if (!rawText) {
        return res.status(503).json({
          error: 'AI Health Guidance is currently unavailable. Please consult a doctor or contact Campus Health Centre.'
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
        provider: primaryModel
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
