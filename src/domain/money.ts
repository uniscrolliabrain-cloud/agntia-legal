import { LegalError } from './errors.js';
import type { Money } from './ids.js';

function assertSameCurrency(left: Money, right: Money): void {
  if (left.currency !== right.currency) {
    throw new LegalError('INVALID_INPUT', 'Cannot combine different currencies', {
      details: { left: left.currency, right: right.currency },
    });
  }
}

function scale(money: Money, exponent: number): bigint {
  const negative = money.amount.startsWith('-');
  const raw = negative ? money.amount.slice(1) : money.amount;
  const [integerPart = '0', fractionPart = ''] = raw.split('.');
  if (fractionPart.length > exponent) {
    throw new LegalError('INVALID_INPUT', 'Amount has more decimals than the target exponent', {
      details: { amount: money.amount, exponent },
    });
  }
  const digits = `${integerPart}${fractionPart.padEnd(exponent, '0')}`;
  const value = BigInt(digits);
  return negative ? -value : value;
}

function format(minor: bigint, exponent: number, currency: string): Money {
  const negative = minor < 0n;
  const digits = (negative ? -minor : minor).toString().padStart(exponent + 1, '0');
  const integerPart = digits.slice(0, digits.length - exponent) || '0';
  const fractionPart = exponent > 0 ? digits.slice(digits.length - exponent) : '';
  const amount = `${negative ? '-' : ''}${integerPart}${fractionPart ? `.${fractionPart}` : ''}`;
  return { amount, currency, exponent };
}

export function compareMoney(left: Money, right: Money): number {
  assertSameCurrency(left, right);
  const exponent = Math.max(left.exponent, right.exponent);
  const a = scale(left, exponent);
  const b = scale(right, exponent);
  return a === b ? 0 : a > b ? 1 : -1;
}

export function addMoney(left: Money, right: Money): Money {
  assertSameCurrency(left, right);
  const exponent = Math.max(left.exponent, right.exponent);
  return format(scale(left, exponent) + scale(right, exponent), exponent, left.currency);
}

export function subtractMoney(left: Money, right: Money): Money {
  assertSameCurrency(left, right);
  const exponent = Math.max(left.exponent, right.exponent);
  return format(scale(left, exponent) - scale(right, exponent), exponent, left.currency);
}

export function isPositive(money: Money): boolean {
  return money.amount !== '0' && !money.amount.startsWith('-') && /[1-9]/.test(money.amount);
}
