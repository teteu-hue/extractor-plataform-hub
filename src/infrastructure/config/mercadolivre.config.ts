import { registerAs } from '@nestjs/config';

export default registerAs('mercadolivre', () => ({
  clientId: process.env.MERCADOLIVRE_CLIENT_ID,
  clientSecret: process.env.MERCADOLIVRE_CLIENT_SECRET,
  redirectUri: process.env.MERCADOLIVRE_REDIRECT_URI,
  baseUrl: process.env.MERCADOLIVRE_BASE_URL,
}));