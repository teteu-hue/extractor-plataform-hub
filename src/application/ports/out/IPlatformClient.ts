import { Order } from "@domain/entities/Order";

export abstract class IPlatformClient {
  abstract readonly platformName: string;
  abstract fetchOrders(params: FetchOrdersParams): Promise<Order[]>;
  abstract authenticate(credentials: []): void;
}

export interface FetchOrdersParams {
  dateFrom: Date;
  dateTo: Date;
  sellerId: string;
}
