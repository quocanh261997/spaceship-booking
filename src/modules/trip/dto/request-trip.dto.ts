import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsString, Length } from 'class-validator';

export class RequestTripDto {
  @ApiProperty({
    example: 'JFK',
    description: 'IATA code of departure airport',
    minLength: 3,
    maxLength: 3,
  })
  @IsString()
  @Length(3, 3, { message: 'Location code must be exactly 3 characters' })
  departureLocationCode: string;

  @ApiProperty({
    example: 'LAX',
    description: 'IATA code of destination airport',
    minLength: 3,
    maxLength: 3,
  })
  @IsString()
  @Length(3, 3, { message: 'Location code must be exactly 3 characters' })
  destinationLocationCode: string;

  @ApiProperty({
    example: '2025-01-15T10:00:00Z',
    description: 'Desired departure time in ISO 8601 format',
  })
  @IsISO8601({ strict: true }, { message: 'Departure time must be in ISO 8601 format' })
  departureAt: string;
}
