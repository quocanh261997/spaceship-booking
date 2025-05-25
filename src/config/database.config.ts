import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create a new ConfigService instance for use outside of NestJS
const configService = new ConfigService();

// Get the database URL from environment variables
const databaseUrl = configService.get<string>('DB_URL');
if (!databaseUrl) {
  throw new Error('DB_URL environment variable is not defined');
}

// Parse the database URL to extract components
const url = new URL(databaseUrl);
const isSSL = url.searchParams.get('sslmode') === 'require';

/**
 * Base database configuration
 */
const baseConfig: DataSourceOptions = {
  type: 'postgres',
  url: databaseUrl,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  logging: configService.get<string>('NODE_ENV') === 'development',
  ssl: isSSL ? { rejectUnauthorized: false } : false,
};

/**
 * Get database configuration for NestJS TypeORM module
 */
export const getDatabaseConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  ...baseConfig,
  // NestJS specific options
  synchronize: configService.get<string>('NODE_ENV') !== 'production',
} as TypeOrmModuleOptions);

/**
 * Get TypeORM DataSource instance for migrations and CLI
 */
let dataSource: DataSource;

export const getDataSource = (): DataSource => {
  if (!dataSource) {
    dataSource = new DataSource({
      ...baseConfig,
      // Migration specific options
      migrations: [__dirname + '/../migrations/*{.ts,.js}'],
      migrationsRun: false,
    });
  }
  return dataSource;
};

// Export the data source for TypeORM CLI
export default getDataSource();
