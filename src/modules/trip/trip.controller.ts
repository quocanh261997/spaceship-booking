import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { TripService } from '@/modules/trip/trip.service';
import { RequestTripDto } from '@/modules/trip/dto/request-trip.dto';
import { TripStatusDto } from '@/modules/trip/dto/trip-status.dto';
import { AlternativeTimeOfferDto } from './dto/alternative-time-offer.dto';
import { ErrorResponseDto } from '@/modules/trip/dto/trip-response.dto';

@ApiTags('trips')
@Controller('trips')
export class TripController {
  private readonly logger = new Logger(TripController.name);

  constructor(private readonly tripService: TripService) {}

  @Post('request')
  @ApiOperation({
    summary: 'Request a new trip',
    description:
      'Books a spaceship for travel between two locations. Returns alternative time if requested time is unavailable.',
  })
  @ApiResponse({
    status: 200,
    description: 'Trip successfully booked',
    type: TripStatusDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Alternative time offered (requested time unavailable)',
    type: AlternativeTimeOfferDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request or no availability',
    type: ErrorResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request data',
    type: ErrorResponseDto,
  })
  async requestTrip(
    @Body(new ValidationPipe({ transform: true, whitelist: true }))
    dto: RequestTripDto,
  ): Promise<TripStatusDto | AlternativeTimeOfferDto> {
    this.logger.log(`POST /trips/request - ${JSON.stringify(dto)}`);
    return this.tripService.requestTrip(dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Cancel a trip',
    description: 'Cancels a scheduled trip. Cannot cancel trips that have already departed.',
  })
  @ApiParam({
    name: 'id',
    description: 'Trip ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 204,
    description: 'Trip successfully cancelled',
  })
  @ApiBadRequestResponse({
    description: 'Trip cannot be cancelled (already departed/cancelled)',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Trip not found',
    type: ErrorResponseDto,
  })
  async cancelTrip(@Param('id', new ParseUUIDPipe()) tripId: string): Promise<void> {
    this.logger.log(`DELETE /trips/${tripId}`);
    await this.tripService.cancelTrip(tripId);
  }

  @Get(':id/status')
  @ApiOperation({
    summary: 'Get trip status',
    description: 'Returns current status of a trip including current location if in progress',
  })
  @ApiParam({
    name: 'id',
    description: 'Trip ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Trip status retrieved',
    type: TripStatusDto,
  })
  @ApiNotFoundResponse({
    description: 'Trip not found',
    type: ErrorResponseDto,
  })
  async getTripStatus(@Param('id', new ParseUUIDPipe()) tripId: string): Promise<TripStatusDto> {
    this.logger.log(`GET /trips/${tripId}/status`);
    return this.tripService.getTripStatus(tripId);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all trips',
    description: 'Returns a list of all trips with optional filters',
  })
  @ApiResponse({
    status: 200,
    description: 'List of trips',
    type: [TripStatusDto],
  })
  async getAllTrips(): Promise<TripStatusDto[]> {
    this.logger.log('GET /trips');
    const trips = await this.tripService.findAll();

    return trips.map((trip) => ({
      tripId: trip.id,
      spaceshipId: trip.spaceshipId,
      departureLocationCode: trip.departureLocationCode,
      destinationLocationCode: trip.destinationLocationCode,
      departureAt: trip.departureAt.toISOString(),
      arrivalAt: trip.arrivalAt.toISOString(),
      status: trip.status,
    }));
  }
}
