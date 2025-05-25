// src/modules/location/location.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { Location } from './location.entity';
import { LocationDto } from './dto/location.dto';
import { DistanceCalculationDto } from './dto/distance-calculation.dto';
import { DistanceCalculator, TimeCalculator } from '@common/utils';
import { LocationRepository } from './location.repository';

@Injectable()
export class LocationService {
  constructor(private locationRepository: LocationRepository) {}

  /**
   * Get all locations
   */
  async findAll(): Promise<LocationDto[]> {
    const locations = await this.locationRepository.find({
      order: { code: 'ASC' },
    });

    return locations.map(this.toDto);
  }

  /**
   * Get a specific location by code
   */
  async findByCode(code: string): Promise<Location> {
    const location = await this.locationRepository.findOne({
      where: { code: code.toUpperCase() },
    });

    if (!location) {
      throw new NotFoundException(`Location with code ${code} not found`);
    }

    return location;
  }

  /**
   * Check if a location exists
   */
  async exists(code: string): Promise<boolean> {
    const count = await this.locationRepository.count({
      where: { code: code.toUpperCase() },
    });

    return count > 0;
  }

  /**
   * Validate multiple location codes
   * @throws NotFoundException if any location doesn't exist
   */
  async validateLocationCodes(codes: string[]): Promise<void> {
    const uniqueCodes = [...new Set(codes.map((c) => c.toUpperCase()))];

    const locations = await this.locationRepository.find({
      where: uniqueCodes.map((code) => ({ code })),
    });

    if (locations.length !== uniqueCodes.length) {
      const foundCodes = locations.map((l) => l.code);
      const missingCodes = uniqueCodes.filter((c) => !foundCodes.includes(c));
      throw new NotFoundException(`Invalid location codes: ${missingCodes.join(', ')}`);
    }
  }

  /**
   * Calculate distance between two locations
   */
  async calculateDistance(fromCode: string, toCode: string): Promise<DistanceCalculationDto> {
    // Check pre-calculated distances first
    const preCalculated = DistanceCalculator.getPreCalculatedDistance(fromCode.toUpperCase(), toCode.toUpperCase());

    if (preCalculated !== null) {
      return {
        fromCode: fromCode.toUpperCase(),
        toCode: toCode.toUpperCase(),
        distanceMiles: preCalculated,
        estimatedTravelTimeMinutes: TimeCalculator.calculateTravelTimeMinutes(preCalculated),
      };
    }

    // If not pre-calculated, calculate from coordinates
    const [fromLocation, toLocation] = await Promise.all([this.findByCode(fromCode), this.findByCode(toCode)]);

    const distance = DistanceCalculator.calculateDistance(
      Number(fromLocation.latitude),
      Number(fromLocation.longitude),
      Number(toLocation.latitude),
      Number(toLocation.longitude),
    );

    return {
      fromCode: fromLocation.code,
      toCode: toLocation.code,
      distanceMiles: distance,
      estimatedTravelTimeMinutes: TimeCalculator.calculateTravelTimeMinutes(distance),
    };
  }

  /**
   * Get distances from one location to all others
   */
  async getDistancesFrom(fromCode: string): Promise<DistanceCalculationDto[]> {
    const fromLocation = await this.findByCode(fromCode);
    const allLocations = await this.locationRepository.find();

    const distances: DistanceCalculationDto[] = [];

    for (const toLocation of allLocations) {
      if (toLocation.code === fromLocation.code) continue;

      const distance = await this.calculateDistance(fromLocation.code, toLocation.code);
      distances.push(distance);
    }

    // Sort by distance
    return distances.sort((a, b) => a.distanceMiles - b.distanceMiles);
  }

  /**
   * Convert entity to DTO
   */
  private toDto(location: Location): LocationDto {
    return {
      code: location.code,
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
    };
  }
}
