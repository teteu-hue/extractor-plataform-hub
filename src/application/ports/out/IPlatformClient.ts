export interface IPlatformClient {
  readonly platformName: string;
  fetchOrders(params: {}): Promise<{}>;
  authenticate(credentials: {}): Promise<{}>;
}
