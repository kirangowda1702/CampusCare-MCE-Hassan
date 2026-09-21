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
const AUTHORITATIVE_SOURCES_MAP: Record<string, { title: string; url: string; organization: string }[]> = {
  general: [
    { title: 'MedlinePlus Health Topics & Symptoms', url: 'https://medlineplus.gov/all_healthtopics.html', organization: 'National Library of Medicine (NIH)' },
    { title: 'WHO Health Topics & Guidance', url: 'https://www.who.int/health-topics', organization: 'World Health Organization' }
  ],
  respiratory: [
    { title: 'MedlinePlus: Common Cold & Upper Respiratory Infections', url: 'https://medlineplus.gov/commoncold.html', organization: 'MedlinePlus / NIH' },
    { title: 'WHO: Influenza and Seasonal Respiratory Illnesses', url: 'https://www.who.int/news-room/fact-sheets/detail/influenza-(seasonal)', organization: 'World Health Organization' }
  ],
  fever: [
    { title: 'MedlinePlus: Fever Evaluation & Supportive Care', url: 'https://medlineplus.gov/fever.html', organization: 'MedlinePlus / NIH' },
    { title: 'CDC: Fever Guidance and Clinical Overview', url: 'https://www.cdc.gov/', organization: 'Centers for Disease Control and Prevention' }
  ],
  skin: [
    { title: 'MedlinePlus: Skin Conditions & Rashes', url: 'https://medlineplus.gov/skinconditions.html', organization: 'MedlinePlus / NIH' }
  ],
  gastrointestinal: [
    { title: 'MedlinePlus: Digestive Disorders & Gastroenteritis', url: 'https://medlineplus.gov/digestivediseases.html', organization: 'MedlinePlus / NIH' },
    { title: 'WHO: Diarrhoeal Disease Factsheet', url: 'https://www.who.int/news-room/fact-sheets/detail/diarrhoeal-disease', organization: 'World Health Organization' }
  ],
  headache: [
    { title: 'MedlinePlus: Headache & Migraine Overview', url: 'https://medlineplus.gov/headache.html', organization: 'MedlinePlus / NIH' },
    { title: 'WHO: Headache Disorders', url: 'https://www.who.int/news-room/fact-sheets/detail/headache-disorders', organization: 'World Health Organization' }
  ],
  musculoskeletal: [
    { title: 'MedlinePlus: Sprains, Strains, and Joint Pain', url: 'https://medlineplus.gov/sprainsandstrains.html', organization: 'MedlinePlus / NIH' }
  ],
  mental_health: [
    { title: 'MedlinePlus: Stress, Anxiety, and Mood Support', url: 'https://medlineplus.gov/mentalhealthandbehavior.html', organization: 'MedlinePlus / NIH' },
    { title: 'WHO: Mental Health Guidelines', url: 'https://www.who.int/health-topics/mental-health', organization: 'World Health Organization' }
  ],
  emergency: [
    { title: 'HIMS Hassan Emergency Trauma Line & Services', url: 'https://hims-hassan.karnataka.gov.in', organization: 'Hassan Institute of Medical Sciences' },
    { title: 'WHO: Emergency Triage and Clinical Assessment', url: 'https://www.who.int/emergencies', organization: 'World Health Organization' }
  ]
};

// Common Verified Medicines Database
const VERIFIED_MEDICINE_DATABASE: Record<string, {
  name: string;
  general_use: string;
  cautions: string;
  side_effects: string;
  interaction_warnings: string;
  source: string;
}> = {
  paracetamol: {
    name: 'Paracetamol (Acetaminophen)',
    general_use: 'Commonly used for temporary relief of mild-to-moderate pain and fever reduction.',
    cautions: 'Do not exceed maximum daily dosage (typically 4000mg/24h in adults). Caution in liver impairment and chronic alcohol use.',
    side_effects: 'Rare when used appropriately; severe allergic reaction or liver toxicity in overdose.',
    interaction_warnings: 'Avoid combining with other paracetamol-containing combination products to prevent accidental overdose.',
    source: 'MedlinePlus Drug Information (https://medlineplus.gov/druginfo/meds/a681004.html)'
  },
  ibuprofen: {
    name: 'Ibuprofen',
    general_use: 'Nonsteroidal anti-inflammatory drug (NSAID) used for pain relief, inflammation reduction, and fever reduction.',
    cautions: 'Take with or after food. Use with caution in individuals with stomach ulcers, asthma, kidney disorders, or cardiovascular risk.',
    side_effects: 'Stomach upset, heartburn, nausea, dizziness. Long-term use requires medical monitoring.',
    interaction_warnings: 'Interacts with other NSAIDs, blood thinners (anticoagulants), aspirin, and certain blood pressure medications.',
    source: 'MedlinePlus Drug Information (https://medlineplus.gov/druginfo/meds/a682159.html)'
  },
  cetirizine: {
    name: 'Cetirizine',
    general_use: 'Second-generation antihistamine used to relieve allergy symptoms such as watery eyes, runny nose, sneezing, and hives.',
    cautions: 'May cause drowsiness in some individuals. Caution when driving or operating machinery. Caution in severe renal impairment.',
    side_effects: 'Drowsiness, dry mouth, headache, fatigue.',
    interaction_warnings: 'Alcohol and central nervous system depressants may increase sedative effects.',
    source: 'MedlinePlus Drug Information (https://medlineplus.gov/druginfo/meds/a698026.html)'
  },
  ors: {
    name: 'Oral Rehydration Salts (ORS)',
    general_use: 'Standard electrolyte balance formula recommended by WHO for hydration and electrolyte replacement in diarrhea and vomiting.',
    cautions: 'Dissolve in clean potable water strictly in the correct specified proportion (usually 1 packet per 1 liter). Do not boil after reconstitution.',
    side_effects: 'Generally safe and well tolerated when prepared accurately.',
    interaction_warnings: 'No significant drug interactions; essential supportive rehydration therapy.',
    source: 'WHO Oral Rehydration Salts Fact Sheet (https://www.who.int/news-room/fact-sheets/detail/diarrhoeal-disease)'
  }
};

