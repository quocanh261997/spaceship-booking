import { ApiProperty } from '@nestjs/swagger';
import { TripStatusDto } from '@modules/trip/dto/trip-status.dto';

export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'Bad Request' })
  message: string;

  @ApiProperty({ example: '2025-01-15T10:00:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: '/trips/request' })
  path: string;
}

export class AlternativeTimeResponseDto extends TripStatusDto {
  @ApiProperty({
    example: 'ALTERNATIVE_TIME_OFFERED',
    description: 'Indicates that the requested time was not available',
  })
  declare status: string;

  @ApiProperty({
    example: 'No spaceship available at requested time. Earliest available departure is at the time shown.',
    required: false,
  })
  message?: string;
}
