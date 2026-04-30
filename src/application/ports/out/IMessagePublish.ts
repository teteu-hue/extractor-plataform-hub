export interface IMessagePublisher {
  publish(routingKey: string, message: unknown): Promise<void>;
  close(): Promise<void>;
}
