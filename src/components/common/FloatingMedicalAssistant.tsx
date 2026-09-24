import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, MessageSquare, ChevronDown, X } from 'lucide-react';
import { SymptomTriage } from '../../features/symptoms/SymptomTriage';

export const FloatingMedicalAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Close or minimize on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isMinimized) {
        setIsMinimized(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isMinimized]);

  return (
    <>
      {/* 💬 Open Floating Chat Window */}
      {isOpen && !isMinimized && (
        <aside
          role="dialog"
          aria-label="CampusCare AI Assistant"
          aria-modal="false"
          className="fixed inset-x-3 bottom-3 top-16 sm:top-auto sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[410px] sm:h-[600px] max-h-[90vh] z-50 rounded-2xl shadow-2xl overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-200 ease-out animate-in fade-in slide-in-from-bottom-5"
        >
          <SymptomTriage
            isCompact={true}
            onClose={() => {
              setIsOpen(false);
              setIsMinimized(false);
            }}
            onMinimize={() => setIsMinimized(true)}
          />
        </aside>
      )}

      {/* 🤖 Floating Action Button & Tooltip (Visible when closed or minimized) */}
      {(!isOpen || isMinimized) && (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2 pointer-events-auto">
          {/* Desktop Hover Tooltip Card */}
          {isHovered && !isOpen && (
            <div
              role="tooltip"
              className="hidden sm:block mr-1 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl text-left animate-in fade-in slide-in-from-bottom-2 duration-150 max-w-[210px]"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>CampusCare AI</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                Need health guidance? Check symptoms or learn about OTC medicines.
              </p>
            </div>
          )}

          {/* Minimized Quick Status Pill */}
          {isOpen && isMinimized && (
            <button
              onClick={() => setIsMinimized(false)}
              className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-full bg-blue-900 text-white text-xs font-bold shadow-lg border border-blue-700 hover:bg-blue-800 transition-all cursor-pointer mb-1 animate-bounce"
              title="Click to restore CampusCare AI conversation"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>AI Chat Minimized • Expand</span>
            </button>
          )}

          {/* Main Floating Trigger Button */}
          <button
            onClick={() => {
              if (isOpen && isMinimized) {
                setIsMinimized(false);
              } else {
                setIsOpen(true);
                setIsMinimized(false);
              }
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onFocus={() => setIsHovered(true)}
            onBlur={() => setIsHovered(false)}
            aria-label="Talk to CampusCare AI"
            aria-expanded={isOpen && !isMinimized}
            title="Talk to CampusCare AI"
            className="group relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#1e3a8a] hover:bg-[#172554] active:scale-95 text-white shadow-2xl flex items-center justify-center border-2 border-amber-400/80 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-amber-400/50 cursor-pointer"
          >
            {/* Subtle Pulse Animation Ring */}
            <span className="absolute -inset-1 rounded-full bg-blue-600/30 dark:bg-blue-400/20 animate-ping pointer-events-none opacity-75"></span>

            {/* Glowing Accent Ring */}
            <span className="absolute inset-0 rounded-full border border-amber-400/40 pointer-events-none"></span>

            {/* Bot Icon with Golden Yellow Accent */}
            <div className="relative flex items-center justify-center">
              <Bot className="w-7 h-7 sm:w-8 sm:h-8 text-[#f59e0b] group-hover:scale-110 transition-transform duration-200" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#1e3a8a]"></span>
            </div>
          </button>
        </div>
      )}
    </>
  );
};
