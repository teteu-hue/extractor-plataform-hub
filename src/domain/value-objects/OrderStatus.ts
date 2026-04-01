export enum OrderStatus {
  ML_CONFIRMED = 'confirmed',
  ML_PAYMENT_REQUIRED = 'payment_required',
  ML_PAYMENT_IN_PROCESS = 'payment_in_process',
  ML_PAID = 'paid',
  ML_CANCELLED = 'cancelled',
  ML_INVALID = 'invalid',
}

const VALID_STATUSES = new Set<string>(Object.values(OrderStatus));

export function isValidOrderStatus(value: string): boolean {
  return VALID_STATUSES.has(value);
}

export function parseOrderStatus(value: string): OrderStatus {
  if (!isValidOrderStatus(value)) {
    throw new Error(
      `Unknown order status: "${value}". Must be one of: ${Array.from(VALID_STATUSES).join(', ')}.`,
    );
  }
  return value as OrderStatus;
}
