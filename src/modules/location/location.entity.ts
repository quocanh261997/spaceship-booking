import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';
import { Spaceship } from '@modules/spaceship/spaceship.entity';

@Entity('locations')
export class Location {
  @PrimaryColumn({
    type: 'varchar',
    length: 3,
    comment: 'IATA airport code',
  })
  code: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 6,
    comment: 'Latitude coordinate',
  })
  latitude: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 6,
    comment: 'Longitude coordinate',
  })
  longitude: number;

  // Relations
  @OneToMany(() => Spaceship, (spaceship) => spaceship.currentLocation)
  spaceshipsAtLocation: Spaceship[];
}
