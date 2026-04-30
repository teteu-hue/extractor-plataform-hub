import { InvalidOrderError, InvalidPlatformNotImplementedError } from '@domain/errors/DomainError';
import { OrderId } from '../value-objects/OrderId';
import { OrderStatus } from '../value-objects/OrderStatus';
import { OrderItem } from '../value-objects/OrderItem';
import { CreateOrderProps } from '../value-objects/CreateOrderProps';
import { PlatformEnum } from '../value-objects/Platform';
import { Client } from '@domain/value-objects/Client';

/**
 * Entidade de domínio que representa um pedido (Order).
 *
 * A classe é **imutável** — todos os campos são `private readonly` e expostos
 * apenas por getters. Os campos privados usam o prefixo `_` para evitar
 * conflito de nome com os getters públicos (ex.: `_id` vs `get id()`).
 *
 * O constructor é **privado**; a única forma de obter uma instância é pelo
 * factory method {@link Order.create}. Isso garante que toda Order existente
 * no sistema já passou pela validação — é impossível criar uma instância em
 * estado inválido.
 *
 * @example
 * ```ts
 * const order = Order.create({
 *   id: OrderId.create(1),
 *   status: OrderStatus.PAID,
 *   items: [{ title: 'Camiseta', quantity: 1, unitPrice: 59.9, currencyId: 'BRL' }, { title: 'Camiseta', quantity: 1, unitPrice: 59.9, currencyId: 'BRL' }],
 *   externalOrderId: 'MLB-123',
 *   platform: PlatformEnum.MERCADOLIVRE,
 *   totalAmount: 119.8,
 *   currencyId: 'BRL',
 *   dateCreated: new Date(),
 *   lastUpdated: new Date(),  
 * });
 * ```
 */
export class Order {
  private readonly _id: OrderId;
  private readonly _status: OrderStatus;
  private readonly _items: readonly OrderItem[];
  private readonly _platform: PlatformEnum;
  private readonly _client: Client;
  private readonly _totalAmount: number;
  private readonly _externalOrderId: string;
  private readonly _currencyId: string;
  private readonly _dateCreated: Date;
  private readonly _lastUpdated: Date;

  /**
   * Constructor privado — impede `new Order(...)` fora da classe,
   * forçando toda criação a passar por {@link Order.create}.
   */
  private constructor(props: CreateOrderProps) {
    this._id = props.id;
    this._status = props.status;
    this._items = props.items;
    this._platform = props.platform;
    this._client = props.client;
    this._totalAmount = props.totalAmount;
    this._externalOrderId = props.externalOrderId;
    this._currencyId = props.currencyId;
    this._dateCreated = props.dateCreated;
    this._lastUpdated = props.lastUpdated;
  }

  /**
   * Factory method — único ponto de criação de uma Order.
   * Valida as props antes de instanciar; se inválidas, lança {@link InvalidOrderError}.
   *
   * @throws {InvalidOrderError} Quando as props não atendem às regras de negócio.
   */
  static create(props: CreateOrderProps): Order {

    if (!this._validate(props)) {
      throw new InvalidOrderError('Invalid order');
    }

    return new Order(props);
  }

  /**
   * Valida as invariantes de negócio:
   * - Pelo menos um item
   * - Total maior que zero
   * - Moeda, data de criação e última atualização obrigatórias
   */
  private static _validate(props: CreateOrderProps): boolean {
    try {
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
      if (!Object.values(PlatformEnum).includes(props.platform)) {
        throw new InvalidPlatformNotImplementedError(`Platform ${String(props.platform)} is not implemented`);
      }
      if (!props.externalOrderId || props.externalOrderId.trim() === '') {
        throw new InvalidOrderError('Order external order ID is required');
      }
      return true;
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      return false;
    }
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
  get platform(): PlatformEnum {
    return this._platform;
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
  get externalOrderId(): string {
    return this._externalOrderId;
  }
  get client(): Client {
    return this._client;
  }

  /** Serializa a entidade para um objeto plano (útil para persistência / API). */
  toJSON(): Record<string, unknown> {
    return {
      id: this._id.id,
      status: this._status,
      items: this._items,
      platform: this._platform,
      client: this._client,
      externalOrderId: this._externalOrderId,
      totalAmount: this._totalAmount,
      currencyId: this._currencyId,
      dateCreated: this._dateCreated.toISOString(),
      lastUpdated: this._lastUpdated.toISOString(),
    };
  }
}
