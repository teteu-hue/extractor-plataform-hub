import { InvalidOrderIdError } from '../errors/DomainError';

export class OrderId {
  private _id: number;

  private constructor(id: number) {
    this._id = id;
  }

  static create(id: number): OrderId {
    if (!Number.isFinite(id) || id <= 0 || !Number.isInteger(id)) {
      throw new InvalidOrderIdError(String(id));
    }
    return new OrderId(id);
  }

  get id(): number {
    return this._id;
  }

  equals(other: OrderId): boolean {
    return this._id === other._id;
  }

  toString(): string {
    return String(this._id);
  }
}
