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
  entities:
    process.env.NODE_ENV === 'production'
      ? ['dist/**/*.entity{.js,.ts}']
      : ['src/**/*.entity{.ts,.js}', 'dist/**/*.entity{.js,.ts}'],
  migrations:
    process.env.NODE_ENV === 'production'
      ? ['dist/migrations/*{.js,.ts}']
      : ['src/migrations/*{.ts,.js}', 'dist/migrations/*{.js,.ts}'],
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
