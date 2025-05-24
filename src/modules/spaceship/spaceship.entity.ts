import {
  Entity,
  Column,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Location } from '@modules/location/location.entity';
import { Trip } from '@modules/trip/trip.entity';

@Entity('spaceships')
export class Spaceship {
  @PrimaryColumn({
    type: 'varchar',
    comment: 'Unique spaceship identifier (e.g., SS-001)',
  })
  id: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: 'Friendly name of the spaceship',
  })
  name: string;

  @Column({
    name: 'current_location_code',
    type: 'varchar',
    length: 3,
    comment: 'Current location IATA code',
  })
  currentLocationCode: string;

  // Relations
  @ManyToOne(() => Location, (location) => location.spaceshipsAtLocation, {
    eager: false,
    nullable: false,
  })
  @JoinColumn({ name: 'current_location_code', referencedColumnName: 'code' })
  currentLocation: Location;

  @OneToMany(() => Trip, (trip) => trip.spaceship)
  trips: Trip[];

  // Timestamps
  @CreateDateColumn({
    name: 'created_at',
    type: 'timestamptz',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
    type: 'timestamptz',
  })
  updatedAt: Date;
}