// Red-flag emergency phrases
const RED_FLAG_PHRASES = [
  'chest pain',
  'chest pressure',
  'loss of consciousness',
  'unconscious',
  'fainting',
  'severe breathing difficulty',
  'difficulty breathing',
  'shortness of breath',
  'sudden paralysis',
  'face drooping',
  'slurred speech',
  'uncontrolled bleeding',
  'anaphylaxis',
  'severe allergic reaction',
  'coughing blood',
  'vomiting blood',
  'seizure',
  'sudden loss of vision',
  'worst headache of my life',
  'severe burn'
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
      error: 'Rate limit exceeded. Please wait a moment before submitting another symptom assessment.'
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
      medicineQuery = ''
    } = req.body || {};

    // 1. Medicine Information Query Mode
    if (medicineQuery && typeof medicineQuery === 'string') {
      const qLower = sanitize(medicineQuery).toLowerCase();
      const matchedKey = Object.keys(VERIFIED_MEDICINE_DATABASE).find(k => qLower.includes(k));
      
      let medInfo = matchedKey ? VERIFIED_MEDICINE_DATABASE[matchedKey] : null;

      if (!medInfo) {
        medInfo = {
          name: sanitize(medicineQuery),
          general_use: 'General medication information depends on clinical evaluation and prescription.',
          cautions: 'Always consult a certified medical practitioner or pharmacist before taking any medication. Do not self-medicate.',
          side_effects: 'Individual side effects vary by patient history and drug formulation.',
          interaction_warnings: 'Medication interactions depend on other active medications and existing health conditions.',
          source: 'MedlinePlus Drug Information (https://medlineplus.gov/druginformation.html)'
        };
      }

      return res.status(200).json({
        medicine_information: [medInfo],
        disclaimer: 'Medication choice depends on your symptoms, medical history, allergies, current medicines, age, and other clinical factors. Please consult a qualified healthcare professional.'
      });
    }

    // 2. Validate Symptom Inputs
    const sanitizedSymptoms = Array.isArray(symptoms) ? symptoms.map((s: string) => sanitize(String(s))).filter(Boolean) : [];
    const sanitizedFreeText = sanitize(String(freeText));
    const combinedSymptomText = (sanitizedSymptoms.join(' ') + ' ' + sanitizedFreeText).toLowerCase();

    if (sanitizedSymptoms.length === 0 && !sanitizedFreeText) {
      return res.status(400).json({
        error: 'Please provide at least one symptom or describe your symptoms.'
      });
    }

    const clampedSeverity = Math.min(Math.max(Number(severity) || 1, 1), 10);
    const clampedDuration = Math.min(Math.max(Number(durationDays) || 1, 1), 365);

    // 3. Safety Layer: Red-Flag Emergency Triage Check
    const hasRedFlag = RED_FLAG_PHRASES.some(phrase => combinedSymptomText.includes(phrase)) || clampedSeverity >= 9;

    if (hasRedFlag) {
      return res.status(200).json({
        summary: 'Potentially life-threatening red-flag symptoms detected requiring immediate emergency intervention.',
        possible_conditions: [
          {
            name: 'Acute Medical Emergency (Requires Immediate Clinical Evaluation)',
            likelihood: 'High',
            explanation: 'The reported symptoms include high-risk red-flag indicators that require immediate hospital trauma/casualty evaluation.'
          }
        ],
        urgency: 'EMERGENCY',
        recommended_action: 'This may require urgent medical attention. Dial 108, contact Campus Security/First Aid, or proceed to the nearest emergency trauma center immediately.',
        recommended_specialty: 'Emergency Medicine / Casualty (HIMS Hassan)',
        red_flags: [
          'Acute severe pain, sudden paralysis, respiratory distress, or loss of consciousness',
          'Do not drive or transport alone; call for immediate assistance',
          'Emergency contact: HIMS Hassan (+91 8172 231500) or National Emergency (112 / 108)'
        ],
        self_care: [
          'Stay calm and sit or lie in a comfortable, safe position.',
          'Loosen any tight clothing around the neck or chest.',
          'Do not ingest food, drinks, or self-prescribed medications until evaluated by clinicians.'
        ],
        emergency: true,
        sources: AUTHORITATIVE_SOURCES_MAP.emergency,
        disclaimer: 'This tool provides general health guidance and does not replace diagnosis, treatment, or emergency care from a qualified healthcare professional.',
        provider: 'clinical-safety-guardrail',
        isRealAI: false
      });
    }

    // 4. Secure Gemini API Call (Server-side Secret)
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';

    if (apiKey && apiKey.length > 10) {
      try {
        const systemPrompt = `You are a clinical decision-support and educational health guidance assistant for CampusCare at Malnad College of Engineering (MCE), Hassan, Karnataka.
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
- Demographics: ${sanitize(ageGroup)}
- Medical History / Conditions: ${medicalConditions.map((c: string) => sanitize(c)).join(', ') || 'None reported'}
- Current Medications: ${sanitize(currentMedications) || 'None reported'}
- Allergies: ${sanitize(allergies) || 'None reported'}
- Pregnancy status: ${sanitize(pregnancyStatus)}

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
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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

            // Validations & Defaults
            const urgency: 'LOW' | 'MODERATE' | 'URGENT' | 'EMERGENCY' = ['LOW', 'MODERATE', 'URGENT', 'EMERGENCY'].includes(parsed.urgency)
              ? parsed.urgency
              : clampedSeverity >= 7 ? 'URGENT' : clampedSeverity >= 4 ? 'MODERATE' : 'LOW';

            // Select matching authoritative sources
            const matchedSources = [
              ...AUTHORITATIVE_SOURCES_MAP.general,
              ...(combinedSymptomText.includes('cough') || combinedSymptomText.includes('cold') || combinedSymptomText.includes('throat') ? AUTHORITATIVE_SOURCES_MAP.respiratory : []),
              ...(combinedSymptomText.includes('fever') ? AUTHORITATIVE_SOURCES_MAP.fever : []),
              ...(combinedSymptomText.includes('skin') || combinedSymptomText.includes('rash') ? AUTHORITATIVE_SOURCES_MAP.skin : []),
              ...(combinedSymptomText.includes('headache') ? AUTHORITATIVE_SOURCES_MAP.headache : []),
              ...(combinedSymptomText.includes('stomach') || combinedSymptomText.includes('nausea') ? AUTHORITATIVE_SOURCES_MAP.gastrointestinal : []),
              ...(combinedSymptomText.includes('joint') || combinedSymptomText.includes('pain') ? AUTHORITATIVE_SOURCES_MAP.musculoskeletal : [])
            ].slice(0, 3);

            return res.status(200).json({
              summary: sanitize(parsed.summary || 'Symptom analysis completed.'),
              possible_conditions: Array.isArray(parsed.possible_conditions)
                ? parsed.possible_conditions.slice(0, 4).map((c: any) => ({
                    name: sanitize(c.name || 'Observation'),
                    likelihood: ['Low', 'Possible', 'Moderate', 'High'].includes(c.likelihood) ? c.likelihood : 'Possible',
                    explanation: sanitize(c.explanation || '')
                  }))
                : [],
              urgency,
              recommended_action: sanitize(parsed.recommended_action || 'Consult with a qualified healthcare professional.'),
              recommended_specialty: sanitize(parsed.recommended_specialty || 'General Medicine'),
              red_flags: Array.isArray(parsed.red_flags) ? parsed.red_flags.map((r: any) => sanitize(String(r))) : [],
              self_care: Array.isArray(parsed.self_care) ? parsed.self_care.map((s: any) => sanitize(String(s))) : [],
              medicine_information: null,
              emergency: urgency === 'EMERGENCY',
              sources: matchedSources,
              disclaimer: 'This tool provides general health guidance and does not replace diagnosis, treatment, or emergency care from a qualified healthcare professional.',
              provider: 'gemini-1.5-flash',
              isRealAI: true
            });
          }
        }
      } catch (geminiError) {
        console.warn('Gemini API call failed, invoking deterministic clinical rule engine:', geminiError);
      }
    }

    // 5. Fallback Deterministic Clinical Rule Engine
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

    return res.status(200).json({
      summary: 'Evaluated ' + sanitizedSymptoms.length + ' reported symptoms with duration of ~' + clampedDuration + ' day(s).',
      possible_conditions: [
        {
          name: specialty + ' Consultation Evaluation',
          likelihood: 'Possible',
          explanation: 'Reported symptoms correspond to common outpatient clinical presentations suitable for physician evaluation.'
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
      sources: AUTHORITATIVE_SOURCES_MAP.general,
      disclaimer: 'This tool provides general health guidance and does not replace diagnosis, treatment, or emergency care from a qualified healthcare professional.',
      provider: 'clinical-decision-engine',
      isRealAI: false
    });

  } catch (err: any) {
    console.error('Server AI guidance error:', err);
    return res.status(500).json({
      error: 'Unable to complete health guidance assessment. Please try again or visit Campus Health Centre directly.'
    });
  }
}
