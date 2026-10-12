import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { type Actor, assertPermission } from '../auth/actor.js';
import { Permission } from '../auth/permissions.js';
import { NotFound } from '../common/errors.js';
import { likePattern } from '../common/transforms.js';
import { Supplier } from '../entities/index.js';
import type {
  CreateSupplierDto,
  ListSuppliersQuery,
  UpdateSupplierDto,
} from './dto/supplier.dto.js';

/**
 * UC02 Manage suppliers (FR-05). The reference slice: every public method
 * takes the actor and checks the permission before touching data.
 */
@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly suppliers: Repository<Supplier>,
  ) {}

  async list(actor: Actor, query: ListSuppliersQuery): Promise<Supplier[]> {
    assertPermission(actor, Permission.SUPPLIER_MANAGE);

    const qb = this.suppliers.createQueryBuilder('s').orderBy('s.name', 'ASC');
    if (!query.includeInactive) {
      qb.andWhere('s.isActive = true');
    }
    if (query.search) {
      qb.andWhere('(s.name ILIKE :pattern OR s.phone ILIKE :pattern)', {
        pattern: likePattern(query.search),
      });
    }
    return qb.getMany();
  }

  async get(actor: Actor, id: string): Promise<Supplier> {
    assertPermission(actor, Permission.SUPPLIER_MANAGE);
    return this.findOrFail(id);
  }

  async create(actor: Actor, dto: CreateSupplierDto): Promise<Supplier> {
    assertPermission(actor, Permission.SUPPLIER_MANAGE);
    const supplier = this.suppliers.create({
      name: dto.name,
      phone: dto.phone,
      address: dto.address ?? null,
      contactPerson: dto.contactPerson ?? null,
      email: dto.email ?? null,
    });
    return this.suppliers.save(supplier);
  }

  async update(
    actor: Actor,
    id: string,
    dto: UpdateSupplierDto,
  ): Promise<Supplier> {
    assertPermission(actor, Permission.SUPPLIER_MANAGE);
    await this.findOrFail(id);
    // Write only the columns the request sent, so a concurrent change to
    // another column (e.g. a deactivation) is never overwritten by a stale copy.
    const changes: Partial<Supplier> = {};
    if (dto.name !== undefined) changes.name = dto.name;
    if (dto.phone !== undefined) changes.phone = dto.phone;
    if (dto.address !== undefined) changes.address = dto.address;
    if (dto.contactPerson !== undefined)
      changes.contactPerson = dto.contactPerson;
    if (dto.email !== undefined) changes.email = dto.email;
    if (Object.keys(changes).length > 0) {
      await this.suppliers.update({ id }, changes);
    }
    return this.findOrFail(id);
  }

  /**
   * UC02 alternative flow 1a: a deactivated supplier stays in history but can
   * no longer be chosen on a new goods receipt (checked by UC03).
   */
  async setActive(
    actor: Actor,
    id: string,
    active: boolean,
  ): Promise<Supplier> {
    assertPermission(actor, Permission.SUPPLIER_MANAGE);
    await this.findOrFail(id);
    await this.suppliers.update({ id }, { isActive: active });
    return this.findOrFail(id);
  }

  private async findOrFail(id: string): Promise<Supplier> {
    const supplier = await this.suppliers.findOneBy({ id });
    if (!supplier) throw new NotFound('Supplier', id);
    return supplier;
  }
}
