export interface MercadoLivreConfigDto {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number; // || SELLER_ID
  refresh_token: string;
}

export interface MercadoLivreOrderItemDto {
  item: {
    id: string;
    title: string;
    category_id: string;
  };
  quantity: number;
  unit_price: number;
  total_amount: number;
  currency_id: string;
}

