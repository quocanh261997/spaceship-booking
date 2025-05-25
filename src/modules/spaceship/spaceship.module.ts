import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpaceshipService } from '@/modules/spaceship/spaceship.service';
import { Spaceship } from '@/modules/spaceship/spaceship.entity';
import { Trip } from '@/modules/trip/trip.entity';
import { SpaceshipRepository } from '@/modules/spaceship/spaceship.repository';
import { TripRepository } from '@/modules/trip/trip.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Spaceship, Trip])],
  providers: [SpaceshipService, SpaceshipRepository, TripRepository],
  exports: [SpaceshipService],
})
export class SpaceshipModule {}
