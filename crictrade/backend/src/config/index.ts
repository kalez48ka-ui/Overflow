import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/crictrade',
  cricketApi: {
    key: process.env.CRICKET_API_KEY || '',
    url: process.env.CRICKET_API_URL || 'https://api.cricapi.com/v1',
  },
  rpcUrl: process.env.RPC_URL || 'https://testnet-rpc.wirefluid.com',
  oraclePrivateKey: process.env.ORACLE_PRIVATE_KEY || '',
  factoryAddress: process.env.FACTORY_ADDRESS || '',
};
