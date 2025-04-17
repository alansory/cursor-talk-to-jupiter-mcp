import * as dotenv from 'dotenv';

dotenv.config();

export const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || '';
export const WALLET_PUBLIC_KEY = process.env.WALLET_PUBLIC_KEY || '';
export const JUPITER_API_URL = process.env.JUPITER_API_URL || 'https://lite-jup.ag/swap/v1';