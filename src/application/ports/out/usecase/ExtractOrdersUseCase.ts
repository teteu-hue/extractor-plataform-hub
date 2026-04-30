export interface ExtractOrdersCommand {
  dateFrom: Date;
  dateTo: Date;
  sellerId: string;
}

export interface ExtractOrdersResult {
  count: number;
  summary: {
    totalAmount: number;
    totalItems: number;
    totalOrders: number;
  };
}

export abstract class IExtractOrdersUseCase {
  abstract execute(command: ExtractOrdersCommand): Promise<ExtractOrdersResult>;
}
