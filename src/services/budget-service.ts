import { randomUUID } from 'node:crypto';
import type { Repository } from '../core/ports.js';
import { budgetReservationSchema, type BudgetReservation } from '../domain/entities.js';
import { LegalError } from '../domain/errors.js';
import type { Money } from '../domain/ids.js';
import { addMoney, compareMoney, isPositive } from '../domain/money.js';
import { parseStrict } from '../domain/validate.js';

export interface BudgetState {
  ceiling: Money;
  /** Expenditure that existed before this service started tracking. */
  spent: Money;
}

export interface ReserveInput {
  tenantId: string;
  operationKey: string;
  amount: Money;
}

export interface ReserveResult {
  reservation: BudgetReservation;
  replayed: boolean;
}

/**
 * Budgets are reserved, not guessed: the sum of baseline spend plus consumed
 * and reserved amounts must stay within the ceiling. The operation key makes
 * the reservation idempotent, so a retry cannot spend twice.
 */
export class BudgetService {
  private readonly budgets = new Map<string, BudgetState>();

  constructor(private readonly reservations: Repository<BudgetReservation>) {}

  setBudget(tenantId: string, ceiling: Money, spent?: Money): void {
    this.budgets.set(tenantId, {
      ceiling,
      spent: spent ?? { amount: '0', currency: ceiling.currency, exponent: ceiling.exponent },
    });
  }

  getBudget(tenantId: string): BudgetState | null {
    const budget = this.budgets.get(tenantId);
    return budget ? { ceiling: { ...budget.ceiling }, spent: { ...budget.spent } } : null;
  }

  async reserve(input: ReserveInput, now: Date): Promise<ReserveResult> {
    const budget = this.budgets.get(input.tenantId);
    if (!budget) {
      throw new LegalError('BLOCKED', 'No budget configured for this tenant', {
        details: { reason: 'BUDGET_NOT_CONFIGURED' },
      });
    }
    if (!isPositive(input.amount)) {
      throw new LegalError('INVALID_INPUT', 'Reservation amount must be positive');
    }

    const existing = (await this.reservations.list(input.tenantId)).find(
      (reservation) => reservation.operationKey === input.operationKey,
    );
    if (existing) {
      if (compareMoney(existing.amount, input.amount) !== 0) {
        throw new LegalError('CONFLICT', 'Operation key was reused with another amount', {
          details: { reason: 'OPERATION_KEY_REUSED' },
        });
      }
      return { reservation: existing, replayed: true };
    }

    const committed = (await this.reservations.list(input.tenantId))
      .filter((reservation) => reservation.status === 'reserved' || reservation.status === 'consumed')
      .reduce(
        (total, reservation) =>
          addMoney(
            total,
            reservation.status === 'consumed'
              ? (reservation.consumedAmount ?? reservation.amount)
              : reservation.amount,
          ),
        budget.spent,
      );

    if (compareMoney(addMoney(committed, input.amount), budget.ceiling) > 0) {
      throw new LegalError('BLOCKED', 'Budget ceiling exceeded', {
        details: { reason: 'BUDGET_EXCEEDED' },
      });
    }

    const timestamp = now.toISOString();
    const reservation = parseStrict(
      budgetReservationSchema,
      {
        id: `bgr_${randomUUID()}`,
        tenantId: input.tenantId,
        version: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
        operationKey: input.operationKey,
        amount: input.amount,
        status: 'reserved',
        consumedAmount: null,
      },
      'budget reservation',
    );

    return { reservation: await this.reservations.create(reservation), replayed: false };
  }

  async consume(
    tenantId: string,
    reservationId: string,
    actual: Money,
    now: Date,
  ): Promise<BudgetReservation> {
    const reservation = await this.load(tenantId, reservationId);
    if (reservation.status !== 'reserved') {
      throw new LegalError('BLOCKED', 'Only a reserved budget can be consumed', {
        details: { reason: 'RESERVATION_NOT_RESERVED', status: reservation.status },
      });
    }
    if (compareMoney(actual, reservation.amount) > 0) {
      throw new LegalError('BLOCKED', 'Actual cost exceeds the reservation', {
        details: { reason: 'ACTUAL_EXCEEDS_RESERVATION' },
      });
    }
    const timestamp = now.toISOString();
    return this.reservations.update(
      parseStrict(
        budgetReservationSchema,
        {
          ...reservation,
          status: 'consumed',
          consumedAmount: actual,
          version: reservation.version + 1,
          updatedAt: timestamp,
        },
        'budget consumption',
      ),
      reservation.version,
    );
  }

  async release(tenantId: string, reservationId: string, now: Date): Promise<BudgetReservation> {
    const reservation = await this.load(tenantId, reservationId);
    if (reservation.status !== 'reserved') {
      throw new LegalError('BLOCKED', 'Only a reserved budget can be released', {
        details: { reason: 'RESERVATION_NOT_RESERVED', status: reservation.status },
      });
    }
    const timestamp = now.toISOString();
    return this.reservations.update(
      parseStrict(
        budgetReservationSchema,
        {
          ...reservation,
          status: 'released',
          version: reservation.version + 1,
          updatedAt: timestamp,
        },
        'budget release',
      ),
      reservation.version,
    );
  }

  private async load(tenantId: string, reservationId: string): Promise<BudgetReservation> {
    const reservation = await this.reservations.get(tenantId, reservationId);
    if (!reservation) {
      throw new LegalError('NOT_FOUND', 'Budget reservation not found', {
        details: { reason: 'RESERVATION_NOT_FOUND' },
      });
    }
    return reservation;
  }
}
