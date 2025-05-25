import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Location } from '@/modules/location/location.entity';

@Injectable()
export class LocationRepository extends Repository<Location> {
  constructor(private dataSource: DataSource) {
    super(Location, dataSource.createEntityManager());
  }
}
