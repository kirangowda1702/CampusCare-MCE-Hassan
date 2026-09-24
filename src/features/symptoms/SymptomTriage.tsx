import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  PhoneCall,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Calendar,
  ExternalLink,
  BookOpen,
  Pill,
  HeartPulse,
  UserCheck,
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
  ChevronRight
} from 'lucide-react';
import { SymptomGuidanceRequest, SymptomGuidanceResponse, MedicineInfo, Doctor } from '../../types';
import { Link, useNavigate } from 'react-router-dom';
import { useEmergency } from '../../context/EmergencyContext';
import { aiService } from '../../services/aiService';
import { doctorService } from '../../services/doctorService';

// Deterministic realtime emergency red-flag patterns
const RED_FLAG_PATTERNS = [
  { pattern: /chest pain|pressure in chest|tightness in chest|pain radiating to (left arm|jaw|back)/i, reason: 'Acute chest discomfort can indicate a cardiac emergency.' },
  { pattern: /shortness of breath|difficulty breathing|struggling to breathe|cannot catch breath/i, reason: 'Acute breathing difficulty requires immediate medical attention.' },
  { pattern: /worst headache|sudden severe headache|thunderclap/i, reason: 'Sudden explosive headache requires urgent neurological evaluation.' },
  { pattern: /weakness.*(arm|leg|face|side)|slurred speech|facial droop|difficulty speaking/i, reason: 'Limb weakness or speech changes are potential stroke warning signs.' },
  { pattern: /passed out|loss of consciousness|fainted|unconscious/i, reason: 'Loss of consciousness is a critical red-flag emergency.' },
  { pattern: /throat swelling|swollen lips|difficulty swallowing|anaphylaxis/i, reason: 'Throat or airway swelling indicates potential anaphylaxis.' },
  { pattern: /coughing blood|vomiting blood|heavy bleeding|uncontrolled bleeding/i, reason: 'Active hemorrhage requires immediate casualty care.' }
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

type ConversationStage =
  | 'welcome'
  | 'awaiting_symptom'
  | 'asking_duration'
  | 'asking_severity'
  | 'asking_domain_q1'
  | 'asking_domain_q2'
  | 'analyzing'
  | 'completed';

export const SymptomTriage: React.FC = () => {
  const navigate = useNavigate();
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

  // Doctor Directory state for matched specialty cards
  const [verifiedDoctors, setVerifiedDoctors] = useState<Doctor[]>([]);

  // Medicine Search State
  const [medSearchQuery, setMedSearchQuery] = useState('');
  const [medSearchResults, setMedSearchResults] = useState<MedicineInfo[] | null>(null);
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
      text: "Hi! I'm CampusCare AI 👋\n\nI can help you understand your symptoms, ask a few follow-up questions, explain possible causes, and suggest what type of healthcare professional you may want to consult.\n\nI cannot diagnose medical conditions or replace a doctor.\n\nWhat are you experiencing today?",
      quickChoices: [
        { label: '🤕 Headache', value: 'I have a headache' },
        { label: '🤒 Fever', value: 'I have a fever' },
        { label: '😮‍💨 Cough & Cold', value: 'I have a cough and cold' },
        { label: '🤢 Stomach Pain', value: 'I have stomach pain' },
        { label: '❤️ Chest Discomfort', value: 'I feel discomfort in my chest' },
        { label: '🔴 Skin Problem', value: 'I have an itchy skin rash' },
        { label: '🦴 Back Pain', value: 'I have back pain' },
        { label: '💬 Other Symptoms', value: 'I have other symptoms' }
      ]
    };
    setMessages([welcomeMsg]);
    setStage('welcome');
    setSymptomSummary('');
    setFollowUpAnswers({});
    setSeverityScore(4);
    setDurationDays(1);
  };

  useEffect(() => {
    initWelcome();
  }, []);

  // Detect domain based on user text
  const getDomainFromText = (text: string): string => {
    const lower = text.toLowerCase();
    if (lower.includes('headache') || lower.includes('migraine') || lower.includes('head')) return 'headache';
    if (lower.includes('fever') || lower.includes('cough') || lower.includes('cold') || lower.includes('throat') || lower.includes('breath')) return 'fever_respiratory';
    if (lower.includes('stomach') || lower.includes('abdomen') || lower.includes('belly') || lower.includes('diarrhea') || lower.includes('vomit') || lower.includes('nausea') || lower.includes('gas') || lower.includes('acidity')) return 'stomach_gi';
    if (lower.includes('skin') || lower.includes('itch') || lower.includes('rash') || lower.includes('hive') || lower.includes('allergy')) return 'skin_rash';
    if (lower.includes('back') || lower.includes('spine') || lower.includes('neck') || lower.includes('muscle') || lower.includes('joint') || lower.includes('knee')) return 'back_musculoskeletal';
    return 'general';
  };

  // Check emergency red-flag patterns
  const checkRedFlags = (text: string): { isEmergency: boolean; reason?: string } => {
    for (const rf of RED_FLAG_PATTERNS) {
      if (rf.pattern.test(text)) {
        return { isEmergency: true, reason: rf.reason };
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
  const addBotMessage = (msg: Omit<ChatMessage, 'id' | 'sender' | 'timestamp'>, delayMs: number = 400) => {
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

    // 1. Immediate Emergency Red-Flag Check BEFORE AI
    const redFlagCheck = checkRedFlags(text + ' ' + symptomSummary);
    if (redFlagCheck.isEmergency) {
      addBotMessage({
        text: "🚨 Possible Emergency Detected\n\nYour symptoms may require urgent medical attention. Please do not wait for an online evaluation or attempt self-care.",
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
        text: "Sorry you're experiencing that. Let me ask a few quick questions to better understand what's going on.\n\nHow long have you had these symptoms?",
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
      else if (text.includes('More than 3')) days = 5;
      setDurationDays(days);
      setFollowUpAnswers(prev => ({ ...prev, duration: text }));

      addBotMessage({
        text: "Got it. How severe is the pain or discomfort right now?",
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

      // Ask Domain Question 1
      if (detectedDomain === 'headache') {
        addBotMessage({
          text: "Where is the headache pain located, and does light or sound make it worse?",
          quickChoices: [
            { label: 'Forehead / Both temples', value: 'Forehead and temples, band-like tension' },
            { label: 'One side / Throbbing with light sensitivity', value: 'One side throbbing, sensitive to light and noise' },
            { label: 'Back of head / Neck stiffness', value: 'Back of head and neck strain' },
            { label: 'Sinus / Facial pressure with congestion', value: 'Facial and sinus pressure around nose and eyes' }
          ]
        });
      } else if (detectedDomain === 'fever_respiratory') {
        addBotMessage({
          text: "Are you having a cough, sore throat, or nasal congestion?",
          quickChoices: [
            { label: 'Dry cough & scratchy throat', value: 'Dry cough and sore scratchy throat' },
            { label: 'Cough with mucus / phlegm', value: 'Productive cough with mucus and cold' },
            { label: 'Fever with chills & body ache', value: 'Fever with body chills and fatigue' },
            { label: 'Congestion & runny nose only', value: 'Nasal congestion and mild sneezing' }
          ]
        });
      } else if (detectedDomain === 'stomach_gi') {
        addBotMessage({
          text: "Where is the stomach pain, and is it related to eating?",
          quickChoices: [
            { label: 'Upper abdomen / Burning after food', value: 'Upper stomach burning sensation after meals' },
            { label: 'Lower abdomen / Cramping with diarrhea', value: 'Lower abdomen cramping and loose stools' },
            { label: 'Nausea & vomiting feeling', value: 'Nausea and difficulty eating' },
            { label: 'Bloating & general indigestion', value: 'Bloating and gas discomfort' }
          ]
        });
      } else if (detectedDomain === 'skin_rash') {
        addBotMessage({
          text: "What does the skin problem look like, and is there itching?",
          quickChoices: [
            { label: 'Intense itching with red bumps / hives', value: 'Intense itching with raised red hives' },
            { label: 'Dry, scaly patches', value: 'Dry scaly irritated skin patches' },
            { label: 'Started after new soap / cosmetic / plant', value: 'Contact reaction after new soap or product' },
            { label: 'Mild localized redness', value: 'Mild localized redness without severe itch' }
          ]
        });
      } else if (detectedDomain === 'back_musculoskeletal') {
        addBotMessage({
          text: "Did the back or muscle pain start after study posture, lifting, or sudden movement?",
          quickChoices: [
            { label: 'Prolonged sitting / study desk posture', value: 'Prolonged sitting and study desk strain' },
            { label: 'Heavy lifting / sports twist', value: 'Heavy lifting or sports exertion strain' },
            { label: 'Muscle stiffness in morning', value: 'General muscle tightness and stiff back' },
            { label: 'Sudden sharp pain with bending', value: 'Sudden sharp catch when bending' }
          ]
        });
      } else {
        addBotMessage({
          text: "Are these symptoms constant, or do they come and go throughout the day?",
          quickChoices: [
            { label: 'Constant throughout the day', value: 'Constant continuous symptoms' },
            { label: 'Comes and goes in waves', value: 'Intermittent episodes' },
            { label: 'Worse during morning', value: 'Worse in the morning upon waking' },
            { label: 'Worse late at night', value: 'Worse at night or after fatigue' }
          ]
        });
      }
      setStage('asking_domain_q1');
    } else if (stage === 'asking_domain_q1') {
      setFollowUpAnswers(prev => ({ ...prev, character: text }));

      // Ask Domain Question 2 (Red-flag screening)
      if (detectedDomain === 'headache') {
        addBotMessage({
          text: "Lastly, any high fever with neck stiffness, vomiting, or sudden explosive onset?",
          quickChoices: [
            { label: '✅ None of these (gradual, mild)', value: 'No high fever, no neck stiffness, no sudden explosive onset' },
            { label: 'Mild nausea only', value: 'Mild nausea without vomiting or stiff neck' },
            { label: 'Fever with stiff neck', value: 'Fever with neck stiffness' }
          ]
        });
      } else if (detectedDomain === 'fever_respiratory') {
        addBotMessage({
          text: "Lastly, are you able to breathe normally without wheezing or chest tightness?",
          quickChoices: [
            { label: '✅ Breathing is normal', value: 'Breathing is normal, no shortness of breath' },
            { label: 'Mild nasal congestion only', value: 'Mild congestion, breathing okay' },
            { label: 'Wheezing or struggling to breathe', value: 'Wheezing and difficulty catching breath' }
          ]
        });
      } else if (detectedDomain === 'stomach_gi') {
        addBotMessage({
          text: "Lastly, are you able to retain fluids without vomiting or blood in stool?",
          quickChoices: [
            { label: '✅ Yes, drinking water fine', value: 'Able to drink water and fluids normally, no blood' },
            { label: 'Mild nausea, drinking small sips', value: 'Mild nausea but retaining small sips' },
            { label: 'Cannot keep any fluids down', value: 'Unable to retain fluids, frequent vomiting' }
          ]
        });
      } else if (detectedDomain === 'skin_rash') {
        addBotMessage({
          text: "Lastly, any swelling around your lips, eyes, tongue, or difficulty breathing?",
          quickChoices: [
            { label: '✅ No facial or throat swelling', value: 'No lip, tongue, or facial swelling, breathing normal' },
            { label: 'Mild itch around eyes', value: 'Mild itch around eye area, no breathing issues' },
            { label: 'Lip or throat swelling present', value: 'Swelling around lips and throat' }
          ]
        });
      } else if (detectedDomain === 'back_musculoskeletal') {
        addBotMessage({
          text: "Lastly, any pain radiating down both legs, numbness in feet, or bladder changes?",
          quickChoices: [
            { label: '✅ No radiation or numbness', value: 'No radiation down legs, no numbness, normal bladder control' },
            { label: 'Mild pain near hip only', value: 'Mild pain near glute/hip, no numbness' },
            { label: 'Numbness or shooting leg pain', value: 'Numbness in legs and difficulty walking' }
          ]
        });
      } else {
        addBotMessage({
          text: "Lastly, have you taken any over-the-counter medicine for this yet?",
          quickChoices: [
            { label: 'No medicine taken yet', value: 'No medications taken yet' },
            { label: 'Took Paracetamol with mild relief', value: 'Took Paracetamol with partial relief' },
            { label: 'Took antacid / hydration', value: 'Took antacid or hydration fluids' }
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
        addBotMessage({
          text: "🚨 Possible Emergency Detected\n\nYour response indicates symptoms that warrant immediate medical evaluation.",
          isEmergency: true,
          emergencyReason: finalRedFlag.reason
        });
        setStage('completed');
        return;
      }

      // Execute AI Guidance Analysis
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

        setIsTyping(false);
        addBotMessage({
          text: `Based on what you've shared, here is an evidence-based clinical overview for your symptoms:\n\n*Note: This is an educational triage summary, not a medical diagnosis.*`,
          isTriageResult: true,
          triageData: result
        }, 100);
        setStage('completed');
      } catch (err: any) {
        setIsTyping(false);
        addBotMessage({
          text: "I encountered an issue analyzing your symptoms. Please consult a doctor or contact the Campus Health Centre directly.",
          isTriageResult: false
        });
        setStage('completed');
      }
    }
  };

  // Medicine search handler
  const handleMedicineSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medSearchQuery.trim()) return;

    setIsMedLoading(true);
    setMedError(null);
    try {
      const results = await aiService.queryMedicine(medSearchQuery.trim());
      setMedSearchResults(results);
    } catch (err: any) {
      setMedError(err.message || 'No medicine information found for this query.');
    } finally {
      setIsMedLoading(false);
    }
  };

  // Filter matched doctors from directory
  const matchedDoctors = useMemo(() => {
    return verifiedDoctors.slice(0, 2);
  }, [verifiedDoctors]);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Top Mode Selector Header */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-primary-600 to-amber-500 text-white flex items-center justify-center shadow-md flex-shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                CampusCare AI
              </h2>
              <span className="text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Active Triage
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Smart Health Guidance Assistant • Educational triage, not a diagnosis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveMode('chat')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeMode === 'chat'
                ? 'bg-blue-900 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            💬 Symptom Chat
          </button>
          <button
            onClick={() => setActiveMode('medicine')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeMode === 'medicine'
                ? 'bg-blue-900 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            💊 Medicine Search
          </button>
          <button
            onClick={initWelcome}
            title="Start New Conversation"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1 text-xs font-semibold"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>
      </div>

      {activeMode === 'chat' ? (
        /* ========================================================================= */
        /* CONVERSATIONAL CHAT INTERFACE                                             */
        /* ========================================================================= */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[650px] overflow-hidden">
          {/* Messages Scroll Area */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-950/40">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'bot' && (
                  <div className="w-8 h-8 rounded-xl bg-blue-900 text-amber-400 flex items-center justify-center flex-shrink-0 shadow-sm text-xs font-bold mt-0.5">
                    🤖
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-sm text-xs sm:text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-blue-900 text-white rounded-br-xs'
                      : 'bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-xs'
                  }`}
                >
                  {/* Message Text */}
                  {msg.text && (
                    <div className="whitespace-pre-line font-normal">
                      {msg.text}
                    </div>
                  )}

                  {/* 🚨 Emergency Alert Bubble */}
                  {msg.isEmergency && (
                    <div className="mt-3 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/80 border-2 border-rose-500 text-rose-900 dark:text-rose-200 space-y-3">
                      <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-extrabold text-sm">
                        <ShieldAlert className="w-5 h-5 text-rose-600 animate-pulse flex-shrink-0" />
                        <span>CRITICAL MEDICAL RED FLAG</span>
                      </div>
                      {msg.emergencyReason && (
                        <p className="text-xs font-medium text-rose-800 dark:text-rose-300">
                          {msg.emergencyReason}
                        </p>
                      )}
                      <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-snug">
                        Immediate medical intervention is required. Do NOT wait for online triage or attempt home remedies.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-2 pt-1">
                        <a
                          href="tel:9110885805"
                          className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                        >
                          <PhoneCall className="w-4 h-4" /> Call MCE First Aid: 9110885805
                        </a>
                        <button
                          onClick={() => {
                            setIsEmergencyModalOpen(true);
                            navigate('/emergency');
                          }}
                          className="py-2.5 px-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                        >
                          <ShieldAlert className="w-4 h-4" /> Open SOS Page
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 💡 Rich Triage Result Cards */}
                  {msg.isTriageResult && msg.triageData && (
                    <div className="mt-4 space-y-3.5 text-xs text-slate-800 dark:text-slate-200">
                      {/* Urgency Badge */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Urgency Assessment:</span>
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wide ${
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

                      {/* Possible Causes */}
                      <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 space-y-2">
                        <div className="flex items-center gap-1.5 font-bold text-blue-900 dark:text-blue-300 text-xs">
                          <HelpCircle className="w-4 h-4 text-blue-600" />
                          <span>Possible Causes (To discuss with a doctor):</span>
                        </div>
                        <div className="space-y-1.5 pt-1">
                          {msg.triageData.possible_conditions?.map((cond, idx) => (
                            <div key={idx} className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-blue-100 dark:border-blue-950">
                              <div className="flex items-center justify-between font-bold text-xs text-slate-900 dark:text-white">
                                <span>{cond.name}</span>
                                <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded">
                                  {cond.likelihood} Likelihood
                                </span>
                              </div>
                              {cond.explanation && (
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                                  {cond.explanation}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Self-Care & What to do now */}
                      <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-300 text-xs">
                          <CheckCircle2 className="w-4 h-4 text-amber-600" />
                          <span>What You Can Do Now (Self-Care):</span>
                        </div>
                        <p className="text-xs text-amber-950 dark:text-amber-200 leading-relaxed font-medium">
                          {msg.triageData.recommended_action}
                        </p>
                      </div>

                      {/* Common Educational OTC Options */}
                      {msg.triageData.common_otc_options?.length > 0 && (
                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 space-y-2">
                          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white text-xs">
                            <Pill className="w-4 h-4 text-emerald-600" />
                            <span>Common OTC Options (Educational):</span>
                          </div>
                          <ul className="list-disc list-inside text-xs text-slate-600 dark:text-slate-300 space-y-1">
                            {msg.triageData.common_otc_options.map((opt, i) => (
                              <li key={i}>{opt}</li>
                            ))}
                          </ul>
                          {msg.triageData.medicine_precautions?.length > 0 && (
                            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                              <span className="font-bold text-slate-700 dark:text-slate-300">⚠️ Important Precautions:</span>
                              {msg.triageData.medicine_precautions.map((prec, i) => (
                                <p key={i}>• {prec}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Doctor Matching Card */}
                      <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-amber-400">
                            <Stethoscope className="w-4 h-4" />
                            <span>Recommended Specialty: {msg.triageData.recommended_specialty || 'General Medicine'}</span>
                          </div>
                          <Link
                            to="/doctors"
                            className="text-[11px] font-bold text-white hover:underline flex items-center gap-1"
                          >
                            All Doctors <ChevronRight className="w-3 h-3" />
                          </Link>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {matchedDoctors.map(doc => (
                            <div key={doc.id} className="bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/20 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="w-7 h-7 rounded-lg bg-amber-400 text-blue-900 font-extrabold text-xs flex items-center justify-center">
                                    {doc.initials || 'DR'}
                                  </span>
                                  <div>
                                    <h4 className="font-bold text-xs text-white leading-tight">{doc.name}</h4>
                                    <p className="text-[10px] text-blue-200">{doc.specialization}</p>
                                  </div>
                                </div>
                                <p className="text-[10px] text-slate-300 mt-1.5 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-amber-400 flex-shrink-0" /> {doc.hospital_name || 'Hassan'}
                                </p>
                              </div>
                              <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between">
                                <Link
                                  to={`/doctors/${doc.id}`}
                                  className="text-[11px] font-bold text-amber-300 hover:text-white"
                                >
                                  View Profile
                                </Link>
                                <Link
                                  to="/appointments/book"
                                  className="py-1 px-2.5 rounded-lg bg-amber-400 hover:bg-amber-500 text-blue-950 font-extrabold text-[10px] shadow"
                                >
                                  Book Appointment
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Authoritative Sources */}
                      {msg.triageData.sources?.length > 0 && (
                        <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5 text-blue-600" /> Learn more from trusted medical sources:
                          </span>
                          <div className="flex flex-wrap gap-2 pt-1">
                            {msg.triageData.sources.map((src, i) => (
                              <a
                                key={i}
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-primary-600 dark:text-primary-400 hover:underline font-semibold bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700"
                              >
                                {src.name} <ExternalLink className="w-3 h-3" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Provider Transparency Note */}
                      <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                        <span>
                          {msg.triageData.isRealAI
                            ? `⚡ AI Guidance Model: ${msg.triageData.provider || 'Google Gemini'}`
                            : `🛡️ Evidence-Grounded Clinical Triage Guidance`}
                        </span>
                        <button
                          onClick={initWelcome}
                          className="text-primary-600 dark:text-primary-400 font-bold hover:underline flex items-center gap-1"
                        >
                          <RotateCcw className="w-3 h-3" /> Start New Conversation
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Quick Clickable Choices */}
                  {msg.quickChoices && msg.quickChoices.length > 0 && stage !== 'completed' && (
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60">
                      {msg.quickChoices.map((qc, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleUserResponse(qc.value)}
                          className="py-1.5 px-3 rounded-xl bg-blue-50 dark:bg-slate-700/80 hover:bg-blue-100 dark:hover:bg-slate-600 border border-blue-200 dark:border-slate-600 text-blue-900 dark:text-blue-200 font-semibold text-xs transition-all shadow-xs text-left"
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

            {/* Typing / Analyzing Indicator */}
            {isTyping && (
              <div className="flex gap-3 justify-start items-center">
                <div className="w-8 h-8 rounded-xl bg-blue-900 text-amber-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  🤖
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 px-4 shadow-sm flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
                  <span>CampusCare AI is analyzing...</span>
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
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-800 focus:bg-white dark:focus:bg-slate-900 transition-all"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isTyping}
                className="py-2.5 px-4 rounded-xl bg-blue-900 hover:bg-blue-800 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
            <p className="text-[10px] text-center text-slate-400 mt-2">
              Press Enter to send. For acute medical emergencies, immediately dial <strong>9110885805</strong>.
            </p>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* MEDICINE SEARCH TAB (Active Ingredient & Safety Cautions)                 */
        /* ========================================================================= */
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Educational Medicine & OTC Information
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Look up active ingredients, precautions, side effects, and authoritative drug guidelines
              </p>
            </div>
          </div>

          <form onSubmit={handleMedicineSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={medSearchQuery}
                onChange={e => setMedSearchQuery(e.target.value)}
                placeholder="Search active drug name (e.g. Paracetamol, Ibuprofen, Cetirizine, ORS)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              type="submit"
              disabled={!medSearchQuery.trim() || isMedLoading}
              className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-sm"
            >
              {isMedLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Search Drug Info</span>
            </button>
          </form>

          {medError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs font-semibold">
              {medError}
            </div>
          )}

          {medSearchResults && medSearchResults.length > 0 && (
            <div className="space-y-4">
              {medSearchResults.map((med, idx) => (
                <div
                  key={idx}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <Pill className="w-4 h-4 text-emerald-600" />
                      {med.name}
                    </h4>
                    {med.source_url && (
                      <a
                        href={med.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary-600 hover:underline flex items-center gap-1 font-semibold"
                      >
                        {med.source} <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <span className="font-bold text-slate-900 dark:text-white">General Purpose:</span>
                      <p className="text-slate-600 dark:text-slate-400 mt-1">{med.general_use}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <span className="font-bold text-amber-600 dark:text-amber-400">Important Cautions:</span>
                      <p className="text-slate-600 dark:text-slate-400 mt-1">{med.cautions}</p>
                    </div>
                    {med.warnings && (
                      <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 md:col-span-2">
                        <span className="font-bold text-rose-700 dark:text-rose-300">Safety Warnings:</span>
                        <p className="text-rose-800 dark:text-rose-200 mt-1">{med.warnings}</p>
                      </div>
                    )}
                    {med.side_effects && (
                      <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 md:col-span-2">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Potential Side Effects:</span>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">{med.side_effects}</p>
                      </div>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700/60">
                    ⚠️ <em>Follow the manufacturer packaging label or consult a licensed physician / pharmacist before taking any medication. CampusCare does not provide personalized dosage calculations.</em>
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
