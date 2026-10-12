import type { EntityManager } from 'typeorm';
import { MedicineCategory, UnitOfMeasure } from '../entities/index.js';

/** Therapeutic groups. Categories are seed data, not a managed screen (plan W05-A1). */
export const CATEGORIES: { code: string; name: string }[] = [
  { code: 'ANALGESIC', name: 'Analgesics and antipyretics' },
  { code: 'ANTIBIOTIC', name: 'Antibiotics' },
  { code: 'ANTIHISTAMINE', name: 'Antihistamines and allergy' },
  { code: 'COUGH-COLD', name: 'Cough and cold' },
  { code: 'GASTRO', name: 'Gastrointestinal' },
  { code: 'VITAMIN', name: 'Vitamins and minerals' },
  { code: 'CARDIO', name: 'Cardiovascular' },
  { code: 'DIABETES', name: 'Diabetes' },
  { code: 'DERMA', name: 'Dermatology' },
  { code: 'EYE-EAR', name: 'Eye and ear' },
  { code: 'RESPIRATORY', name: 'Respiratory (asthma, COPD)' },
  { code: 'MUSCULO', name: 'Musculoskeletal and anti-inflammatory' },
  { code: 'NEURO-PSY', name: 'Neurology and psychiatry' },
  { code: 'HORMONE', name: 'Hormones and contraceptives' },
  { code: 'FIRST-AID', name: 'Antiseptics and first aid' },
];

/** Base units: stock is always held and issued in one of these (BR06 is Could). */
export const UNITS: { code: string; name: string }[] = [
  { code: 'TAB', name: 'Tablet' },
  { code: 'CAP', name: 'Capsule' },
  { code: 'SACHET', name: 'Sachet' },
  { code: 'BOTTLE', name: 'Bottle' },
  { code: 'TUBE', name: 'Tube' },
  { code: 'AMP', name: 'Ampoule' },
  { code: 'INHALER', name: 'Inhaler' },
  { code: 'PIECE', name: 'Piece' },
];

export async function seedCatalogueReference(
  manager: EntityManager,
): Promise<void> {
  await manager.upsert(MedicineCategory, CATEGORIES, ['code']);
  await manager.upsert(
    UnitOfMeasure,
    UNITS.map((u) => ({ ...u, conversionToBase: 1, isBaseUnit: true })),
    ['code'],
  );
}
