import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  PhoneCall,
  RotateCcw,
  CheckCircle2,
  Calendar,
  ExternalLink,
  BookOpen,
  Pill,
  HeartPulse,
  Search,
  ArrowRight,
  Stethoscope,
  ShieldAlert,
  HelpCircle,
  Clock,
  MapPin,
  Loader2,
  ShieldCheck,
  Info,
  ChevronRight,
  X,
  Minus,
  AlertTriangle,
  UserCheck,
  Send,
  Sliders,
  Check
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SymptomGuidanceRequest, SymptomGuidanceResponse, MedicineInfo, Doctor } from '../../types';
import { useEmergency } from '../../context/EmergencyContext';
import { aiService } from '../../services/aiService';
import { doctorService } from '../../services/doctorService';
import { CampusCareMedicine, CAMPUSCARE_MEDICINES } from '../../data/medicines';
import { medicineService, MedicineSearchResult } from '../../services/medicineService';

// Helper to determine if a matched medical emergency phrase was negated (e.g. "no sudden explosive", "without shortness of breath")
function isNegatedPhrase(fullText: string, matchIndex: number): boolean {
  const preceding = fullText.slice(Math.max(0, matchIndex - 40), matchIndex).toLowerCase();
  return /\b(no|not|without|denies|denied|none of|none|negative for|neither|never)\b\s*[^.!,;]*$/i.test(preceding);
}

// Deterministic realtime emergency red-flag patterns
const RED_FLAG_PATTERNS = [
  {
    pattern: /chest pain|pressure in chest|tightness in chest|pain radiating to (left arm|jaw|back)/i,
    reason: 'Acute chest discomfort can indicate a cardiac emergency.'
  },
  {
    pattern: /severe breathing difficulty|struggling to breathe|cannot catch breath|wheezing with distress|severe respiratory distress/i,
    reason: 'Acute breathing difficulty or respiratory distress requires immediate medical attention.'
  },
  {
    pattern: /thunderclap(\s+headache)?|worst headache of (my |the )?life|sudden explosive (onset|headache|severe headache)|explosive severe headache/i,
    reason: 'Sudden explosive or thunderclap headache requires urgent neurological evaluation.'
  },
  {
    pattern: /weakness in.*(arm|leg|face|side)|slurred speech|facial droop|difficulty speaking/i,
    reason: 'Limb weakness or acute speech changes are potential stroke warning signs.'
  },
  {
    pattern: /passed out|loss of consciousness|fainted|unconscious/i,
    reason: 'Loss of consciousness is a critical red-flag medical emergency.'
  },
  {
    pattern: /throat swelling|swollen lips|difficulty swallowing|anaphylaxis|severe allergic reaction/i,
    reason: 'Throat or facial swelling indicates potential life-threatening anaphylaxis.'
  },
  {
    pattern: /coughing blood|vomiting blood|heavy bleeding|uncontrolled bleeding/i,
    reason: 'Active hemorrhage requires immediate casualty emergency care.'
  },
  {
    pattern: /active seizure|convulsions/i,
    reason: 'Active seizure requires emergency medical care.'
  }
];

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  timestamp: string;
  text?: string;
  quickChoices?: { label: string; value: string }[];
  isEmergency?: boolean;
  emergencyReason?: string;
  isTriageResult?: boolean;
  triageData?: SymptomGuidanceResponse;
  isMedicineResult?: boolean;
  medicineData?: MedicineInfo[];
}

export type ConversationStage =
  | 'welcome'
  | 'awaiting_symptom'
  | 'asking_duration'
  | 'asking_severity'
  | 'asking_domain_q1'
  | 'asking_domain_q2'
  | 'analyzing'
  | 'completed';

export interface SymptomTriageProps {
  isCompact?: boolean;
  onClose?: () => void;
  onMinimize?: () => void;
}

