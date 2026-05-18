import { IPlatformClient } from "@application/ports/out/IPlatformClient";
import { ExtractOrdersCommand, ExtractOrdersResult, IExtractOrdersUseCase } from "@application/ports/out/usecase/ExtractOrdersUseCase";
import { Injectable } from "@nestjs/common";

@Injectable()
export class ExtractOrdersMercadoLivreUseCase implements IExtractOrdersUseCase {
  constructor(private readonly platformClient: IPlatformClient) {}

  async execute(command: ExtractOrdersCommand): Promise<ExtractOrdersResult> {
    const orders = await this.platformClient.fetchOrders(command);
    
    if (orders.length === 0) {
      return {
        count: 0,
        summary: {
          totalAmount: 0,
          totalItems: 0,
          totalOrders: 0,
        },
      };
    }

    return {
      count: orders.length,
      summary: {
        totalAmount: orders.reduce((acc, order) => acc + order.totalAmount, 0),
        totalItems: orders.reduce((acc, order) => acc + order.items.length, 0),
        totalOrders: orders.length,
      },
    };
  }
}
