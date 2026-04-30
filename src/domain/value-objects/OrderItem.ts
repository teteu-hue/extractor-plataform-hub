/** Representa um item individual dentro de um pedido. */
export interface OrderItem {
  readonly title: string;
  readonly quantity: number;
  readonly unitPrice: number;
  readonly currencyId: string;
}
