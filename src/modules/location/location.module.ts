import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationService } from '@modules/location/location.service';
import { Location } from '@modules/location/location.entity';
import { LocationRepository } from '@modules/location/location.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Location])],
  providers: [LocationService, LocationRepository],
  exports: [LocationService],
})
export class LocationModule {}
