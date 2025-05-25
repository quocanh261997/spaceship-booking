import { ApiProperty } from '@nestjs/swagger';

export class CurrentLocationDto {
  @ApiProperty({ example: 'IN_TRANSIT' })
  code: string;

  @ApiProperty({ example: 40.6413 })
  latitude: number;

  @ApiProperty({ example: -73.7781 })
  longitude: number;
}

export class TripStatusDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  tripId: string;

  @ApiProperty({ example: 'SS-001' })
  spaceshipId: string;

  @ApiProperty({ example: 'JFK' })
  departureLocationCode: string;

  @ApiProperty({ example: 'LAX' })
  destinationLocationCode: string;

  @ApiProperty({ example: '2025-01-15T10:00:00.000Z' })
  departureAt: string;

  @ApiProperty({ example: '2025-01-15T12:47:23.000Z' })
  arrivalAt: string;

  @ApiProperty({
    example: 'SCHEDULED',
    required: false,
    enum: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ALTERNATIVE_TIME_OFFERED'],
  })
  status?: string;

  @ApiProperty({
    type: CurrentLocationDto,
    required: false,
    description: 'Current location if trip is in progress',
  })
  currentLocation?: CurrentLocationDto;
}
