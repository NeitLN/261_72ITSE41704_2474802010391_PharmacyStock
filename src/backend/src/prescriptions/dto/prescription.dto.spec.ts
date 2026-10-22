import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { DispenseDto } from '../../dispensing/dto/dispense.dto.js';
import { toFieldErrors } from '../../common/validation.js';
import { PrescriptionDto } from './prescription.dto.js';

async function errorsOf<T extends object>(cls: new () => T, plain: object) {
  const dto = plainToInstance(cls, plain);
  const errors = await validate(dto, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return { dto, fields: toFieldErrors(errors).map((e) => e.field) };
}

const MEDICINE = '7f0c3a52-3a3e-4b8e-9a64-1f1b2f5d8c01';
const CUSTOMER = '0b6f1c9e-5d7a-4c3b-8e2f-6a9d4b1c2e03';
const PRESCRIBER = '5e8a2d4c-9b1f-4a7e-b3c6-2d8f0e1a4b05';

const item = {
  medicineId: MEDICINE,
  strength: ' 500 mg ',
  quantityPrescribed: 20,
  dose: '1 tablet twice a day',
  route: 'oral',
  daysOfUse: 10,
};

const prescription = {
  referenceNumber: ' RX-0001 ',
  issuedDate: '2026-10-13',
  customerId: CUSTOMER,
  prescriberId: PRESCRIBER,
  patientAgeYears: 45,
  items: [item],
};

describe('Prescription DTO validation (FR-13, FR-14)', () => {
  it('UC05-U11 accepts a complete prescription and trims its text', async () => {
    const { dto, fields } = await errorsOf(PrescriptionDto, prescription);
    expect(fields).toEqual([]);
    expect(dto.referenceNumber).toBe('RX-0001');
    expect(dto.items[0].strength).toBe('500 mg');
  });

  it('UC05-U12 requires at least one item', async () => {
    const { fields } = await errorsOf(PrescriptionDto, {
      ...prescription,
      items: [],
    });
    expect(fields).toEqual(['items']);
  });

  it('UC05-U13 refuses an item with a missing field or a quantity of zero', async () => {
    const { fields } = await errorsOf(PrescriptionDto, {
      ...prescription,
      items: [{ ...item, dose: '   ', quantityPrescribed: 0 }],
    });
    expect(fields).toEqual(
      expect.arrayContaining(['items.0.dose', 'items.0.quantityPrescribed']),
    );
  });

  it('UC05-U14 refuses a partial issue date and a computed valid-until sent by the client', async () => {
    const { fields } = await errorsOf(PrescriptionDto, {
      ...prescription,
      issuedDate: '2026-10',
      validUntil: '2026-12-31',
    });
    expect(fields).toEqual(
      expect.arrayContaining(['issuedDate', 'validUntil']),
    );
  });

  it('UC05-U15 records age in months only under 72 months', async () => {
    const { fields } = await errorsOf(PrescriptionDto, {
      ...prescription,
      patientAgeMonths: 72,
    });
    expect(fields).toEqual(['patientAgeMonths']);
  });
});

describe('Dispense DTO validation (FR-23)', () => {
  const dispense = {
    requestId: '9c1d2e3f-4a5b-4c6d-8e7f-0a1b2c3d4e5f',
    prescriptionId: '3a4b5c6d-7e8f-4a0b-9c1d-2e3f4a5b6c7d',
    items: [
      {
        prescriptionItemId: '1b2c3d4e-5f6a-4b7c-8d9e-0f1a2b3c4d5e',
        quantity: 7,
      },
    ],
  };

  it('UC06-U1 accepts a hand-over and requires a request ID', async () => {
    expect((await errorsOf(DispenseDto, dispense)).fields).toEqual([]);
    const { requestId: _omitted, ...withoutId } = dispense;
    expect((await errorsOf(DispenseDto, withoutId)).fields).toEqual([
      'requestId',
    ]);
  });

  it('UC06-U2 refuses a client-chosen batch and a quantity below one', async () => {
    const { fields } = await errorsOf(DispenseDto, {
      ...dispense,
      items: [{ ...dispense.items[0], quantity: 0, batchId: MEDICINE }],
    });
    expect(fields).toEqual(
      expect.arrayContaining(['items.0.quantity', 'items.0.batchId']),
    );
  });
});
