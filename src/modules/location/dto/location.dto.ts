import { ApiProperty } from '@nestjs/swagger';

export class LocationDto {
  @ApiProperty({ example: 'JFK' })
  code: string;

  @ApiProperty({ example: 40.6413 })
  latitude: number;

  @ApiProperty({ example: -73.7781 })
  longitude: number;
}
