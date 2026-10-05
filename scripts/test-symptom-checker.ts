import symptomCheckerHandler from '../api/symptom-checker';
import { aiService } from '../src/services/aiService';

// Mock Vercel request & response helper
function createMockReqRes(body: any, method: string = 'POST') {
  let statusCode = 200;
  let responseData: any = null;
  const headers: Record<string, string> = {};

  const req: any = {
    method,
    body,
    query: {},
    headers: {}
  };

  const res: any = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(data: any) {
      responseData = data;
      return res;
    },
    setHeader(key: string, value: string) {
      headers[key] = value;
      return res;
    },
    end() {
      return res;
    }
  };

  return {
    req,
    res,
    getStatusCode: () => statusCode,
    getResponseData: () => responseData
  };
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING AI SYMPTOM CHECKER COMPREHENSIVE TESTS');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: any) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName}`, details || '');
      process.exitCode = 1;
    }
  }

  // -------------------------------------------------------------------------
  // TEST 1: Missing / Empty Symptoms Validation (HTTP 400)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 1: Missing/Empty Symptoms Validation ---');
  {
    const { req, res, getStatusCode, getResponseData } = createMockReqRes({
      symptoms: [],
      freeText: ''
    });

    await symptomCheckerHandler(req, res);
    const code = getStatusCode();
    const data = getResponseData();

    assert(code === 400, 'Empty symptoms returns HTTP 400', { code });
    assert(Boolean(data?.error), 'Returns appropriate validation error message', data);
  }

  // -------------------------------------------------------------------------
  // TEST 2: Deterministic Emergency / Red-Flag Case (Acute Chest Pain)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: Emergency / Red-Flag Case (Chest Pain) ---');
  {
    const { req, res, getStatusCode, getResponseData } = createMockReqRes({
      symptoms: ['Chest pain', 'Pressure in chest radiating to left arm'],
      severity: 8,
      durationDays: 1
    });

    await symptomCheckerHandler(req, res);
    const code = getStatusCode();
    const data = getResponseData();

    assert(code === 200, 'Emergency case returns HTTP 200', { code });
    assert(data?.urgency === 'EMERGENCY' || data?.riskLevel === 'High', 'Urgency marked as EMERGENCY / High Risk', data?.urgency);
    assert(data?.emergency === true, 'emergency flag is true', data?.emergency);
    assert(data?.doctorConsultationRecommended === true, 'doctorConsultationRecommended is true');
    assert(data?.isRealAI === false, 'Deterministic emergency engine took priority over AI', data?.isRealAI);
    assert(data?.recommendation?.includes('MCE First Aid') || data?.recommended_action?.includes('MCE First Aid'), 'Includes MCE First Aid contact guidance');
  }

  // -------------------------------------------------------------------------
  // TEST 3: Deterministic Emergency (High Severity 10/10)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Extreme Severity Emergency (10/10 pain) ---');
  {
    const { req, res, getStatusCode, getResponseData } = createMockReqRes({
      symptoms: ['Severe unendurable abdominal pain'],
      severity: 10,
      durationDays: 1
    });

    await symptomCheckerHandler(req, res);
    const data = getResponseData();

    assert(data?.urgency === 'EMERGENCY' || data?.riskLevel === 'High', 'Extreme severity (10/10) immediately triggers emergency evaluation');
    assert(data?.emergency === true, 'emergency is true');
  }

  // -------------------------------------------------------------------------
  // TEST 4: Negated Emergency Clause Awareness
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: Negated Red-Flag Clause Awareness ---');
  {
    const { req, res, getStatusCode, getResponseData } = createMockReqRes({
      symptoms: ['Mild headache and studying fatigue, but NO chest pain and without shortness of breath'],
      severity: 3,
      durationDays: 2
    });

    await symptomCheckerHandler(req, res);
    const data = getResponseData();

    // Because chest pain is negated, it should NOT trigger emergency!
    assert(data?.urgency !== 'EMERGENCY' && data?.emergency !== true, 'Negated "no chest pain" does NOT falsely trigger red-flag emergency');
  }

  // -------------------------------------------------------------------------
  // TEST 5: Normal Symptom Case & Multi-Symptom Case (Mocking Gemini API)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5: Normal & Multi-Symptom Case with Mock Gemini API ---');
  {
    // Temporarily set GEMINI_API_KEY and mock fetch
    process.env.GEMINI_API_KEY = 'AIzaSyTestMockGeminiApiKeyForTesting12345';

    const originalFetch = global.fetch;
    const mockGeminiReply = {
      summary: 'Reported mild headache and screen eye strain consistent with study fatigue.',
      possibleConditions: ['Tension-Type Headache', 'Digital Eye Strain', 'Dehydration'],
      riskLevel: 'Low',
      recommendation: 'Take frequent screen breaks, ensure adequate hydration, and consult Campus Health Centre if symptoms persist.',
      doctorConsultationRecommended: false,
      selfCare: [
        'Follow 20-20-20 rule for screen fatigue',
        'Drink at least 2 liters of water daily',
        'Rest in a dimly lit room'
      ],
      disclaimer: 'This AI-generated information is for preliminary guidance only and is not a medical diagnosis.'
    };

    global.fetch = async (url: any, init?: any) => {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify(mockGeminiReply) }]
              }
            }
          ]
        })
      } as any;
    };

    try {
      const { req, res, getStatusCode, getResponseData } = createMockReqRes({
        symptoms: ['headache', 'screen fatigue'],
        severity: 3,
        durationDays: 1
      });

      await symptomCheckerHandler(req, res);
      const code = getStatusCode();
      const data = getResponseData();

      assert(code === 200, 'AI symptom evaluation returns HTTP 200', { code });
      assert(data?.summary?.includes('headache'), 'Returns summary of symptoms', data?.summary);
      assert(Array.isArray(data?.possibleConditions) && data.possibleConditions.length >= 2, 'Returns possible conditions array', data?.possibleConditions);
      assert(data?.riskLevel === 'Low', 'Risk level is correctly identified as Low', data?.riskLevel);
      assert(Boolean(data?.recommendation), 'Includes recommended next step', data?.recommendation);
      assert(Array.isArray(data?.selfCare) && data.selfCare.length > 0, 'Includes selfCare guidance', data?.selfCare);
      assert(data?.disclaimer === 'This AI-generated information is for preliminary guidance only and is not a medical diagnosis.', 'Includes required exact disclaimer', data?.disclaimer);
      assert(data?.isRealAI === true, 'Response is marked as real AI response');
    } finally {
      global.fetch = originalFetch;
      delete process.env.GEMINI_API_KEY;
    }
  }

  // -------------------------------------------------------------------------
  // TEST 6: Gemini API Failure / Missing Key & Client Safe Fallback
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 6: Gemini Failure & UI Safe Fallback ---');
  {
    delete process.env.GEMINI_API_KEY;

    const { req, res, getStatusCode, getResponseData } = createMockReqRes({
      symptoms: ['headache', 'mild fever'],
      severity: 4,
      durationDays: 2
    });

    await symptomCheckerHandler(req, res);
    const code = getStatusCode();
    const data = getResponseData();

    assert(code === 503, 'Missing Gemini key safely returns HTTP 503 without fake AI', { code });
    assert(Boolean(data?.error), 'Returns informative error about backend AI service state', data);

    // Verify frontend aiService fallback handler
    const originalFetch = global.fetch;
    global.fetch = async () => {
      return {
        ok: false,
        status: 503,
        json: async () => ({ error: 'AI Health Guidance is currently unavailable.' })
      } as any;
    };

    try {
      const fallbackResult = await aiService.analyzeSymptoms({
        symptoms: ['headache'],
        severity: 4,
        durationDays: 2,
        ageGroup: 'college_student'
      });

      assert(fallbackResult !== null, 'aiService provides safe clinical fallback when API is unavailable');
      assert(fallbackResult.isRealAI === false, 'Fallback is truthfully marked as non-AI deterministic safety engine');
      assert(fallbackResult.disclaimer === 'This AI-generated information is for preliminary guidance only and is not a medical diagnosis.', 'Fallback includes required medical disclaimer');
      assert(fallbackResult.doctorConsultationRecommended === true, 'Fallback safely recommends doctor consultation');
      assert(Array.isArray(fallbackResult.selfCare) && fallbackResult.selfCare.length > 0, 'Fallback provides general self-care guidance');
    } finally {
      global.fetch = originalFetch;
    }
  }

  console.log('\n====================================================');
  console.log(`🏁 TEST RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('====================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner fatal exception:', err);
  process.exit(1);
});
