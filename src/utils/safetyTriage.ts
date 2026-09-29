/**
 * Clinical safety and red-flag emergency triage utility for CampusCare.
 * Guarantees deterministic emergency identification with robust negation awareness.
 */

export interface RedFlagResult {
  isEmergency: boolean;
  reason?: string;
  matchedPattern?: string;
}

export interface RedFlagPattern {
  id: string;
  pattern: RegExp;
  reason: string;
}

export const EMERGENCY_RED_FLAGS: RedFlagPattern[] = [
  {
    id: 'chest_pain',
    pattern: /\b(chest pain|pressure in chest|tightness in chest|pain radiating to (?:left arm|jaw|back))\b/i,
    reason: 'Acute chest discomfort can indicate a cardiac emergency.'
  },
  {
    id: 'respiratory_distress',
    pattern: /\b(severe breathing difficulty|struggling to breathe|cannot catch breath|shortness of breath|wheezing with significant respiratory distress|wheezing and (?:difficulty|struggling)|acute respiratory distress)\b/i,
    reason: 'Acute breathing difficulty or respiratory distress requires immediate medical attention.'
  },
  {
    id: 'thunderclap_headache',
    // ONLY activate on explicit high-risk wording; never on one-sided, throbbing, or light/noise sensitivity
    pattern: /\b(sudden explosive onset|sudden explosive severe headache|sudden explosive headache|thunderclap headache|worst headache of (?:my\s+)?life|explosive thunderclap)\b/i,
    reason: 'Sudden explosive or thunderclap headache requires urgent neurological evaluation.'
  },
  {
    id: 'neurological_stroke',
    pattern: /\b(weakness in (?:arm|leg|face|side)|slurred speech|facial droop|difficulty speaking|acute speech change)\b/i,
    reason: 'Limb weakness or acute speech changes are potential stroke warning signs.'
  },
  {
    id: 'loss_of_consciousness',
    pattern: /\b(passed out|loss of consciousness|fainted|unconscious)\b/i,
    reason: 'Loss of consciousness is a critical red-flag medical emergency.'
  },
  {
    id: 'anaphylaxis',
    pattern: /\b(throat swelling|swollen lips|difficulty swallowing|anaphylaxis|severe allergic reaction)\b/i,
    reason: 'Throat or facial swelling indicates potential life-threatening anaphylaxis.'
  },
  {
    id: 'hemorrhage',
    pattern: /\b(coughing blood|vomiting blood|heavy bleeding|uncontrolled bleeding|active hemorrhage)\b/i,
    reason: 'Active hemorrhage requires immediate casualty emergency care.'
  },
  {
    id: 'seizure',
    pattern: /\b(active seizure|convulsions)\b/i,
    reason: 'Active seizure requires emergency medical care.'
  }
];

/**
 * Checks whether the matched substring in fullText is preceded by a negation
 * inside the same local clause (e.g., "no sudden explosive onset", "without shortness of breath").
 */
export function isClauseNegated(fullText: string, matchIndex: number): boolean {
  // Look back up to 70 characters before the match index
  const lookback = fullText.slice(Math.max(0, matchIndex - 70), matchIndex).toLowerCase();

  // Delimiters that end the negation scope: commas, periods, semicolons, exclamation marks, question marks, newlines, "but", "however"
  const clauses = lookback.split(/[,.;:!?|\n]|\bbut\b|\bhowever\b/);
  const immediateClause = clauses[clauses.length - 1] || '';

  // Negation words in English medical queries
  const negationRegex = /\b(no|not|without|denies|denied|negative for|neither|never|free of|rule out)\b/i;
  return negationRegex.test(immediateClause);
}

/**
 * Deterministically analyzes text against critical medical emergency patterns.
 * Explicitly filters out negated mentions to prevent false positives.
 */
export function evaluateRedFlags(rawText: string): RedFlagResult {
  if (!rawText || typeof rawText !== 'string') {
    return { isEmergency: false };
  }

  for (const rf of EMERGENCY_RED_FLAGS) {
    // Reset regex index for safety if global flag is present
    const regex = new RegExp(rf.pattern.source, 'gi');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(rawText)) !== null) {
      const matchIndex = match.index;
      // If the match is NOT negated in its local clause, trigger emergency!
      if (!isClauseNegated(rawText, matchIndex)) {
        return {
          isEmergency: true,
          reason: rf.reason,
          matchedPattern: match[0]
        };
      }
    }
  }

  return { isEmergency: false };
}
