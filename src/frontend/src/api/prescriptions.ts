import { apiClient } from './client';
import type { Classification } from './medicines';

export type PrescriptionStatus =
  | 'received'
  | 'verified'
  | 'partially_dispensed'
  | 'fully_dispensed'
  | 'cancelled';

/** Only these can be dispensed (FR-44). */
export const DISPENSABLE_STATUSES: PrescriptionStatus[] = ['verified', 'partially_dispensed'];

export interface PrescriptionSummary {
  id: string;
  referenceNumber: string;
  issuedDate: string;
  /** Issue date + 5 days, computed by the server (BR10). */
  validUntil: string;
  /** True when the business date is after `validUntil`. */
  isExpired: boolean;
  status: PrescriptionStatus;
  customer: { id: string; code: string; fullName: string };
  prescriber: { id: string; licenceNumber: string; fullName: string };
  itemCount: number;
  createdAt: string;
}

export interface PrescriptionItem {
  id: string;
  medicine: { id: string; code: string; name: string; classification: Classification };
  strength: string;
  dose: string;
  route: string;
  daysOfUse: number;
  quantityPrescribed: number;
  quantityDispensed: number;
  /** quantityPrescribed − quantityDispensed (FR-22). */
  quantityOutstanding: number;
}

export interface Prescription extends Omit<PrescriptionSummary, 'itemCount'> {
  patientAgeYears: number | null;
  patientAgeMonths: number | null;
  /** Numeric string, e.g. "12.50". */
  patientWeightKg: string | null;
  accompanyingAdult: string | null;
  verifiedBy: { id: string; fullName: string } | null;
  verifiedAt: string | null;
  verificationNote: string | null;
  items: PrescriptionItem[];
}

export interface PrescriptionItemInput {
  medicineId: string;
  strength: string;
  quantityPrescribed: number;
  dose: string;
  route: string;
  daysOfUse: number;
}

export interface PrescriptionInput {
  referenceNumber: string;
  issuedDate: string;
  customerId: string;
  prescriberId: string;
  patientAgeYears?: number | null;
  /** Under 72 months only, with weight and accompanying adult (FR-13). */
  patientAgeMonths?: number | null;
  patientWeightKg?: number | null;
  accompanyingAdult?: string | null;
  items: PrescriptionItemInput[];
}

export interface PrescriptionListQuery {
  search?: string;
  status?: PrescriptionStatus;
}

export const prescriptionsApi = {
  list: (query: PrescriptionListQuery = {}) =>
    apiClient
      .get<PrescriptionSummary[]>('/prescriptions', { params: query })
      .then((r) => r.data),

  get: (id: string) =>
    apiClient.get<Prescription>(`/prescriptions/${id}`).then((r) => r.data),

  create: (input: PrescriptionInput) =>
    apiClient.post<Prescription>('/prescriptions', input).then((r) => r.data),

  /** Replaces the details; the prescription returns to RECEIVED (FR-44). */
  update: (id: string, input: PrescriptionInput) =>
    apiClient.put<Prescription>(`/prescriptions/${id}`, input).then((r) => r.data),

  /** Records the pharmacist's review and marks it VERIFIED (FR-44). */
  verify: (id: string, note?: string) =>
    apiClient
      .post<Prescription>(`/prescriptions/${id}/verify`, { note })
      .then((r) => r.data),
};
