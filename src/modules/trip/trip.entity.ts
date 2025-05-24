import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Check,
} from 'typeorm';
import { Spaceship } from '@modules/spaceship/spaceship.entity';
import { Location } from '@modules/location/location.entity';

export enum TripStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('trips')
@Index(['spaceshipId', 'departureAt']) // Optimize availability queries
@Index(['status', 'departureAt']) // Optimize status-based queries
@Check(`"departure_at" < "arrival_at"`) // Ensure departure is before arrival
export class Trip {
  @PrimaryGeneratedColumn('uuid', {
    comment: 'Unique trip identifier',
  })
  id: string;

  @Column({
    name: 'spaceship_id',
    type: 'varchar',
    comment: 'Assigned spaceship for this trip',
  })
  spaceshipId: string;

  @Column({
    name: 'departure_location_code',
    type: 'varchar',
    length: 3,
    comment: 'Departure airport IATA code',
  })
  departureLocationCode: string;

  @Column({
    name: 'destination_location_code',
    type: 'varchar',
    length: 3,
    comment: 'Destination airport IATA code',
  })
  destinationLocationCode: string;

  @Column({
    type: 'timestamptz',
    name: 'departure_at',
    comment: 'Scheduled departure time in UTC',
  })
  departureAt: Date;

  @Column({
    type: 'timestamptz',
    name: 'arrival_at',
    comment: 'Scheduled arrival time in UTC',
  })
  arrivalAt: Date;

  @Column({
    type: 'enum',
    enum: TripStatus,
    default: TripStatus.SCHEDULED,
    comment: 'Current status of the trip',
  })
  status: TripStatus;

  // Relations
  @ManyToOne(() => Spaceship, (spaceship) => spaceship.trips, {
    eager: false,
    nullable: false,
  })
  @JoinColumn({ name: 'spaceship_id' })
  spaceship: Spaceship;

  @ManyToOne(() => Location, {
    eager: false,
    nullable: false,
  })
  @JoinColumn({ name: 'departure_location_code', referencedColumnName: 'code' })
  departureLocation: Location;

  @ManyToOne(() => Location, {
    eager: false,
    nullable: false,
  })
  @JoinColumn({
    name: 'destination_location_code',
    referencedColumnName: 'code',
  })
  destinationLocation: Location;

  // Timestamps
  @CreateDateColumn({
    type: 'timestamptz',
    name: 'created_at',
    comment: 'Trip booking creation time',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    name: 'updated_at',
    comment: 'Last modification time',
  })
  updatedAt: Date;
}
