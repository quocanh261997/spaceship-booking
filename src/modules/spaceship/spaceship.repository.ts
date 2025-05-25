import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Spaceship } from '@/modules/spaceship/spaceship.entity';

@Injectable()
export class SpaceshipRepository extends Repository<Spaceship> {
  constructor(private dataSource: DataSource) {
    super(Spaceship, dataSource.createEntityManager());
  }
}
