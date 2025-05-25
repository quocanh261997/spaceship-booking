import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const configService = new ConfigService();

const databaseUrl = configService.get<string>('DB_URL');
if (!databaseUrl) {
  throw new Error('DB_URL environment variable is not defined');
}

const url = new URL(databaseUrl);
const isSSL = url.searchParams.get('sslmode') === 'require';

const baseConfig: DataSourceOptions = {
  type: 'postgres',
  url: databaseUrl,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  //logging: configService.get<string>('NODE_ENV') === 'development',
  ssl: isSSL ? { rejectUnauthorized: false } : false,
};

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions =>
  ({
    ...baseConfig,
    synchronize: configService.get<string>('NODE_ENV') !== 'production',
  }) as TypeOrmModuleOptions;

let dataSource: DataSource;

export const getDataSource = (): DataSource => {
  if (!dataSource) {
    dataSource = new DataSource({
      ...baseConfig,
      migrations: [__dirname + '/../migrations/*{.ts,.js}'],
      migrationsRun: false,
    });
  }
  return dataSource;
};

export default getDataSource();