export const SymptomTriage: React.FC<SymptomTriageProps> = ({
  isCompact = false,
  onClose,
  onMinimize
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setIsEmergencyModalOpen } = useEmergency();

  // Mode: Conversational Triage vs Medicine Lookup
  const [activeMode, setActiveMode] = useState<'chat' | 'medicine'>('chat');

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [stage, setStage] = useState<ConversationStage>('welcome');

  // Collected Triage Context
  const [symptomSummary, setSymptomSummary] = useState('');
  const [detectedDomain, setDetectedDomain] = useState<string>('general');
  const [durationDays, setDurationDays] = useState<number>(1);
  const [severityScore, setSeverityScore] = useState<number>(4);
  const [followUpAnswers, setFollowUpAnswers] = useState<Record<string, string>>({});
  const [isEmergencyDetected, setIsEmergencyDetected] = useState(false);
  const [emergencyReasonText, setEmergencyReasonText] = useState('');
  const [completedResult, setCompletedResult] = useState<SymptomGuidanceResponse | null>(null);

  // Doctor Directory state for matched specialty cards
  const [verifiedDoctors, setVerifiedDoctors] = useState<Doctor[]>([]);

  // Medicine Search State (Source: campuscare_medicines.json)
  const [medSearchQuery, setMedSearchQuery] = useState('');
  const [medSearchResult, setMedSearchResult] = useState<MedicineSearchResult | null>(null);
  const [isMedLoading, setIsMedLoading] = useState(false);
  const [medError, setMedError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Load verified doctors on mount
  useEffect(() => {
    doctorService.getDoctors().then(docs => setVerifiedDoctors(docs)).catch(() => {});
  }, []);

  // Initialize Welcome Message
  const initWelcome = () => {
    const welcomeMsg: ChatMessage = {
      id: 'msg-welcome-' + Date.now(),
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: "Hello, I am CampusCare AI, your smart health guidance assistant for Malnad College of Engineering (MCE Hassan).\n\nDescribe what you are experiencing and I'll ask a few targeted questions to evaluate urgency and guide your next clinical step.\n\n*Educational guidance only — not a diagnosis.*",
      quickChoices: [
        { label: '🤕 Headache', value: 'I have a headache' },
        { label: '🤒 Fever', value: 'I have a fever' },
        { label: '😮‍💨 Cough', value: 'I have a cough' },
        { label: '🤢 Stomach Pain', value: 'I have stomach pain' },
        { label: '🦴 Back Pain', value: 'I have back pain' },
        { label: '🔴 Skin Problem', value: 'I have a skin problem or rash' }
      ]
    };
    setMessages([welcomeMsg]);
    setStage('welcome');
    setSymptomSummary('');
    setFollowUpAnswers({});
    setSeverityScore(4);
    setDurationDays(1);
    setIsEmergencyDetected(false);
    setEmergencyReasonText('');
    setCompletedResult(null);
  };

  useEffect(() => {
    initWelcome();
  }, []);

  // Listen to URL query params (e.g. ?symptom=headache)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const initialSymptom = params.get('symptom');
    if (initialSymptom && initialSymptom.trim() && messages.length <= 1) {
      handleUserResponse(initialSymptom.trim());
    }
  }, [location.search]);

  // Detect domain based on user text
  const getDomainFromText = (text: string): string => {
    const lower = text.toLowerCase();
    if (lower.includes('headache') || lower.includes('migraine') || lower.includes('head')) return 'headache';
    if (lower.includes('fever') || lower.includes('cough') || lower.includes('cold') || lower.includes('throat') || lower.includes('breath') || lower.includes('wheez')) return 'fever_respiratory';
    if (lower.includes('stomach') || lower.includes('abdomen') || lower.includes('belly') || lower.includes('diarrhea') || lower.includes('vomit') || lower.includes('nausea') || lower.includes('gas') || lower.includes('acidity')) return 'stomach_gi';
    if (lower.includes('skin') || lower.includes('itch') || lower.includes('rash') || lower.includes('hive') || lower.includes('allergy')) return 'skin_rash';
    if (lower.includes('back') || lower.includes('spine') || lower.includes('neck') || lower.includes('muscle') || lower.includes('joint') || lower.includes('knee')) return 'back_musculoskeletal';
    return 'general';
  };

  // Check emergency red-flag patterns with negation safety
  const checkRedFlags = (text: string): { isEmergency: boolean; reason?: string } => {
    if (!text) return { isEmergency: false };
    for (const rf of RED_FLAG_PATTERNS) {
      const regex = new RegExp(rf.pattern.source, 'gi');
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        if (!isNegatedPhrase(text, match.index)) {
          return { isEmergency: true, reason: rf.reason };
        }
      }
    }
    return { isEmergency: false };
  };

  // Append user message
  const addUserMessage = (text: string) => {
    const userMsg: ChatMessage = {
      id: 'msg-u-' + Date.now(),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    return userMsg;
  };

  // Append bot message with typing simulation
  const addBotMessage = (msg: Omit<ChatMessage, 'id' | 'sender' | 'timestamp'>, delayMs: number = 350) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const botMsg: ChatMessage = {
        id: 'msg-b-' + Date.now(),
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ...msg
      };
      setMessages(prev => [...prev, botMsg]);
    }, delayMs);
  };

  // Step progression engine
  const handleUserResponse = async (text: string) => {
    if (!text.trim()) return;

    addUserMessage(text);
    setInputText('');

    // 1. Immediate Deterministic Emergency Red-Flag Check BEFORE AI
    const redFlagCheck = checkRedFlags(text + ' ' + symptomSummary);
    if (redFlagCheck.isEmergency) {
      setIsEmergencyDetected(true);
      setEmergencyReasonText(redFlagCheck.reason || 'Critical symptom requiring urgent clinical attention');
      addBotMessage({
        text: "🚨 Immediate Medical Attention May Be Needed\n\nYour reported symptoms indicate high-acuity indicators that warrant immediate clinical attention. Please do not wait for online evaluation or attempt self-care.",
        isEmergency: true,
        emergencyReason: redFlagCheck.reason
      });
      setStage('completed');
      return;
    }

    // 2. State Machine Routing
    if (stage === 'welcome' || stage === 'awaiting_symptom') {
      const domain = getDomainFromText(text);
      setDetectedDomain(domain);
      setSymptomSummary(text);

      addBotMessage({
        text: "Thank you for sharing. Let me ask a few quick questions to better understand the severity and duration of your symptoms.\n\nHow long have you had these symptoms?",
        quickChoices: [
          { label: '⏱️ Less than 6 hours', value: 'Less than 6 hours' },
          { label: '⏳ 6–24 hours', value: '6–24 hours' },
          { label: '📅 1–3 days', value: '1–3 days' },
          { label: '🗓️ More than 3 days', value: 'More than 3 days' }
        ]
      });
      setStage('asking_duration');
    } else if (stage === 'asking_duration') {
      let days = 1;
      if (text.includes('Less than 6')) days = 1;
      else if (text.includes('6–24') || text.includes('24 hours')) days = 1;
      else if (text.includes('1–3')) days = 2;
      else if (text.includes('More than 3')) days = 4;
      setDurationDays(days);
      setFollowUpAnswers(prev => ({ ...prev, duration: text }));

      addBotMessage({
        text: "How severe is the discomfort right now?",
        quickChoices: [
          { label: '🟢 Mild (1–3) — Manageable', value: 'Mild (Severity 2/10)' },
          { label: '🟡 Moderate (4–6) — Interfering with study', value: 'Moderate (Severity 5/10)' },
          { label: '🔴 Severe (7–10) — Intense discomfort', value: 'Severe (Severity 8/10)' }
        ]
      });
      setStage('asking_severity');
    } else if (stage === 'asking_severity') {
      let score = 4;
      if (text.includes('Mild')) score = 2;
      else if (text.includes('Moderate')) score = 5;
      else if (text.includes('Severe')) score = 8;
      setSeverityScore(score);
      setFollowUpAnswers(prev => ({ ...prev, severity: text }));

      // Ask Domain Question 1 (Associated Symptoms)
      if (detectedDomain === 'headache') {
        addBotMessage({
          text: "Where is the headache pain located, and does light or noise make it worse?",
          quickChoices: [
            { label: 'Forehead / Both temples', value: 'Forehead and temples, band-like tension' },
            { label: 'One side throbbing / Light sensitive', value: 'One-sided throbbing with light and noise sensitivity' },
            { label: 'Back of head / Neck strain', value: 'Back of head and neck strain' },
            { label: 'Sinus / Facial congestion', value: 'Facial and sinus pressure around nose and eyes' }
          ]
        });
      } else if (detectedDomain === 'fever_respiratory') {
        addBotMessage({
          text: "Are you having a cough, sore throat, or nasal congestion?",
          quickChoices: [
            { label: 'Dry cough & scratchy throat', value: 'Dry cough and sore scratchy throat' },
            { label: 'Cough with phlegm / mucus', value: 'Productive cough with mucus and cold' },
            { label: 'Fever with chills & body ache', value: 'Fever with body chills and fatigue' },
            { label: 'Congestion & runny nose only', value: 'Nasal congestion and mild sneezing' }
          ]
        });
      } else if (detectedDomain === 'stomach_gi') {
        addBotMessage({
          text: "Where is the stomach pain located, and is it related to food intake?",
          quickChoices: [
            { label: 'Upper abdomen / Burning after food', value: 'Upper stomach burning sensation after meals' },
            { label: 'Lower abdomen / Cramping with diarrhea', value: 'Lower abdomen cramping and loose stools' },
            { label: 'Nausea & difficulty eating', value: 'Nausea and difficulty eating' },
            { label: 'Bloating & indigestion', value: 'Bloating and gas discomfort' }
          ]
        });
      } else if (detectedDomain === 'skin_rash') {
        addBotMessage({
          text: "What does the skin problem look like, and is there itching?",
          quickChoices: [
            { label: 'Intense itching with red hives', value: 'Intense itching with raised red hives' },
            { label: 'Dry, scaly patches', value: 'Dry scaly irritated skin patches' },
            { label: 'Started after new cosmetic / plant', value: 'Contact reaction after new soap or product' },
            { label: 'Mild localized redness', value: 'Mild localized redness without severe itch' }
          ]
        });
      } else if (detectedDomain === 'back_musculoskeletal') {
        addBotMessage({
          text: "Did the back or muscle pain start after desk study, lifting, or movement?",
          quickChoices: [
            { label: 'Prolonged sitting / study desk posture', value: 'Prolonged sitting and study desk strain' },
            { label: 'Heavy lifting / athletic twist', value: 'Heavy lifting or sports exertion strain' },
            { label: 'Morning muscle stiffness', value: 'General muscle tightness and stiff back' },
            { label: 'Sudden sharp catch when bending', value: 'Sudden sharp catch when bending' }
          ]
        });
      } else {
        addBotMessage({
          text: "Are these symptoms continuous throughout the day or do they occur in waves?",
          quickChoices: [
            { label: 'Constant throughout the day', value: 'Constant continuous symptoms' },
            { label: 'Comes and goes in waves', value: 'Intermittent episodes' },
            { label: 'Worse in the morning', value: 'Worse in the morning upon waking' },
            { label: 'Worse late at night', value: 'Worse at night or after fatigue' }
          ]
        });
      }
      setStage('asking_domain_q1');
    } else if (stage === 'asking_domain_q1') {
      setFollowUpAnswers(prev => ({ ...prev, character: text }));

      // Ask Domain Question 2 (Safety Check / Red-Flag Screening)
      if (detectedDomain === 'headache') {
        addBotMessage({
          text: "Safety Check: Are you experiencing high fever with neck stiffness, vomiting, or sudden explosive onset?",
          quickChoices: [
            { label: '✅ None of these (gradual, mild)', value: 'Gradual onset, no neck stiffness, no high fever' },
            { label: 'Mild nausea only', value: 'Mild nausea without vomiting or stiff neck' },
            { label: 'Sudden explosive severe headache', value: 'Sudden explosive severe headache' },
            { label: 'Fever with stiff neck', value: 'Fever with neck stiffness' }
          ]
        });
      } else if (detectedDomain === 'fever_respiratory') {
        addBotMessage({
          text: "Safety Check: Are you able to breathe normally without wheezing or shortness of breath?",
          quickChoices: [
            { label: '✅ Breathing is normal', value: 'Breathing is normal and comfortable' },
            { label: 'Mild congestion only', value: 'Mild congestion, breathing okay' },
            { label: 'Wheezing with breathing distress', value: 'Wheezing with distress and severe breathing difficulty' }
          ]
        });
      } else if (detectedDomain === 'stomach_gi') {
        addBotMessage({
          text: "Safety Check: Are you able to retain fluids without frequent vomiting or blood in stool?",
          quickChoices: [
            { label: '✅ Yes, drinking fluids fine', value: 'Able to drink water and fluids normally, no blood' },
            { label: 'Mild nausea, drinking small sips', value: 'Mild nausea but retaining small sips' },
            { label: 'Cannot keep any fluids down', value: 'Unable to retain fluids, frequent vomiting' }
          ]
        });
      } else if (detectedDomain === 'skin_rash') {
        addBotMessage({
          text: "Safety Check: Any swelling around lips, eyes, tongue, or difficulty breathing?",
          quickChoices: [
            { label: '✅ No facial or throat swelling', value: 'No lip, tongue, or facial swelling, breathing normal' },
            { label: 'Mild itch around eyes', value: 'Mild itch around eye area, no breathing issues' },
            { label: 'Lip or throat swelling present', value: 'Swelling around lips and throat' }
          ]
        });
      } else if (detectedDomain === 'back_musculoskeletal') {
        addBotMessage({
          text: "Safety Check: Any shooting pain down legs, numbness in feet, or bladder changes?",
          quickChoices: [
            { label: '✅ No radiation or numbness', value: 'No radiation down legs, no numbness, normal bladder control' },
            { label: 'Mild pain near hip only', value: 'Mild pain near glute/hip, no numbness' },
            { label: 'Numbness or leg weakness', value: 'Numbness in legs and difficulty walking' }
          ]
        });
      } else {
        addBotMessage({
          text: "Safety Check: Have you noticed any severe dizziness, fainting, or chest discomfort?",
          quickChoices: [
            { label: '✅ No severe warning signs', value: 'No severe warning signs, vitals feel stable' },
            { label: 'Mild fatigue only', value: 'Mild fatigue without dizziness' },
            { label: 'Chest pain or fainting feeling', value: 'Chest pain or fainting feeling' }
          ]
        });
      }
      setStage('asking_domain_q2');
    } else if (stage === 'asking_domain_q2') {
      const updatedAnswers = { ...followUpAnswers, warningScreen: text };
      setFollowUpAnswers(updatedAnswers);

      // Check if user answer to warning question triggered an emergency
      const finalRedFlag = checkRedFlags(text);
      if (finalRedFlag.isEmergency) {
        setIsEmergencyDetected(true);
        setEmergencyReasonText(finalRedFlag.reason || 'Critical symptom requiring urgent clinical attention');
        addBotMessage({
          text: "🚨 Immediate Medical Attention May Be Needed\n\nYour response indicates acute symptoms that warrant immediate clinical attention.",
          isEmergency: true,
          emergencyReason: finalRedFlag.reason
        });
        setStage('completed');
        return;
      }

      // Execute Real AI Guidance Analysis
      setStage('analyzing');
      setIsTyping(true);

      try {
        const guidanceReq: SymptomGuidanceRequest = {
          symptoms: [symptomSummary],
          freeText: symptomSummary,
          severity: severityScore,
          durationDays: durationDays,
          ageGroup: 'college_student',
          followUpAnswers: updatedAnswers
        };

        const result = await aiService.analyzeSymptoms(guidanceReq);
        setCompletedResult(result);

        setIsTyping(false);
        addBotMessage({
          text: "Here is your evidence-grounded health guidance based on the clinical parameters you provided.\n\n*Note: This is educational guidance, not a medical diagnosis.*",
          isTriageResult: true,
          triageData: result
        }, 150);
        setStage('completed');
      } catch (err: any) {
        setIsTyping(false);
        addBotMessage({
          text: "AI guidance is temporarily unavailable. Based on clinical standard precautions, please visit the MCE Health Centre or consult a general physician if symptoms persist.",
          isTriageResult: false
        });
        setStage('completed');
      }
    }
  };

  // Medicine search handler using uploaded medicine dataset
  const executeMedicineSearch = (query: string) => {
    const cleanQ = query.trim();
    if (!cleanQ) return;
    setIsMedLoading(true);
    setMedError(null);
    try {
      const res = medicineService.searchMedicines(cleanQ);
      setMedSearchResult(res);
      if (!res.hasResults) {
        setMedError(res.message || 'No medicine information was found in the current CampusCare medicine dataset. Consult a doctor or pharmacist.');
      }
    } catch (err: any) {
      setMedError(err.message || 'Error searching medicine dataset.');
    } finally {
      setIsMedLoading(false);
    }
  };

  const handleMedicineSearch = (e: React.FormEvent) => {
    e.preventDefault();
    executeMedicineSearch(medSearchQuery);
  };

  // Matched doctors from directory
  const matchedDoctors = useMemo(() => {
    return verifiedDoctors.slice(0, 3);
  }, [verifiedDoctors]);

  // Assessment Progress step index (0 to 5)
  const getStepIndex = () => {
    switch (stage) {
      case 'welcome':
      case 'awaiting_symptom': return 0;
      case 'asking_duration': return 1;
      case 'asking_severity': return 2;
      case 'asking_domain_q1': return 3;
      case 'asking_domain_q2': return 4;
      case 'analyzing':
      case 'completed': return 5;
      default: return 0;
    }
  };

  const currentStepIdx = getStepIndex();

  const progressSteps = [
    { num: '01', title: 'Symptom' },
    { num: '02', title: 'Duration' },
    { num: '03', title: 'Severity' },
    { num: '04', title: 'Associated Symptoms' },
    { num: '05', title: 'Safety Check' },
    { num: '06', title: 'Guidance' }
  ];

  return (
    <div className={isCompact ? "w-full h-full flex flex-col bg-white dark:bg-slate-900 overflow-hidden" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6"}>
      {/* ========================================================================= */}
      {/* TOP HEADER: Clean institutional banner & Mode Switcher                    */}
      {/* ========================================================================= */}
      <div className={isCompact ? "p-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex-shrink-0" : "flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm"}>
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-[#1e3a8a] to-teal-500 text-white flex items-center justify-center shadow-md font-bold text-lg flex-shrink-0">
            🤖
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white leading-tight">
                CampusCare AI
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                AI-Assisted
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Evidence-Grounded Health Guidance • Malnad College of Engineering
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => setActiveMode('chat')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                activeMode === 'chat'
                  ? 'bg-white dark:bg-slate-900 text-[#1e3a8a] dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              💬 Health Guidance
            </button>
            <button
              onClick={() => setActiveMode('medicine')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                activeMode === 'medicine'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              💊 Medicine Info
            </button>
          </div>

          <button
            onClick={initWelcome}
            title="Start New Assessment"
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-colors border border-slate-200 dark:border-slate-700"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New Assessment</span>
          </button>

          {isCompact && onMinimize && (
            <button
              onClick={onMinimize}
              title="Minimize"
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Minus className="w-4 h-4" />
            </button>
          )}

          {isCompact && onClose && (
            <button
              onClick={onClose}
              title="Close"
              className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {activeMode === 'chat' ? (
        /* ========================================================================= */
        /* 3-PART SOPHISTICATED DESKTOP LAYOUT (Left Sidebar, Main Area, Right Panel) */
        /* ========================================================================= */
        <div className={isCompact ? "flex-1 flex flex-col min-h-0 overflow-hidden" : "grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"}>
          {/* ===================================================================== */}
          {/* 3.1 LEFT SIDEBAR: Health Assessment Progress (Desktop Only)            */}
          {/* ===================================================================== */}
          {!isCompact && (
            <div className="hidden lg:block lg:col-span-3 space-y-4">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-sm space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-[#1e3a8a] dark:text-blue-400">
                    Health Assessment
                  </h3>
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    Step {currentStepIdx + 1} of 6
                  </span>
                </div>

                {/* Progress Steps List */}
                <div className="space-y-2.5">
                  {progressSteps.map((step, idx) => {
                    const isDone = currentStepIdx > idx;
                    const isCurrent = currentStepIdx === idx;
                    return (
                      <div
                        key={step.num}
                        className={`flex items-center gap-3 p-2.5 rounded-2xl text-xs font-semibold transition-all ${
                          isCurrent
                            ? 'bg-[#1e3a8a]/10 dark:bg-blue-950 text-[#1e3a8a] dark:text-blue-300 font-bold border border-[#1e3a8a]/20'
                            : isDone
                            ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30'
                            : 'text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-xl flex items-center justify-center text-[10px] font-bold font-mono ${
                            isCurrent
                              ? 'bg-[#1e3a8a] text-white shadow-xs'
                              : isDone
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                          }`}
                        >
                          {isDone ? <Check className="w-3.5 h-3.5" /> : step.num}
                        </div>
                        <span className="flex-1 truncate">{step.title}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={initWelcome}
                    className="w-full py-2.5 px-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> New Assessment
                  </button>
                </div>
              </div>

              {/* Campus First Aid Quick Card */}
              <div className="bg-gradient-to-br from-rose-950 to-slate-900 rounded-3xl border border-rose-800/40 p-5 text-white shadow-sm space-y-2.5">
                <div className="flex items-center gap-1.5 text-rose-400 font-bold text-xs">
                  <ShieldAlert className="w-4 h-4 animate-pulse" /> Campus Emergency Response
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  If experiencing chest pain, severe shortness of breath, or loss of consciousness, do not wait for online evaluation.
                </p>
                <a
                  href="tel:9110885805"
                  className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors font-mono"
                >
                  <PhoneCall className="w-3.5 h-3.5" /> Call MCE First Aid: 9110885805
                </a>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* 3.2 MAIN AREA: AI Conversation & Clinical Guidance                     */}
          {/* ===================================================================== */}
          <div className={isCompact ? "flex-1 flex flex-col min-h-0 overflow-hidden" : "lg:col-span-6 space-y-4"}>
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col h-[700px] overflow-hidden">
              {/* Header inside Conversation Canvas */}
              <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                      🤖 CampusCare AI
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      Evidence-Grounded Health Guidance
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Educational guidance only — not a diagnosis.
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hidden sm:inline-block">
                  MCE Triage Active
                </span>
              </div>

              {/* Messages Stream */}
              <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 bg-slate-50/40 dark:bg-slate-950/40">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.sender === 'bot' && (
                      <div className="w-8 h-8 rounded-2xl bg-[#1e3a8a] text-white flex items-center justify-center flex-shrink-0 shadow-sm text-xs font-bold mt-0.5">
                        🤖
                      </div>
                    )}

                    <div
                      className={`max-w-[88%] sm:max-w-[80%] rounded-3xl p-4 shadow-sm text-xs sm:text-sm leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-[#1e3a8a] text-white rounded-tr-xs'
                          : 'bg-white dark:bg-slate-800/95 border border-slate-200/90 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-tl-xs'
                      }`}
                    >
                      {/* Message Text */}
                      {msg.text && (
                        <div className="whitespace-pre-line font-normal">
                          {msg.text}
                        </div>
                      )}

                      {/* 🚨 8. RED-FLAG SAFETY SECTION (High-Acuity Emergency Card) */}
                      {msg.isEmergency && (
                        <div className="mt-3.5 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/90 border-2 border-rose-600 text-rose-950 dark:text-rose-100 space-y-3">
                          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-black text-sm">
                            <ShieldAlert className="w-5 h-5 text-rose-600 animate-pulse flex-shrink-0" />
                            <span>Immediate Medical Attention May Be Needed</span>
                          </div>
                          {msg.emergencyReason && (
                            <p className="text-xs font-semibold text-rose-900 dark:text-rose-200">
                              {msg.emergencyReason}
                            </p>
                          )}
                          <p className="text-[11px] text-rose-800 dark:text-rose-300 leading-snug">
                            The reported symptoms indicate acute red flags. Please do NOT wait for online triage or attempt self-care. Contact campus first aid immediately.
                          </p>
                          <div className="flex flex-col sm:flex-row gap-2 pt-1">
                            <a
                              href="tel:9110885805"
                              className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all font-mono"
                            >
                              <PhoneCall className="w-3.5 h-3.5" /> Call MCE First Aid: 9110885805
                            </a>
                            <button
                              onClick={() => {
                                setIsEmergencyModalOpen(true);
                                navigate('/emergency');
                              }}
                              className="py-2.5 px-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                            >
                              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" /> Open SOS
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 💡 9 to 16. RICH GUIDANCE RESULT CARDS */}
                      {msg.isTriageResult && msg.triageData && (
                        <div className="mt-4 space-y-3.5 text-xs text-slate-800 dark:text-slate-200">
                          {/* 9. Urgency Result Card */}
                          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                                Urgency Assessment
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded-md text-xs font-black uppercase tracking-wide ${
                                  msg.triageData.urgency === 'LOW'
                                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                    : msg.triageData.urgency === 'MODERATE'
                                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                    : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                }`}
                              >
                                ● {msg.triageData.urgency}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              Based on the information you provided, this symptom profile reflects {msg.triageData.urgency.toLowerCase()} urgency.
                            </p>
                          </div>

                          {/* 10. Possible Causes to Discuss With a Doctor */}
                          <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 space-y-2">
                            <div className="flex items-center gap-1.5 font-bold text-[#1e3a8a] dark:text-blue-300 text-xs">
                              <HelpCircle className="w-4 h-4 text-primary-600" />
                              <span>Possible Causes to Discuss With a Doctor:</span>
                            </div>
                            <div className="space-y-1.5 pt-1">
                              {msg.triageData.possible_conditions?.map((cond, idx) => (
                                <div key={idx} className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-blue-100 dark:border-blue-950 space-y-1">
                                  <div className="flex items-center justify-between font-bold text-xs text-slate-900 dark:text-white">
                                    <span>{cond.name}</span>
                                    <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded">
                                      Possible Cause
                                    </span>
                                  </div>
                                  {cond.explanation && (
                                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                      {cond.explanation}
                                    </p>
                                  )}
                                  <p className="text-[10px] text-slate-400 italic">
                                    Discuss with a healthcare professional
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 11. Self-Care ("What You Can Do Now") */}
                          <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 space-y-1.5">
                            <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300 text-xs">
                              <CheckCircle2 className="w-4 h-4 text-amber-600" />
                              <span>What You Can Do Now (Self-Care Guidance):</span>
                            </div>
                            <p className="text-xs text-amber-950 dark:text-amber-200 leading-relaxed font-medium">
                              {msg.triageData.recommended_action}
                            </p>
                          </div>

                          {/* 12. Related Medicine Information (Source of truth: campuscare_medicines.json) */}
                          {(() => {
                            const relatedMeds = medicineService.getMedicinesForSymptom(
                              `${symptomSummary} ${followUpAnswers.character || ''}`
                            );

                            return (
                              <div className="p-4 sm:p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 space-y-3.5">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                                      <Pill className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                                        💊 Related Medicine Information
                                      </h4>
                                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                        {symptomSummary || 'Reported'} — Symptom
                                      </p>
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    Educational Info
                                  </span>
                                </div>

                                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                                  Medicine information related to this symptom from the verified CampusCare medicine dataset. Discuss with a pharmacist or healthcare professional.
                                </p>

                                {relatedMeds.length > 0 ? (
                                  <div className="space-y-3">
                                    {relatedMeds.map((med, mIdx) => (
                                      <div
                                        key={mIdx}
                                        className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700 space-y-2.5 shadow-xs"
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div>
                                            <h5 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white">
                                              {med.medicine_name}
                                            </h5>
                                            <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                              Category: {med.category}
                                            </div>
                                          </div>
                                          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded">
                                            {med.generic_name}
                                          </span>
                                        </div>

                                        <div className="text-xs text-slate-600 dark:text-slate-300">
                                          <span className="font-bold text-slate-700 dark:text-slate-200">Commonly related to: </span>
                                          <span className="capitalize">{med.related_symptoms.join(', ')}</span>
                                        </div>

                                        <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 space-y-1">
                                          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1">
                                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                            Safety Information
                                          </div>
                                          <ul className="list-disc list-inside text-xs text-amber-900 dark:text-amber-200 space-y-0.5">
                                            {med.safety_notes.map((note, nIdx) => (
                                              <li key={nIdx}>{note}</li>
                                            ))}
                                          </ul>
                                        </div>

                                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/60 text-[11px]">
                                          <span className="text-slate-500 dark:text-slate-400">
                                            Source: <strong className="text-slate-700 dark:text-slate-200">{med.source}</strong>
                                          </span>
                                          <a
                                            href={med.source_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:underline font-bold"
                                          >
                                            View Source <ExternalLink className="w-3 h-3" />
                                          </a>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                                    <p className="font-semibold text-slate-700 dark:text-slate-300">
                                      No medicine information was found in the current CampusCare medicine dataset for this symptom.
                                    </p>
                                    <p>
                                      Please consult a doctor or licensed pharmacist for personalized evaluation.
                                    </p>
                                  </div>
                                )}

                                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed border border-slate-200 dark:border-slate-700">
                                  ⚠️ <strong>Disclaimer:</strong> Medicine information is educational and does not replace advice from a doctor or pharmacist. CampusCare does not generate prescriptions or individualized dosage instructions.
                                </div>
                              </div>
                            );
                          })()}

                          {/* 13. Recommended Specialty */}
                          <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-xs space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-300">
                              <Stethoscope className="w-4 h-4 text-primary-600" />
                              <span>Recommended Specialty: {msg.triageData.recommended_specialty || 'General Medicine'}</span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                              Based on your symptoms, a {msg.triageData.recommended_specialty || 'General Medicine'} consultation may be appropriate.
                            </p>
                          </div>

                          {/* 14. Matched Campus Doctors */}
                          <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-amber-400 flex items-center gap-1.5">
                                <UserCheck className="w-4 h-4" /> Doctors You Can Consult
                              </span>
                              <Link to="/doctors" className="text-[11px] font-bold text-teal-300 hover:underline">
                                View All Doctors →
                              </Link>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                              {matchedDoctors.map(doc => (
                                <div key={doc.id} className="bg-slate-800/90 p-3 rounded-xl border border-slate-700 flex flex-col justify-between space-y-2">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-lg bg-[#1e3a8a] text-white font-extrabold text-xs flex items-center justify-center">
                                        {doc.initials || 'DR'}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <h4 className="font-bold text-xs text-white truncate">{doc.name}</h4>
                                        <p className="text-[10px] text-slate-300 truncate">{doc.specialization}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-slate-400">
                                      <ShieldCheck className="w-3 h-3 text-teal-400" />
                                      <span>{doc.verified_public_profile ? 'Verified Profile' : 'Campus Doctor'}</span>
                                    </div>
                                  </div>

                                  <div className="pt-2 border-t border-slate-700 flex items-center justify-between gap-2">
                                    <Link
                                      to={`/doctors/${doc.id}`}
                                      className="text-[11px] font-bold text-teal-300 hover:underline"
                                    >
                                      View Profile
                                    </Link>
                                    <Link
                                      to={`/appointments/book?doctor=${doc.id}`}
                                      className="py-1 px-2.5 rounded-lg bg-teal-500 hover:bg-teal-600 text-slate-950 font-extrabold text-[10px]"
                                    >
                                      Book
                                    </Link>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* 15. Trusted Medical Sources */}
                          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2">
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-primary-600" /> Learn More From Trusted Sources:
                            </span>
                            <div className="flex flex-wrap gap-2 pt-1">
                              <a
                                href="https://medlineplus.gov/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 hover:underline font-bold bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs"
                              >
                                MedlinePlus <ExternalLink className="w-3 h-3" />
                              </a>
                              <a
                                href="https://www.who.int/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-teal-600 dark:text-teal-400 hover:underline font-bold bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs"
                              >
                                World Health Organization (WHO) <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </div>

                          {/* 16. Final Result Summary Table */}
                          <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-300/80 dark:border-slate-700 text-xs space-y-2 font-mono">
                            <div className="font-extrabold text-[11px] uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                              ASSESSMENT SUMMARY
                            </div>
                            <div className="grid grid-cols-2 gap-1 text-[11px]">
                              <span className="text-slate-500">Symptom:</span>
                              <span className="font-bold text-slate-900 dark:text-white truncate">{symptomSummary}</span>

                              <span className="text-slate-500">Duration:</span>
                              <span className="font-bold text-slate-900 dark:text-white">{followUpAnswers.duration || `${durationDays} day(s)`}</span>

                              <span className="text-slate-500">Severity:</span>
                              <span className="font-bold text-slate-900 dark:text-white">{followUpAnswers.severity || `${severityScore}/10`}</span>

                              <span className="text-slate-500">Red Flags:</span>
                              <span className="font-bold text-emerald-600">None reported</span>

                              <span className="text-slate-500">Urgency:</span>
                              <span className="font-bold text-blue-600">{msg.triageData.urgency}</span>

                              <span className="text-slate-500">Recommended Specialty:</span>
                              <span className="font-bold text-slate-900 dark:text-white">{msg.triageData.recommended_specialty || 'General Medicine'}</span>
                            </div>
                          </div>

                          {/* 17. Action Bar */}
                          <div className="pt-2 flex flex-wrap gap-2">
                            <Link
                              to="/appointments/book"
                              className="flex-1 py-2.5 px-3.5 rounded-xl bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold text-xs text-center shadow-sm transition-all"
                            >
                              Book Doctor Consultation
                            </Link>
                            <Link
                              to="/doctors"
                              className="py-2.5 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs text-center border border-slate-200 dark:border-slate-700"
                            >
                              View Doctors
                            </Link>
                            <button
                              onClick={initWelcome}
                              className="py-2.5 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" /> New Assessment
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 6. Structured Question Cards for Follow-up Choices */}
                      {msg.quickChoices && msg.quickChoices.length > 0 && stage !== 'completed' && (
                        <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/60">
                          {msg.quickChoices.map((qc, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleUserResponse(qc.value)}
                              className="py-2 px-3 rounded-xl bg-blue-50 dark:bg-slate-700/80 hover:bg-blue-100 dark:hover:bg-slate-600 border border-blue-200 dark:border-slate-600 text-[#1e3a8a] dark:text-blue-200 font-semibold text-xs transition-all shadow-xs text-left"
                            >
                              {qc.label}
                            </button>
                          ))}
                        </div>
                      )}

                      <div
                        className={`text-[10px] mt-1.5 text-right font-mono ${
                          msg.sender === 'user' ? 'text-blue-200' : 'text-slate-400'
                        }`}
                      >
                        {msg.timestamp}
                      </div>
                    </div>
                  </div>
                ))}

                {/* 19. Loading State Indicator */}
                {isTyping && (
                  <div className="flex gap-3 justify-start items-center">
                    <div className="w-8 h-8 rounded-2xl bg-[#1e3a8a] text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                      🤖
                    </div>
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 px-4 shadow-sm flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                      <Loader2 className="w-4 h-4 animate-spin text-[#1e3a8a]" />
                      <span className="font-semibold">Analyzing your responses with clinical safety engine...</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleUserResponse(inputText);
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder="Describe your symptoms or answer the question above..."
                    disabled={isTyping}
                    className="flex-1 py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-[#1e3a8a] focus:bg-white dark:focus:bg-slate-900 transition-all text-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isTyping}
                    className="py-3 px-5 rounded-2xl bg-[#1e3a8a] hover:bg-blue-900 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <span>Send</span>
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
                <p className="text-[10px] text-center text-slate-400 mt-2">
                  AI guidance is educational and does not replace a medical diagnosis. For acute emergencies, call <strong>9110885805</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* 3.3 RIGHT PANEL: Assessment Overview (Desktop Only)                    */}
          {/* ===================================================================== */}
          {!isCompact && (
            <div className="hidden lg:block lg:col-span-3 space-y-4">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-sm space-y-4">
                <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-[#1e3a8a] dark:text-blue-400">
                    Assessment Overview
                  </h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>

                <div className="space-y-3 text-xs">
                  {/* Symptom */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Reported Symptom</div>
                    <div className="font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                      {symptomSummary || 'Not assessed yet'}
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Duration</div>
                    <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {followUpAnswers.duration || 'Not assessed yet'}
                    </div>
                  </div>

                  {/* Severity */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Severity Score</div>
                    <div className="font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                      {followUpAnswers.severity || 'Not assessed yet'}
                    </div>
                  </div>

                  {/* Red-Flag Status */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Red-Flag Status</div>
                    <div className="font-bold mt-0.5">
                      {isEmergencyDetected ? (
                        <span className="text-rose-600">🚨 Red Flag Detected</span>
                      ) : stage === 'completed' ? (
                        <span className="text-emerald-600">✓ None Reported</span>
                      ) : (
                        <span className="text-slate-400">Evaluating...</span>
                      )}
                    </div>
                  </div>

                  {/* Urgency */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Urgency Level</div>
                    <div className="font-bold mt-0.5">
                      {isEmergencyDetected ? (
                        <span className="text-rose-600 font-black">EMERGENCY</span>
                      ) : completedResult?.urgency ? (
                        <span className="text-primary-600">{completedResult.urgency}</span>
                      ) : (
                        <span className="text-slate-400">Not assessed yet</span>
                      )}
                    </div>
                  </div>

                  {/* Recommended Specialty */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Recommended Specialty</div>
                    <div className="font-bold text-slate-900 dark:text-white mt-0.5">
                      {completedResult?.recommended_specialty || (stage === 'completed' ? 'General Medicine' : 'Not assessed yet')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Verified Clinical Reference Information */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-4 shadow-sm space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-[11px]">
                  <ShieldCheck className="w-4 h-4 text-teal-500" />
                  <span>Clinical Evidence Standard</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  CampusCare AI correlates symptoms with authoritative medical knowledge from MedlinePlus (NIH) and WHO clinical triage standards.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* ========================================================================= */
        /* MEDICINE SEARCH TAB (campuscare_medicines.json Dataset)                   */
        /* ========================================================================= */
        <div className={isCompact ? "flex-1 overflow-y-auto p-4 space-y-4 bg-white dark:bg-slate-900" : "bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-6"}>
          <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                Educational Medicine & Symptom Information
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Source of Truth: CampusCare Medicine Dataset (campuscare_medicines.json). Educational only — not a prescription.
              </p>
            </div>
          </div>

          {/* Quick Search Chips */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Quick Lookups by Symptom or Drug Name:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Headache', type: 'symptom' },
                { label: 'Fever', type: 'symptom' },
                { label: 'Cough', type: 'symptom' },
                { label: 'Sneezing', type: 'symptom' },
                { label: 'Heartburn', type: 'symptom' },
                { label: 'Itching', type: 'symptom' },
                { label: 'Paracetamol', type: 'med' },
                { label: 'Ibuprofen', type: 'med' },
                { label: 'Cetirizine', type: 'med' },
                { label: 'Loratadine', type: 'med' },
                { label: 'Dextromethorphan', type: 'med' },
                { label: 'Calcium Carbonate', type: 'med' },
                { label: 'Famotidine', type: 'med' }
              ].map(chip => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => {
                    setMedSearchQuery(chip.label);
                    executeMedicineSearch(chip.label);
                  }}
                  className={`text-xs py-1 px-2.5 rounded-xl font-semibold transition-all border ${
                    chip.type === 'symptom'
                      ? 'bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                      : 'bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  }`}
                >
                  {chip.type === 'symptom' ? '🩺 ' : '💊 '}
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleMedicineSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={medSearchQuery}
                onChange={e => setMedSearchQuery(e.target.value)}
                placeholder="Search by medicine name, generic name, or symptom (e.g. Paracetamol, headache, cough)..."
                className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
              />
            </div>
            <button
              type="submit"
              disabled={!medSearchQuery.trim() || isMedLoading}
              className="py-3 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
            >
              {isMedLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Search Dataset</span>
            </button>
          </form>

          {medError && !medSearchResult?.hasResults && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>No Medicine Information Found</span>
              </div>
              <p>{medError}</p>
              <p className="text-[11px] text-rose-700 dark:text-rose-300">
                Please consult a doctor or licensed pharmacist.
              </p>
            </div>
          )}

          {medSearchResult && medSearchResult.hasResults && (
            <div className="space-y-4">
              {/* Header differentiating Symptom vs Medicine query */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                medSearchResult.isSymptomQuery
                  ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900'
                  : 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900'
              }`}>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white capitalize">
                    {medSearchResult.isSymptomQuery
                      ? `${medSearchResult.matchedSymptom || medSearchResult.query} — Symptom`
                      : `${medSearchResult.query} — Medicine Information`}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {medSearchResult.isSymptomQuery
                      ? 'Related Medicine Information from CampusCare Dataset'
                      : 'Verified Educational Profile from CampusCare Dataset'}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                  medSearchResult.isSymptomQuery
                    ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 border-blue-300'
                    : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border-emerald-300'
                }`}>
                  {medSearchResult.isSymptomQuery ? 'Symptom Search' : 'Drug Search'}
                </span>
              </div>

              {medSearchResult.medicines.map((med, idx) => (
                <div
                  key={idx}
                  className="p-5 sm:p-6 rounded-3xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3.5 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                        <Pill className="w-4 h-4 text-emerald-600" />
                        {med.medicine_name}
                      </h3>
                      <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">
                        Category: {med.category}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                      {med.generic_name}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Related Symptoms: </span>
                    <span className="capitalize">{med.related_symptoms.join(', ')}</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 space-y-1.5">
                    <span className="font-bold text-xs text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      Safety Notes & Precautions:
                    </span>
                    <ul className="list-disc list-inside text-xs text-amber-900 dark:text-amber-200 space-y-1">
                      {med.safety_notes.map((sn, sIdx) => (
                        <li key={sIdx}>{sn}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700/60 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">
                      Source: <strong className="text-slate-700 dark:text-slate-200">{med.source}</strong>
                    </span>
                    <a
                      href={med.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:underline font-bold"
                    >
                      View Source <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 leading-relaxed border-t border-slate-100 dark:border-slate-800">
                    ⚠️ <em>Medicine information is educational and does not replace advice from a doctor or pharmacist. CampusCare does not generate prescriptions or individualized dosage instructions.</em>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
