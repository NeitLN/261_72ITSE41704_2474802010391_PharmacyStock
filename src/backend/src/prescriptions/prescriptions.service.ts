import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager, In } from 'typeorm';
import { type Actor, assertPermission } from '../auth/actor.js';
import { Permission } from '../auth/permissions.js';
import {
  Conflict,
  type FieldError,
  NotFound,
  ValidationFailed,
} from '../common/errors.js';
import { likePattern } from '../common/transforms.js';
import {
  Customer,
  Medicine,
  type MedicineClassification,
  Prescriber,
  Prescription,
  PrescriptionItem,
  PrescriptionStatus,
} from '../entities/index.js';
import { Clock } from '../stock/clock.js';
import type {
  ListPrescriptionsQuery,
  PrescriptionDto,
  VerifyPrescriptionDto,
} from './dto/prescription.dto.js';
import { PrescriptionValidator } from './prescription-validator.js';

/** Children under this age in months need age in months, weight and an accompanying adult (FR-13). */
const CHILD_AGE_MONTHS = 72;

export interface PrescriptionSummaryView {
  id: string;
  referenceNumber: string;
  issuedDate: string;
  validUntil: string;
  isExpired: boolean;
  status: PrescriptionStatus;
  customer: { id: string; code: string; fullName: string };
  prescriber: { id: string; licenceNumber: string; fullName: string };
  itemCount: number;
  createdAt: Date;
}

export interface PrescriptionView extends Omit<
  PrescriptionSummaryView,
  'itemCount'
> {
  patientAgeYears: number | null;
  patientAgeMonths: number | null;
  patientWeightKg: string | null;
  accompanyingAdult: string | null;
  verifiedBy: { id: string; fullName: string } | null;
  verifiedAt: Date | null;
  verificationNote: string | null;
  items: Array<{
    id: string;
    medicine: {
      id: string;
      code: string;
      name: string;
      classification: MedicineClassification;
    };
    strength: string;
    dose: string;
    route: string;
    daysOfUse: number;
    quantityPrescribed: number;
    quantityDispensed: number;
    quantityOutstanding: number;
  }>;
}

/** Whole months from `from` to `to`, both `YYYY-MM-DD`. */
export function monthsBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return (ty - fy) * 12 + (tm - fm) - (td < fd ? 1 : 0);
}

/**
 * UC05 — take in a prescription and record the pharmacist's review.
 * Nothing here touches stock: a prescription reserves nothing (DEC-05).
 */
