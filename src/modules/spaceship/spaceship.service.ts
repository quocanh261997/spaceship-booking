import { Injectable, Logger } from '@nestjs/common';
import { LessThanOrEqual, MoreThan, Not } from 'typeorm';
import { Spaceship } from './spaceship.entity';
import { TripStatus } from '../trip/trip.entity';
import { SpaceshipAvailabilityDto } from './dto/spaceship-availability.dto';
import { SpaceshipRepository } from './spaceship.repository';
import { TripRepository } from '../trip/trip.repository';

@Injectable()
export class SpaceshipService {
  private readonly logger = new Logger(SpaceshipService.name);

  constructor(
    private spaceshipRepository: SpaceshipRepository,
    private tripRepository: TripRepository,
  ) {}

  /**
   * Find all spaceships
   */
  async findAll(): Promise<Spaceship[]> {
    return this.spaceshipRepository.find({
      relations: ['currentLocation'],
      order: { id: 'ASC' },
    });
  }

  /**
   * Find spaceship by ID
   */
  async findById(id: string): Promise<Spaceship | null> {
    return this.spaceshipRepository.findOne({
      where: { id },
      relations: ['currentLocation'],
    });
  }

  /**
   * Find available spaceships at a given location and time
   * A spaceship is available if:
   * 1. It will be at the departure location at the requested time
   * 2. It doesn't have any scheduled trips departing at or after that time
   */
  async findAvailableSpaceships(departureLocationCode: string, requestedDepartureTime: Date): Promise<Spaceship[]> {
    this.logger.debug(
      `Finding available spaceships at ${departureLocationCode} for ${requestedDepartureTime.toISOString()}`,
    );

    // Get all spaceships
    const allSpaceships = await this.spaceshipRepository.find();
    const availableSpaceships: Spaceship[] = [];

    for (const spaceship of allSpaceships) {
      const isAvailable = await this.isSpaceshipAvailable(spaceship.id, departureLocationCode, requestedDepartureTime);

      if (isAvailable) {
        availableSpaceships.push(spaceship);
      }
    }

    this.logger.debug(`Found ${availableSpaceships.length} available spaceships`);
    return availableSpaceships;
  }

  /**
   * Check if a specific spaceship is available at a location and time
   */
  async isSpaceshipAvailable(spaceshipId: string, locationCode: string, requestedTime: Date): Promise<boolean> {
    // Get the spaceship's location at the requested time
    const locationAtTime = await this.getSpaceshipLocationAtTime(spaceshipId, requestedTime);

    // Check if spaceship is at the requested location
    if (locationAtTime !== locationCode) {
      return false;
    }

    // Check if there's any trip scheduled at or after this time
    const conflictingTrip = await this.tripRepository.findOne({
      where: {
        spaceshipId,
        status: Not(TripStatus.CANCELLED),
        departureAt: requestedTime,
      },
    });

    return !conflictingTrip;
  }

  /**
   * Get spaceship location at a specific time
   * This considers all trips and determines where the spaceship will be
   */
  async getSpaceshipLocationAtTime(spaceshipId: string, targetTime: Date): Promise<string> {
    const spaceship = await this.spaceshipRepository.findOne({
      where: { id: spaceshipId },
    });

    if (!spaceship) {
      throw new Error(`Spaceship ${spaceshipId} not found`);
    }

    // Find the last trip that completes before or at target time
    const lastCompletedTrip = await this.tripRepository.findOne({
      where: {
        spaceshipId,
        status: Not(TripStatus.CANCELLED),
        arrivalAt: LessThanOrEqual(targetTime),
      },
      order: { arrivalAt: 'DESC' },
    });

    // If there's a completed trip, spaceship is at its destination
    if (lastCompletedTrip) {
      // But check if there's a trip departing after this arrival
      const subsequentTrip = await this.tripRepository.findOne({
        where: {
          spaceshipId,
          status: Not(TripStatus.CANCELLED),
          departureAt: MoreThan(lastCompletedTrip.arrivalAt) && LessThanOrEqual(targetTime),
        },
        order: { departureAt: 'ASC' },
      });

      if (subsequentTrip) {
        // Check if this subsequent trip is ongoing at target time
        if (targetTime >= subsequentTrip.departureAt && targetTime < subsequentTrip.arrivalAt) {
          return 'IN_TRANSIT';
        }
        // If we're past its arrival, recursively check from there
        if (targetTime >= subsequentTrip.arrivalAt) {
          return this.getSpaceshipLocationAtTime(spaceshipId, targetTime);
        }
      }

      return lastCompletedTrip.destinationLocationCode;
    }

    // Check if there's an ongoing trip at target time
    const ongoingTrip = await this.tripRepository.findOne({
      where: {
        spaceshipId,
        status: Not(TripStatus.CANCELLED),
        departureAt: LessThanOrEqual(targetTime),
        arrivalAt: MoreThan(targetTime),
      },
    });

    if (ongoingTrip) {
      return 'IN_TRANSIT';
    }

    // No trips affect the spaceship at this time, it's at its initial location
    return spaceship.currentLocationCode;
  }

