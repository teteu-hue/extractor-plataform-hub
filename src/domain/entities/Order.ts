import { InvalidOrderError } from '@domain/errors/DomainError';
import { OrderId } from '../value-objects/OrderId';
import { OrderStatus } from '../value-objects/OrderStatus';

export interface OrderItem {
  readonly title: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly currencyId: string;
}

export interface CreateOrderProps {
  id: OrderId;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  currencyId: string;
  dateCreated: Date;
  lastUpdated: Date;
}

export class Order {
  private readonly _id: OrderId;
  private readonly _status: OrderStatus;
  private readonly _items: readonly OrderItem[];
  private readonly _totalAmount: number;
  private readonly _currencyId: string;
  private readonly _dateCreated: Date;
  private readonly _lastUpdated: Date;

  private constructor(props: CreateOrderProps) {
    this._id = props.id;
    this._status = props.status;
    this._items = props.items;
    this._totalAmount = props.totalAmount;
    this._currencyId = props.currencyId;
    this._dateCreated = props.dateCreated;
    this._lastUpdated = props.lastUpdated;
  }

  static create(props: CreateOrderProps): Order {

    if (props.items.length === 0) {
      throw new InvalidOrderError('Order must have at least one item');
    }

    if (props.totalAmount <= 0) {
      throw new InvalidOrderError('Order total amount must be greater than 0');
    }

    if (!props.currencyId) {
      throw new InvalidOrderError('Order currency ID is required');
    }

    if (!props.dateCreated) {
      throw new InvalidOrderError('Order date created is required');
    }

    if (!props.lastUpdated) {
      throw new InvalidOrderError('Order last updated is required');
    }

    return new Order(props);
  }

  get id(): OrderId {
    return this._id;
  }

  get status(): OrderStatus {
    return this._status;
  }
  get items(): readonly OrderItem[] {
    return this._items;
  }
  get totalAmount(): number {
    return this._totalAmount;
  }
  get currencyId(): string {
    return this._currencyId;
  }
  get dateCreated(): Date {
    return this._dateCreated;
  }
  get lastUpdated(): Date {
    return this._lastUpdated;
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this._id.getValue(),
      status: this._status,
      items: this._items,
      totalAmount: this._totalAmount,
      currencyId: this._currencyId,
      dateCreated: this._dateCreated.toISOString(),
      lastUpdated: this._lastUpdated.toISOString(),
    };
  }
}