@Injectable()
export class PrescriptionsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly clock: Clock,
  ) {}

  async list(
    actor: Actor,
    query: ListPrescriptionsQuery,
  ): Promise<PrescriptionSummaryView[]> {
    assertPermission(actor, Permission.PRESCRIPTION_MANAGE);
    const qb = this.dataSource
      .getRepository(Prescription)
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.customer', 'customer')
      .innerJoinAndSelect('p.prescriber', 'prescriber')
      .orderBy('p.createdAt', 'DESC')
      .limit(100);
    if (query.status) {
      qb.andWhere('p.status = :status', { status: query.status });
    }
    if (query.search) {
      qb.andWhere(
        '(p.referenceNumber ILIKE :pattern OR customer.fullName ILIKE :pattern' +
          ' OR customer.code ILIKE :pattern OR prescriber.fullName ILIKE :pattern)',
        { pattern: likePattern(query.search) },
      );
    }
    const rows = await qb.getMany();
    const counts: { prescription_id: string; count: string }[] =
      rows.length === 0
        ? []
        : await this.dataSource.query(
            `SELECT prescription_id, COUNT(*) AS count FROM prescription_items
              WHERE prescription_id = ANY($1) GROUP BY prescription_id`,
            [rows.map((p) => p.id)],
          );
    const itemCount = new Map(
      counts.map((c) => [c.prescription_id, Number(c.count)]),
    );
    const today = this.clock.today();
    return rows.map((p) => ({
      ...this.header(p, today),
      itemCount: itemCount.get(p.id) ?? 0,
    }));
  }

  async get(actor: Actor, id: string): Promise<PrescriptionView> {
    assertPermission(actor, Permission.PRESCRIPTION_MANAGE);
    return this.view(this.dataSource.manager, id);
  }

  async create(actor: Actor, dto: PrescriptionDto): Promise<PrescriptionView> {
    assertPermission(actor, Permission.PRESCRIPTION_MANAGE);
    const id = await this.dataSource.transaction(async (manager) => {
      const details = await this.checkDetails(manager, dto, null);
      const prescription = await manager.save(
        manager.create(Prescription, {
          ...details,
          status: PrescriptionStatus.RECEIVED,
        }),
      );
      await this.saveItems(manager, prescription.id, dto);
      return prescription.id;
    });
    return this.view(this.dataSource.manager, id);
  }

  /**
   * Replaces the details and items. Any edit returns the prescription to
   * RECEIVED, so it must be reviewed again before dispensing (FR-44).
   */
  async update(
    actor: Actor,
    id: string,
    dto: PrescriptionDto,
  ): Promise<PrescriptionView> {
    assertPermission(actor, Permission.PRESCRIPTION_MANAGE);
    await this.dataSource.transaction(async (manager) => {
      const current = await this.lockPrescription(manager, id);
      PrescriptionValidator.assertEditable(current.status);
      const details = await this.checkDetails(manager, dto, id);
      await manager.delete(PrescriptionItem, { prescription: { id } });
      await manager.update(
        Prescription,
        { id },
        {
          ...details,
          status: PrescriptionStatus.RECEIVED,
          verifiedBy: null,
          verifiedAt: null,
          verificationNote: null,
        },
      );
      await this.saveItems(manager, id, dto);
    });
    return this.view(this.dataSource.manager, id);
  }

  /** Records the pharmacist's professional review (FR-44, DEC-03). */
  async verify(
    actor: Actor,
    id: string,
    dto: VerifyPrescriptionDto,
  ): Promise<PrescriptionView> {
    assertPermission(actor, Permission.PRESCRIPTION_MANAGE);
    await this.dataSource.transaction(async (manager) => {
      const current = await this.lockPrescription(manager, id);
      const prescriber = await manager.findOneByOrFail(Prescriber, {
        id: current.prescriber.id,
      });
      PrescriptionValidator.assertVerifiable(
        {
          status: current.status,
          validUntil: current.validUntil,
          prescriberActive: prescriber.isActive,
        },
        this.clock.today(),
      );
      await manager.update(
        Prescription,
        { id },
        {
          status: PrescriptionStatus.VERIFIED,
          verifiedBy: { id: actor.id },
          verifiedAt: this.clock.now(),
          verificationNote: dto.note ?? null,
        },
      );
    });
    return this.view(this.dataSource.manager, id);
  }

  /**
   * Checks FR-13, FR-14 and the patient and prescriber parts of DEC-03, and
   * returns the columns to store. Every failure is reported per field.
   */
  private async checkDetails(
    manager: EntityManager,
    dto: PrescriptionDto,
    selfId: string | null,
  ) {
    const errors: FieldError[] = [];
    if (dto.issuedDate > this.clock.today()) {
      errors.push({
        field: 'issuedDate',
        message: 'The issue date cannot be in the future.',
      });
    }

    const customer = await manager.findOneBy(Customer, { id: dto.customerId });
    if (!customer) {
      errors.push({ field: 'customerId', message: 'Choose the patient.' });
    } else {
      errors.push(...this.checkPatient(customer, dto));
    }

    // FOR SHARE: a concurrent deactivation waits until this prescription is
    // saved, so the status checked here is still true at commit.
    const prescriber = await manager
      .createQueryBuilder(Prescriber, 'p')
      .where('p.id = :id', { id: dto.prescriberId })
      .setLock('pessimistic_read')
      .getOne();
    if (!prescriber || !prescriber.isActive) {
      errors.push({
        field: 'prescriberId',
        message: prescriber
          ? 'This prescriber is deactivated.'
          : 'Choose the prescriber.',
      });
    }

    const medicineIds = [...new Set(dto.items.map((i) => i.medicineId))];
    const medicines = await manager.findBy(Medicine, { id: In(medicineIds) });
    const known = new Map(medicines.map((m) => [m.id, m]));
    dto.items.forEach((item, index) => {
      const medicine = known.get(item.medicineId);
      if (!medicine || !medicine.isActive) {
        errors.push({
          field: `items.${index}.medicineId`,
          message: medicine
            ? 'This medicine is deactivated.'
            : 'Choose a medicine.',
        });
      }
    });

    if (errors.length > 0) throw new ValidationFailed(errors);
    await this.assertReferenceFree(manager, dto.referenceNumber, selfId);

    return {
      referenceNumber: dto.referenceNumber,
      issuedDate: dto.issuedDate,
      validUntil: PrescriptionValidator.validUntil(dto.issuedDate),
      customer: { id: dto.customerId },
      prescriber: { id: dto.prescriberId },
      patientAgeYears: dto.patientAgeYears ?? null,
      patientAgeMonths: dto.patientAgeMonths ?? null,
      patientWeightKg:
        dto.patientWeightKg == null ? null : dto.patientWeightKg.toFixed(2),
      accompanyingAdult: dto.accompanyingAdult ?? null,
    };
  }

  /**
   * DEC-03: name, an address and a date of birth or age; a child under 72
   * months also needs age in months, weight and the accompanying adult.
   */
  private checkPatient(customer: Customer, dto: PrescriptionDto): FieldError[] {
    const errors: FieldError[] = [];
    if (!customer.address) {
      errors.push({
        field: 'customerId',
        message:
          "The patient's address is required; complete the patient first (DEC-03).",
      });
    }
    const ageMonths = customer.dateOfBirth
      ? monthsBetween(customer.dateOfBirth, dto.issuedDate)
      : (dto.patientAgeMonths ??
        (dto.patientAgeYears == null ? null : dto.patientAgeYears * 12));
    if (ageMonths == null) {
      errors.push({
        field: 'patientAgeYears',
        message: 'Enter the age; the patient has no date of birth.',
      });
    } else if (ageMonths < CHILD_AGE_MONTHS) {
      const required = [
        ['patientAgeMonths', dto.patientAgeMonths, 'Age in months'],
        ['patientWeightKg', dto.patientWeightKg, 'Weight'],
        ['accompanyingAdult', dto.accompanyingAdult, 'The accompanying adult'],
      ] as const;
      for (const [field, value, label] of required) {
        if (value == null) {
          errors.push({
            field,
            message: `${label} is required for a child under 72 months.`,
          });
        }
      }
    }
    return errors;
  }

  private async assertReferenceFree(
    manager: EntityManager,
    referenceNumber: string,
    selfId: string | null,
  ): Promise<void> {
    const other = await manager.findOneBy(Prescription, { referenceNumber });
    if (other && other.id !== selfId) {
      throw new Conflict(
        'DUPLICATE_PRESCRIPTION_REFERENCE',
        `Prescription ${referenceNumber} is already recorded.`,
        'referenceNumber',
      );
    }
  }

  private async saveItems(
    manager: EntityManager,
    prescriptionId: string,
    dto: PrescriptionDto,
  ): Promise<void> {
    await manager.save(
      dto.items.map((item) =>
        manager.create(PrescriptionItem, {
          prescription: { id: prescriptionId },
          medicine: { id: item.medicineId },
          strength: item.strength,
          dose: item.dose,
          route: item.route,
          daysOfUse: item.daysOfUse,
          quantityPrescribed: item.quantityPrescribed,
          quantityDispensed: 0,
        }),
      ),
    );
  }

  /** Locks the prescription row so an edit, a review and a dispensing never interleave. */
  private async lockPrescription(
    manager: EntityManager,
    id: string,
  ): Promise<Prescription> {
    const prescription = await manager
      .createQueryBuilder(Prescription, 'p')
      .leftJoin('p.prescriber', 'prescriber')
      .addSelect('prescriber.id')
      .where('p.id = :id', { id })
      .setLock('pessimistic_write', undefined, ['p'])
      .getOne();
    if (!prescription) throw new NotFound('Prescription', id);
    return prescription;
  }

  private async view(
    manager: EntityManager,
    id: string,
  ): Promise<PrescriptionView> {
    const p = await manager.findOne(Prescription, {
      where: { id },
      relations: {
        customer: true,
        prescriber: true,
        verifiedBy: true,
        items: { medicine: true },
      },
    });
    if (!p) throw new NotFound('Prescription', id);
    const items = [...p.items].sort(
      (a, b) =>
        a.medicine.name.localeCompare(b.medicine.name) ||
        a.id.localeCompare(b.id),
    );
    return {
      ...this.header(p, this.clock.today()),
      patientAgeYears: p.patientAgeYears,
      patientAgeMonths: p.patientAgeMonths,
      patientWeightKg: p.patientWeightKg,
      accompanyingAdult: p.accompanyingAdult,
      verifiedBy: p.verifiedBy
        ? { id: p.verifiedBy.id, fullName: p.verifiedBy.fullName }
        : null,
      verifiedAt: p.verifiedAt,
      verificationNote: p.verificationNote,
      items: items.map((item) => ({
        id: item.id,
        medicine: {
          id: item.medicine.id,
          code: item.medicine.code,
          name: item.medicine.name,
          classification: item.medicine.classification,
        },
        strength: item.strength,
        dose: item.dose,
        route: item.route,
        daysOfUse: item.daysOfUse,
        quantityPrescribed: item.quantityPrescribed,
        quantityDispensed: item.quantityDispensed,
        quantityOutstanding: item.quantityPrescribed - item.quantityDispensed,
      })),
    };
  }

  private header(p: Prescription, today: string) {
    return {
      id: p.id,
      referenceNumber: p.referenceNumber,
      issuedDate: p.issuedDate,
      validUntil: p.validUntil,
      isExpired: PrescriptionValidator.isExpired(p.validUntil, today),
      status: p.status,
      customer: {
        id: p.customer.id,
        code: p.customer.code,
        fullName: p.customer.fullName,
      },
      prescriber: {
        id: p.prescriber.id,
        licenceNumber: p.prescriber.licenceNumber,
        fullName: p.prescriber.fullName,
      },
      createdAt: p.createdAt,
    };
  }
}
