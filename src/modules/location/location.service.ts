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

  async findAll(): Promise<LocationDto[]> {
    const locations = await this.locationRepository.find({
      order: { code: 'ASC' },
    });

    return locations.map(this.toDto);
  }

  async findByCode(code: string): Promise<Location> {
    const location = await this.locationRepository.findOne({
      where: { code: code.toUpperCase() },
    });

    if (!location) {
      throw new NotFoundException(`Location with code ${code} not found`);
    }

    return location;
  }

  async exists(code: string): Promise<boolean> {
    const count = await this.locationRepository.count({
      where: { code: code.toUpperCase() },
    });

    return count > 0;
  }

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

  async calculateDistance(fromCode: string, toCode: string): Promise<DistanceCalculationDto> {
    const preCalculated = DistanceCalculator.getPreCalculatedDistance(fromCode.toUpperCase(), toCode.toUpperCase());

    if (preCalculated !== null) {
      return {
        fromCode: fromCode.toUpperCase(),
        toCode: toCode.toUpperCase(),
        distanceMiles: preCalculated,
        estimatedTravelTimeMinutes: TimeCalculator.calculateTravelTimeMinutes(preCalculated),
      };
    }

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

  private toDto(location: Location): LocationDto {
    return {
      code: location.code,
      latitude: Number(location.latitude),
      longitude: Number(location.longitude),
    };
  }
}
