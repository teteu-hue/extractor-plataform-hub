import { InvalidOrderIdError } from '../errors/DomainError';

export class OrderId {
  private value: number;

  private constructor(value: number) {
    this.value = value;
  }

  static create(value: number): OrderId {
    if (!Number.isFinite(value) || value <= 0 || !Number.isInteger(value)) {
      throw new InvalidOrderIdError(String(value));
    }
    return new OrderId(value);
  }

  getValue(): number {
    return this.value;
  }

  equals(other: OrderId): boolean {
    return this.getValue() === other.getValue();
  }

  toString(): string {
    return String(this.value);
  }
}
