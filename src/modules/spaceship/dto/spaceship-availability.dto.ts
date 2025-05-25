export class SpaceshipAvailabilityDto {
  spaceshipId: string;
  locationCode: string;
  availableFrom: Date;
  nextScheduledTrip?: {
    tripId: string;
    departureAt: Date;
    destinationCode: string;
  };
}
