import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CancelTripDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID of the trip to cancel',
  })
  @IsUUID('4', { message: 'Invalid trip ID format' })
  tripId: string;
}