  /**
   * Get the next available time for a spaceship at a specific location
   */
  async getNextAvailableTime(spaceshipId: string, locationCode: string, afterTime: Date): Promise<Date | null> {
    this.logger.debug(
      `Getting next available time for ${spaceshipId} at ${locationCode} after ${afterTime.toISOString()}`,
    );

    // First check current location at the given time
    const currentLocation = await this.getSpaceshipLocationAtTime(spaceshipId, afterTime);

    if (currentLocation === locationCode) {
      // Check if there's a trip departing at or after this time
      const nextDeparture = await this.tripRepository.findOne({
        where: {
          spaceshipId,
          status: Not(TripStatus.CANCELLED),
          departureAt: MoreThan(afterTime),
          departureLocationCode: locationCode,
        },
        order: { departureAt: 'ASC' },
      });

      if (!nextDeparture) {
        // No future departure from this location, so available from afterTime
        return afterTime;
      }

      // Available until the next departure
      return afterTime;
    }

    // Spaceship is not at the location, find when it will arrive there next
    const futureArrivals = await this.tripRepository.find({
      where: {
        spaceshipId,
        status: Not(TripStatus.CANCELLED),
        arrivalAt: MoreThan(afterTime),
        destinationLocationCode: locationCode,
      },
      order: { arrivalAt: 'ASC' },
    });

    if (futureArrivals.length > 0) {
      return futureArrivals[0].arrivalAt;
    }

    // Spaceship will never arrive at this location based on current schedule
    return null;
  }

  /**
   * Get availability information for all spaceships
   */
  async getSpaceshipAvailability(atTime: Date = new Date()): Promise<SpaceshipAvailabilityDto[]> {
    const spaceships = await this.findAll();
    const availability: SpaceshipAvailabilityDto[] = [];

    for (const spaceship of spaceships) {
      const locationAtTime = await this.getSpaceshipLocationAtTime(spaceship.id, atTime);

      if (locationAtTime === 'IN_TRANSIT') {
        // Find the ongoing trip
        const ongoingTrip = await this.tripRepository.findOne({
          where: {
            spaceshipId: spaceship.id,
            status: Not(TripStatus.CANCELLED),
            departureAt: LessThanOrEqual(atTime),
            arrivalAt: MoreThan(atTime),
          },
        });

        if (ongoingTrip) {
          availability.push({
            spaceshipId: spaceship.id,
            locationCode: 'IN_TRANSIT',
            availableFrom: ongoingTrip.arrivalAt,
            nextScheduledTrip: {
              tripId: ongoingTrip.id,
              departureAt: ongoingTrip.departureAt,
              destinationCode: ongoingTrip.destinationLocationCode,
            },
          });
        }
      } else {
        // Find next scheduled trip
        const nextTrip = await this.tripRepository.findOne({
          where: {
            spaceshipId: spaceship.id,
            status: Not(TripStatus.CANCELLED),
            departureAt: MoreThan(atTime),
          },
          order: { departureAt: 'ASC' },
        });

        availability.push({
          spaceshipId: spaceship.id,
          locationCode: locationAtTime,
          availableFrom: atTime,
          nextScheduledTrip: nextTrip
            ? {
                tripId: nextTrip.id,
                departureAt: nextTrip.departureAt,
                destinationCode: nextTrip.destinationLocationCode,
              }
            : undefined,
        });
      }
    }

    return availability;
  }

  /**
   * Update spaceship's current location (used after trip completion)
   */
  async updateCurrentLocation(spaceshipId: string, newLocationCode: string): Promise<void> {
    await this.spaceshipRepository.update({ id: spaceshipId }, { currentLocationCode: newLocationCode });
  }
}
