import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Trip, TripStatus } from './trip.entity';
import { SpaceshipService } from '../spaceship/spaceship.service';
import { LocationService } from '../location/location.service';
import { RequestTripDto } from './dto/request-trip.dto';
import { TripStatusDto } from './dto/trip-status.dto';
import { TimeCalculator, DateUtils } from '@common/utils';
import { Cron } from '@nestjs/schedule';
import { AlternativeTimeOfferDto } from './dto/alternative-time-offer.dto';

@Injectable()
export class TripService {
  private readonly logger = new Logger(TripService.name);

  constructor(
    @InjectRepository(Trip)
    private tripRepository: Repository<Trip>,
    private spaceshipService: SpaceshipService,
    private locationService: LocationService,
    private dataSource: DataSource,
  ) {}

  /**
   * Request a new trip
   * Uses database transactions to ensure consistency when multiple requests come in simultaneously
   */
  async requestTrip(dto: RequestTripDto): Promise<TripStatusDto | AlternativeTimeOfferDto> {
    this.logger.log(`Requesting trip from ${dto.departureLocationCode} to ${dto.destinationLocationCode}`);

    // Validate the request
    await this.validateTripRequest(dto);

    const requestedDepartureTime = DateUtils.parseISOString(dto.departureAt);

    // Find available spaceships at departure location and time
    const availableSpaceships = await this.spaceshipService.findAvailableSpaceships(
      dto.departureLocationCode,
      requestedDepartureTime,
    );

    if (availableSpaceships.length > 0) {
      // We have an available spaceship - proceed with booking
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction('SERIALIZABLE');

      try {
        const selectedSpaceship = availableSpaceships[0];
        this.logger.log(`Selected spaceship ${selectedSpaceship.id} for immediate departure`);

        // Calculate travel details
        const travelDetails = await this.calculateTravelDetails(
          dto.departureLocationCode,
          dto.destinationLocationCode,
          requestedDepartureTime,
        );

        // Create and save the trip
        const trip = this.tripRepository.create({
          spaceshipId: selectedSpaceship.id,
          departureLocationCode: dto.departureLocationCode,
          destinationLocationCode: dto.destinationLocationCode,
          departureAt: requestedDepartureTime,
          arrivalAt: travelDetails.arrivalTime,
          status: TripStatus.SCHEDULED,
        });

        const savedTrip = await queryRunner.manager.save(Trip, trip);
        await queryRunner.commitTransaction();

        this.logger.log(`Trip ${savedTrip.id} created successfully`);

        // Return trip status
        return {
          tripId: savedTrip.id,
          spaceshipId: savedTrip.spaceshipId,
          departureLocationCode: savedTrip.departureLocationCode,
          destinationLocationCode: savedTrip.destinationLocationCode,
          departureAt: savedTrip.departureAt.toISOString(),
          arrivalAt: savedTrip.arrivalAt.toISOString(),
          status: 'SCHEDULED',
        };
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } else {
      // No spaceship available - find and return alternative time without saving
      this.logger.log('No spaceship available at requested time, finding alternatives');

      const earliestAvailable = await this.findEarliestAvailableSpaceship(
        dto.departureLocationCode,
        dto.destinationLocationCode,
        requestedDepartureTime,
      );

      if (!earliestAvailable) {
        throw new BadRequestException('No spaceships available for this route. All spaceships are fully booked.');
      }

      // Return alternative time offer without saving to database
      if (
        !earliestAvailable.spaceshipId ||
        !earliestAvailable.departureLocationCode ||
        !earliestAvailable.destinationLocationCode ||
        !earliestAvailable.departureAt ||
        !earliestAvailable.arrivalAt
      ) {
        throw new Error('Invalid trip details returned for alternative time offer');
      }

      return {
        tripId: '', // No trip ID since it's not saved yet
        spaceshipId: earliestAvailable.spaceshipId,
        departureLocationCode: earliestAvailable.departureLocationCode,
        destinationLocationCode: earliestAvailable.destinationLocationCode,
        departureAt: earliestAvailable.departureAt.toISOString(),
        arrivalAt: earliestAvailable.arrivalAt.toISOString(),
        status: 'ALTERNATIVE_TIME_OFFERED',
        message:
          'No spaceship available at requested time. Please confirm if you would like to book for the alternative time shown.',
        isProposal: true,
      };
    }
  }

  /**
   * Validate trip request
   */
  private async validateTripRequest(dto: RequestTripDto): Promise<void> {
    // Check if locations exist
    await this.locationService.validateLocationCodes([dto.departureLocationCode, dto.destinationLocationCode]);

    // Check if departure and destination are different
    if (dto.departureLocationCode === dto.destinationLocationCode) {
      throw new BadRequestException('Departure and destination cannot be the same');
    }

    // Check if departure time is in the future
    const departureTime = DateUtils.parseISOString(dto.departureAt);
    if (DateUtils.isPast(departureTime)) {
      throw new BadRequestException('Departure time must be in the future');
    }

    // Check if departure time is not too far in the future (e.g., 1 year)
    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    if (departureTime > oneYearFromNow) {
      throw new BadRequestException('Cannot book trips more than 1 year in advance');
    }
  }

  /**
   * Calculate travel details between two locations
   */
  private async calculateTravelDetails(
    departureCode: string,
    destinationCode: string,
    departureTime: Date,
  ): Promise<{ distance: number; travelTime: number; arrivalTime: Date }> {
    const distanceInfo = await this.locationService.calculateDistance(departureCode, destinationCode);

    const travelTime = TimeCalculator.calculateTravelTime(distanceInfo.distanceMiles);
    const arrivalTime = TimeCalculator.calculateArrivalTime(departureTime, distanceInfo.distanceMiles);

    return {
      distance: distanceInfo.distanceMiles,
      travelTime,
      arrivalTime,
    };
  }

  /**
   * Find the earliest available spaceship for a route
   */
  private async findEarliestAvailableSpaceship(
    departureLocationCode: string,
    destinationLocationCode: string,
    afterTime: Date,
  ): Promise<Partial<Trip> | null> {
    const allSpaceships = await this.spaceshipService.findAll();
    let earliestOption: {
      spaceship: any;
      availableTime: Date;
    } | null = null;

    for (const spaceship of allSpaceships) {
      const nextAvailable = await this.spaceshipService.getNextAvailableTime(
        spaceship.id,
        departureLocationCode,
        afterTime,
      );

      if (nextAvailable && (!earliestOption || nextAvailable < earliestOption.availableTime)) {
        earliestOption = { spaceship, availableTime: nextAvailable };
      }
    }

    if (!earliestOption) {
      return null;
    }

    // Calculate trip details for earliest option
    const travelDetails = await this.calculateTravelDetails(
      departureLocationCode,
      destinationLocationCode,
      earliestOption.availableTime,
    );

    return {
      spaceshipId: earliestOption.spaceship.id,
      departureLocationCode,
      destinationLocationCode,
      departureAt: earliestOption.availableTime,
      arrivalAt: travelDetails.arrivalTime,
      status: TripStatus.SCHEDULED,
    };
  }

  /**
   * Cancel a trip
   */
  async cancelTrip(tripId: string): Promise<void> {
    const trip = await this.tripRepository.findOne({
      where: { id: tripId },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.status === TripStatus.CANCELLED) {
      throw new BadRequestException('Trip is already cancelled');
    }

    if (trip.status === TripStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed trip');
    }

    // Check if trip has already started
    const now = new Date();
    if (trip.departureAt <= now) {
      throw new BadRequestException('Cannot cancel a trip that has already departed');
    }

    // Update trip status
    trip.status = TripStatus.CANCELLED;
    await this.tripRepository.save(trip);

    this.logger.log(`Trip ${tripId} cancelled successfully`);
  }

  /**
   * Get trip status
   * If trip is in progress, also returns current location
   */
  async getTripStatus(tripId: string): Promise<TripStatusDto> {
    const trip = await this.tripRepository.findOne({
      where: { id: tripId },
      relations: ['spaceship', 'departureLocation', 'destinationLocation'],
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    const response: TripStatusDto = {
      tripId: trip.id,
      spaceshipId: trip.spaceshipId,
      departureLocationCode: trip.departureLocationCode,
      destinationLocationCode: trip.destinationLocationCode,
      departureAt: trip.departureAt.toISOString(),
      arrivalAt: trip.arrivalAt.toISOString(),
      status: trip.status,
    };

    // If trip is scheduled and should be in progress, update status
    const now = new Date();
    if (trip.status === TripStatus.SCHEDULED) {
      if (now >= trip.departureAt && now < trip.arrivalAt) {
        // Trip is in progress
        response.status = 'IN_PROGRESS';

        // Calculate current location
        const currentLocation = TimeCalculator.getCurrentLocation(
          {
            departureAt: trip.departureAt,
            arrivalAt: trip.arrivalAt,
            departureLat: Number(trip.departureLocation.latitude),
            departureLon: Number(trip.departureLocation.longitude),
            destinationLat: Number(trip.destinationLocation.latitude),
            destinationLon: Number(trip.destinationLocation.longitude),
          },
          now,
        );

        response.currentLocation = {
          code: 'IN_TRANSIT',
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        };
      } else if (now >= trip.arrivalAt) {
        // Trip should be completed
        response.status = 'COMPLETED';
        // In a real system, we'd update the trip status in the database
      }
    }

    return response;
  }

  /**
   * Get all trips (with optional filters)
   */
  async findAll(filters?: {
    spaceshipId?: string;
    status?: TripStatus;
    departureLocationCode?: string;
    destinationLocationCode?: string;
    afterDate?: Date;
    beforeDate?: Date;
  }): Promise<Trip[]> {
    const query = this.tripRepository
      .createQueryBuilder('trip')
      .leftJoinAndSelect('trip.spaceship', 'spaceship')
      .leftJoinAndSelect('trip.departureLocation', 'departureLocation')
      .leftJoinAndSelect('trip.destinationLocation', 'destinationLocation');

    if (filters?.spaceshipId) {
      query.andWhere('trip.spaceshipId = :spaceshipId', {
        spaceshipId: filters.spaceshipId,
      });
    }

    if (filters?.status) {
      query.andWhere('trip.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.departureLocationCode) {
      query.andWhere('trip.departureLocationCode = :departureCode', {
        departureCode: filters.departureLocationCode,
      });
    }

    if (filters?.destinationLocationCode) {
      query.andWhere('trip.destinationLocationCode = :destinationCode', {
        destinationCode: filters.destinationLocationCode,
      });
    }

    if (filters?.afterDate) {
      query.andWhere('trip.departureAt >= :afterDate', {
        afterDate: filters.afterDate,
      });
    }

    if (filters?.beforeDate) {
      query.andWhere('trip.departureAt <= :beforeDate', {
        beforeDate: filters.beforeDate,
      });
    }

    query.orderBy('trip.departureAt', 'ASC');

    return query.getMany();
  }

  /**
   * Update trip statuses (run every 15 minutes)
   */
  @Cron('*/15 * * * *')
  async updateTripStatuses(): Promise<void> {
    const now = new Date();

    // Update trips that should be in progress
    await this.tripRepository
      .createQueryBuilder()
      .update(Trip)
      .set({ status: TripStatus.IN_PROGRESS })
      .where('status = :scheduled', { scheduled: TripStatus.SCHEDULED })
      .andWhere('departureAt <= :now', { now })
      .andWhere('arrivalAt > :now', { now })
      .execute();

    // Update trips that should be completed
    const completedTrips = await this.tripRepository
      .createQueryBuilder()
      .update(Trip)
      .set({ status: TripStatus.COMPLETED })
      .where('status IN (:...statuses)', {
        statuses: [TripStatus.SCHEDULED, TripStatus.IN_PROGRESS],
      })
      .andWhere('arrivalAt <= :now', { now })
      .returning('*')
      .execute();

    // Update spaceship locations for completed trips
    for (const trip of completedTrips.raw) {
      await this.spaceshipService.updateCurrentLocation(trip.spaceship_id, trip.destination_location_code);
    }

    this.logger.log(`Updated ${completedTrips.affected} trip statuses`);
  }
}
