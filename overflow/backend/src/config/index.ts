import dotenv from 'dotenv';
dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[Config] Required environment variable ${name} is not set. Server cannot start.`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  databaseUrl: requireEnv('DATABASE_URL'),
  cricketApi: {
    key: process.env.CRICKET_API_KEY || '',
    url: process.env.CRICKET_API_URL || 'https://api.cricapi.com/v1',
  },
  rpcUrl: process.env.RPC_URL || 'https://evm.wirefluid.com',
  factoryAddress: process.env.FACTORY_ADDRESS || '0x7FB2270dC9aBBaEfE37e12fdC177Af543646b3e6',
  oracleAddress: process.env.ORACLE_ADDRESS || '0xDd3b0e06374ac97EB8043aEB78946DAEe5E165cF',
};
