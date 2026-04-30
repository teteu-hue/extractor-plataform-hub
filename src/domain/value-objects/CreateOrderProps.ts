import { OrderId } from './OrderId';
import { OrderStatus } from './OrderStatus';
import { OrderItem } from './OrderItem';
import { PlatformEnum } from './Platform';
import { Client } from './Client';

/**
 * Propriedades necessárias para criar uma instância de {@link Order}.
 *
 * @param id - Identificador único do pedido ({@link OrderId}).
 * @param status - Status atual do pedido ({@link OrderStatus}).
 * @param items - Lista de itens do pedido (mínimo 1).
 * @param totalAmount - Valor total do pedido (deve ser maior que 0).
 * @param currencyId - Código da moeda (ex.: "BRL", "USD").
 * @param dateCreated - Data de criação do pedido.
 * @param lastUpdated - Data da última atualização do pedido.
 */
export interface CreateOrderProps {
  id: OrderId;
  status: OrderStatus;
  items: OrderItem[];
  externalOrderId: string;
  platform: PlatformEnum;
  client: Client;
  totalAmount: number;
  currencyId: string;
  dateCreated: Date;
  lastUpdated: Date;
}
