import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Trip } from '@/modules/trip/trip.entity';

@Injectable()
export class TripRepository extends Repository<Trip> {
  constructor(private dataSource: DataSource) {
    super(Trip, dataSource.createEntityManager());
  }
}
