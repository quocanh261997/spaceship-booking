import { ApiProperty } from '@nestjs/swagger';
import { TripStatusDto } from './trip-status.dto';

export class AlternativeTimeOfferDto extends TripStatusDto {
  @ApiProperty({
    example: 'ALTERNATIVE_TIME_OFFERED',
    description: 'Indicates that the requested time was not available',
  })
  declare status: string;

  @ApiProperty({
    example: 'No spaceship available at requested time. Please confirm if you would like to book for the alternative time shown.',
    description: 'Message explaining the alternative time offer',
  })
  message: string;

  @ApiProperty({
    example: false,
    description: 'Indicates this is just a proposal, not a confirmed booking',
  })
  isProposal: boolean = true;
}
