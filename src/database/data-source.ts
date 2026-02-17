import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 👇 Load environment variables based on NODE_ENV
dotenv.config({
  path: path.resolve(process.cwd(), `.env`),
});

export const config: DataSourceOptions = {
  type: 'postgres',
  database: process.env.DB_NAME,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
  entities: ['dist/**/*.entity{.ts,.js}'],
  migrations: ['dist/migrations/*{.ts,.js}'],
  synchronize: false,
  poolSize: 5,
  extra: {
    max: 5,
    connectionTimeoutMillis: 5000, // Reduced timeout
    idleTimeoutMillis: 10000, // Reduced idle timeout
  },
  cache: {
    duration: 30000,
  },
};
export const AppDataSource = new DataSource(config as DataSourceOptions);
