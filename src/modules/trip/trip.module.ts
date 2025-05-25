import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TripController } from '@/modules/trip/trip.controller';
import { TripService } from '@/modules/trip/trip.service';
import { Trip } from '@/modules/trip/trip.entity';
import { SpaceshipModule } from '@/modules/spaceship/spaceship.module';
import { LocationModule } from '@/modules/location/location.module';
import { TripRepository } from '@/modules/trip/trip.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Trip]), SpaceshipModule, LocationModule],
  controllers: [TripController],
  providers: [TripService, TripRepository],
  exports: [TripService],
})
export class TripModule {}
