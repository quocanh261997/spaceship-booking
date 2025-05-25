export class DistanceCalculator {
  private static readonly EARTH_RADIUS_MILES = 3959;

  static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    // Convert to radians
    const toRadians = (degrees: number) => degrees * (Math.PI / 180);

    const lat1Rad = toRadians(lat1);
    const lat2Rad = toRadians(lat2);
    const deltaLat = toRadians(lat2 - lat1);
    const deltaLon = toRadians(lon2 - lon1);

    // Haversine formula
    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    // Distance in miles
    const distance = this.EARTH_RADIUS_MILES * c;

    // Round to 2 decimal places
    return Math.round(distance * 100) / 100;
  }

  static getPreCalculatedDistance(from: string, to: string): number | null {
    const distances: Record<string, number> = {
      'JFK-LAX': 2475.79,
      'LAX-JFK': 2475.79,
      'JFK-SFO': 2586.48,
      'SFO-JFK': 2586.48,
      'LAX-SFO': 347.42,
      'SFO-LAX': 347.42,
    };

    return distances[`${from}-${to}`] || null;
  }
}

export class TimeCalculator {
  private static readonly SPACESHIP_SPEED_MPH = 1000;
  private static readonly MILLISECONDS_PER_HOUR = 60 * 60 * 1000;

  static calculateTravelTime(distanceMiles: number): number {
    const hours = distanceMiles / this.SPACESHIP_SPEED_MPH;
    return Math.round(hours * this.MILLISECONDS_PER_HOUR);
  }

  static calculateTravelTimeMinutes(distanceMiles: number): number {
    const hours = distanceMiles / this.SPACESHIP_SPEED_MPH;
    return Math.round(hours * 60);
  }

  static calculateArrivalTime(departureTime: Date, distanceMiles: number): Date {
    const travelTimeMs = this.calculateTravelTime(distanceMiles);
    return new Date(departureTime.getTime() + travelTimeMs);
  }

  static getCurrentLocation(
    trip: {
      departureAt: Date;
      arrivalAt: Date;
      departureLat: number;
      departureLon: number;
      destinationLat: number;
      destinationLon: number;
    },
    currentTime: Date = new Date(),
  ): { latitude: number; longitude: number; progress: number } {
    const totalTime = trip.arrivalAt.getTime() - trip.departureAt.getTime();
    const elapsedTime = currentTime.getTime() - trip.departureAt.getTime();

    // If before departure, at departure location
    if (elapsedTime <= 0) {
      return {
        latitude: trip.departureLat,
        longitude: trip.departureLon,
        progress: 0,
      };
    }

    // If after arrival, at destination
    if (elapsedTime >= totalTime) {
      return {
        latitude: trip.destinationLat,
        longitude: trip.destinationLon,
        progress: 1,
      };
    }

    // Calculate progress (0 to 1)
    const progress = elapsedTime / totalTime;

    // Linear interpolation for position
    // This is simplified - actual flight paths follow great circles
    const currentLat = trip.departureLat + (trip.destinationLat - trip.departureLat) * progress;
    const currentLon = trip.departureLon + (trip.destinationLon - trip.departureLon) * progress;

    return {
      latitude: Math.round(currentLat * 1000000) / 1000000, // 6 decimal places
      longitude: Math.round(currentLon * 1000000) / 1000000,
      progress: Math.round(progress * 100) / 100,
    };
  }

  static isTimeDuringTrip(trip: { departureAt: Date; arrivalAt: Date }, checkTime: Date): boolean {
    return checkTime >= trip.departureAt && checkTime <= trip.arrivalAt;
  }

  static formatDuration(milliseconds: number): string {
    const totalMinutes = Math.round(milliseconds / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) {
      return `${minutes}m`;
    }

    return `${hours}h ${minutes}m`;
  }
}

export class DateUtils {
  static parseISOString(isoString: string): Date {
    const date = new Date(isoString);

    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: ${isoString}`);
    }

    return date;
  }

  static isPast(date: Date, now: Date = new Date()): boolean {
    return date < now;
  }

  static isFuture(date: Date, now: Date = new Date()): boolean {
    return date > now;
  }

  static addMilliseconds(date: Date, milliseconds: number): Date {
    return new Date(date.getTime() + milliseconds);
  }
}
