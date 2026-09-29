import { CAMPUSCARE_MEDICINES, CampusCareMedicine, CAMPUSCARE_MEDICINES_METADATA } from '../data/medicines';

export interface MedicineSearchResult {
  query: string;
  isSymptomQuery: boolean;
  matchedSymptom?: string;
  medicines: CampusCareMedicine[];
  hasResults: boolean;
  message?: string;
}

/**
 * Normalizes text for safe matching: lowercase, trimmed, special punctuation removed.
 */
function normalize(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Returns all unique related symptoms documented in the uploaded dataset.
 */
export function getAllDatasetSymptoms(): string[] {
  const symptomSet = new Set<string>();
  CAMPUSCARE_MEDICINES.forEach(med => {
    med.related_symptoms.forEach(sym => symptomSet.add(sym.toLowerCase().trim()));
  });
  return Array.from(symptomSet);
}

/**
 * Retrieves medicines relevant to a symptom or text containing symptoms.
 * Matches against `related_symptoms` in the uploaded dataset.
 */
export function getMedicinesForSymptom(symptomOrText: string): CampusCareMedicine[] {
  const normQuery = normalize(symptomOrText);
  if (!normQuery) return [];

  const matched = new Set<CampusCareMedicine>();

  for (const med of CAMPUSCARE_MEDICINES) {
    for (const relSym of med.related_symptoms) {
      const normSym = normalize(relSym);
      // Check full string contains symptom or symptom contains query word
      if (
        normQuery.includes(normSym) ||
        normSym.includes(normQuery) ||
        normQuery.split(' ').some(word => word.length >= 3 && normSym.includes(word))
      ) {
        matched.add(med);
        break;
      }
    }
  }

  return Array.from(matched);
}

/**
 * Looks up a medicine by its brand name, trade name, or generic active name.
 */
export function getMedicineByName(name: string): CampusCareMedicine | undefined {
  const normName = normalize(name);
  if (!normName) return undefined;

  return CAMPUSCARE_MEDICINES.find(med => {
    const normBrand = normalize(med.medicine_name);
    const normGeneric = normalize(med.generic_name);
    return (
      normBrand === normName ||
      normGeneric === normName ||
      normBrand.includes(normName) ||
      normGeneric.includes(normName) ||
      normName.includes(normGeneric)
    );
  });
}

/**
 * Search the medicine dataset by Medicine Name, Generic Name, Category, or Symptom.
 * Distinguishes whether the query is a symptom (e.g. "headache") vs a medicine (e.g. "Paracetamol").
 */
export function searchMedicines(query: string): MedicineSearchResult {
  const cleanQuery = query.trim();
  const normQuery = normalize(cleanQuery);

  if (!normQuery) {
    return {
      query: cleanQuery,
      isSymptomQuery: false,
      medicines: [],
      hasResults: false,
      message: 'Please enter a medicine name, active ingredient, or symptom to search.'
    };
  }

  // 1. Check if the query matches a symptom from the dataset
  const knownSymptoms = getAllDatasetSymptoms();
  const matchedSymptom = knownSymptoms.find(sym => {
    const normSym = normalize(sym);
    return normQuery.includes(normSym) || normSym.includes(normQuery);
  });

  // Check if it's explicitly a medicine name first
  const exactMedMatch = getMedicineByName(normQuery);

  if (matchedSymptom && !exactMedMatch) {
    // The query represents a SYMPTOM (e.g., "headache", "fever", "cough")
    const medicinesForSymptom = getMedicinesForSymptom(matchedSymptom);
    return {
      query: cleanQuery,
      isSymptomQuery: true,
      matchedSymptom,
      medicines: medicinesForSymptom,
      hasResults: medicinesForSymptom.length > 0,
      message: medicinesForSymptom.length > 0
        ? undefined
        : 'No medicine information was found in the current CampusCare medicine dataset. Consult a doctor or pharmacist.'
    };
  }

  // 2. Otherwise search by medicine name, generic name, category, or fallback to symptoms
  const matchedSet = new Set<CampusCareMedicine>();

  // Check name/generic/category matches
  for (const med of CAMPUSCARE_MEDICINES) {
    const normBrand = normalize(med.medicine_name);
    const normGeneric = normalize(med.generic_name);
    const normCat = normalize(med.category);

    if (
      normBrand.includes(normQuery) ||
      normGeneric.includes(normQuery) ||
      normCat.includes(normQuery) ||
      normQuery.includes(normGeneric)
    ) {
      matchedSet.add(med);
    }
  }

  // If no direct medicine match, also check if any related_symptoms match
  if (matchedSet.size === 0) {
    const symMeds = getMedicinesForSymptom(normQuery);
    if (symMeds.length > 0) {
      return {
        query: cleanQuery,
        isSymptomQuery: true,
        matchedSymptom: cleanQuery,
        medicines: symMeds,
        hasResults: true
      };
    }
  }

  const results = Array.from(matchedSet);

  return {
    query: cleanQuery,
    isSymptomQuery: false,
    medicines: results,
    hasResults: results.length > 0,
    message: results.length > 0
      ? undefined
      : 'No medicine information was found in the current CampusCare medicine dataset. Consult a doctor or pharmacist.'
  };
}

export const medicineService = {
  getAll: () => CAMPUSCARE_MEDICINES,
  getMetadata: () => CAMPUSCARE_MEDICINES_METADATA,
  searchMedicines,
  getMedicinesForSymptom,
  getMedicineByName,
  getAllDatasetSymptoms
};
