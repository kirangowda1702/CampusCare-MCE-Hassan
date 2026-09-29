/**
 * CampusCare Medicine Information Dataset
 * Source of Truth: campuscare_medicines.json
 * 
 * IMPORTANT:
 * - This dataset is for EDUCATIONAL MEDICINE INFORMATION ONLY.
 * - Not a prescribing database or diagnosis engine.
 * - A symptom-to-medicine match must never be treated as a diagnosis or personalized prescription.
 */

export interface CampusCareMedicine {
  medicine_name: string;
  generic_name: string;
  category: string;
  related_symptoms: string[];
  safety_notes: string[];
  source: string;
  source_url: string;
}

export interface AuthoritativeSourceMeta {
  name: string;
  url: string;
}

export interface MedicineDatasetMeta {
  dataset_name: string;
  version: string;
  purpose: string;
  important_rule: string;
  authoritative_sources: AuthoritativeSourceMeta[];
}

export const CAMPUSCARE_MEDICINES_METADATA: MedicineDatasetMeta = {
  dataset_name: "CampusCare Medicine Information Dataset",
  version: "1.0",
  purpose: "Educational medicine information only; not a prescribing database.",
  important_rule: "A symptom-to-medicine match must never be treated as a diagnosis or personalized prescription.",
  authoritative_sources: [
    {
      name: "MedlinePlus Drugs, Herbs and Supplements",
      url: "https://medlineplus.gov/druginformation.html"
    },
    {
      name: "MedlinePlus Medicines",
      url: "https://medlineplus.gov/medicines.html"
    },
    {
      name: "MedlinePlus Over-the-Counter Medicines",
      url: "https://medlineplus.gov/overthecountermedicines.html"
    },
    {
      name: "DailyMed",
      url: "https://dailymed.nlm.nih.gov/dailymed/"
    }
  ]
};

export const CAMPUSCARE_MEDICINES: CampusCareMedicine[] = [
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
