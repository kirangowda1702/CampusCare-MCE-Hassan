import { CAMPUSCARE_MEDICINES_DATASET, CampusCareMedicine } from '../data/medicines';

export interface MedicineSearchResult {
  query: string;
  isSymptomQuery: boolean;
  medicines: CampusCareMedicine[];
  message?: string;
  disclaimer: string;
}

const COMMON_SYMPTOM_TERMS = new Set([
  'headache',
  'headaches',
  'fever',
  'fevers',
  'high fever',
  'cough',
  'coughing',
  'sneezing',
  'sneeze',
  'runny nose',
  'cold',
  'itchy',
  'itching',
  'itchy eyes',
  'watery eyes',
  'heartburn',
  'acid',
  'acidity',
  'acid indigestion',
  'indigestion',
  'upset stomach',
  'stomach ache',
  'stomach pain',
  'minor pain',
  'muscle ache',
  'muscle aches',
  'body ache',
  'body aches'
]);

/**
 * Normalizes input string for safe, consistent comparison.
 */
function normalize(str: string): string {
  return (str || '').toLowerCase().trim();
}

export const medicineService = {
  /**
   * Returns all verified medicines from the uploaded dataset.
   */
  getAllMedicines(): CampusCareMedicine[] {
    return CAMPUSCARE_MEDICINES_DATASET.medicines;
  },

  /**
   * Finds a medicine by its brand/medicine name or generic name.
   */
  getMedicineByName(name: string): CampusCareMedicine | null {
    const q = normalize(name);
    if (!q) return null;

    return (
      CAMPUSCARE_MEDICINES_DATASET.medicines.find(m => {
        const medName = normalize(m.medicine_name);
        const genName = normalize(m.generic_name);
        return medName.includes(q) || q.includes(medName) || genName.includes(q) || q.includes(genName);
      }) || null
    );
  },

  /**
   * Finds medicines linked to a specific reported symptom in related_symptoms.
   * Safe matching: lowercase, trim, keyword containment.
   */
  getMedicinesForSymptom(symptom: string): CampusCareMedicine[] {
    const q = normalize(symptom);
    if (!q) return [];

    return CAMPUSCARE_MEDICINES_DATASET.medicines.filter(m => {
      return m.related_symptoms.some(rs => {
        const normRs = normalize(rs);
        return q.includes(normRs) || normRs.includes(q);
      });
    });
  },

  /**
   * Search medicines by brand name, generic name, or symptom/related symptom.
   * Clearly distinguishes whether the query is a symptom or a medicine.
   */
  searchMedicines(query: string): MedicineSearchResult {
    const cleanQuery = normalize(query);
    const disclaimer =
      'Medicine information is educational and does not replace advice from a doctor or pharmacist. Never self-prescribe without clinical evaluation.';

    if (!cleanQuery) {
      return {
        query,
        isSymptomQuery: false,
        medicines: [],
        disclaimer
      };
    }

    // 1. Check if user is searching for a symptom
    const isExplicitSymptom =
      COMMON_SYMPTOM_TERMS.has(cleanQuery) ||
      Array.from(COMMON_SYMPTOM_TERMS).some(term => cleanQuery.includes(term));

    // Also check if any medicine in the dataset lists this as a related symptom
    const symptomMatches = this.getMedicinesForSymptom(cleanQuery);

    // 2. Check if user is searching for a medicine name or generic name
    const directNameMatches = CAMPUSCARE_MEDICINES_DATASET.medicines.filter(m => {
      const medName = normalize(m.medicine_name);
      const genName = normalize(m.generic_name);
      return medName.includes(cleanQuery) || genName.includes(cleanQuery);
    });

    if (directNameMatches.length > 0) {
      return {
        query,
        isSymptomQuery: false,
        medicines: directNameMatches,
        disclaimer
      };
    }

    if (symptomMatches.length > 0 || isExplicitSymptom) {
      return {
        query,
        isSymptomQuery: true,
        medicines: symptomMatches,
        message:
          symptomMatches.length === 0
            ? 'No medicine information was found in the current CampusCare medicine dataset.'
            : undefined,
        disclaimer
      };
    }

    // No matches in dataset
    return {
      query,
      isSymptomQuery: false,
      medicines: [],
      message: 'No medicine information was found in the current CampusCare medicine dataset.',
      disclaimer
    };
  }
};
