import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseConfig } from './config/database.config';
import { SpaceshipModule } from '@/modules/spaceship/spaceship.module';
import { TripModule } from '@/modules/trip/trip.module';
import { LocationModule } from '@/modules/location/location.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => getDatabaseConfig(configService),
    }),
    TripModule,
    SpaceshipModule,
    LocationModule,
    ScheduleModule.forRoot(),
  ],
})
export class AppModule {}
