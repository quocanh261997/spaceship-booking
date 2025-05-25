import { Location } from '../../modules/location/location.entity';
import { Spaceship } from '../../modules/spaceship/spaceship.entity';
import { getDataSource } from '../../config/database.config';

async function seed() {
  const dataSource = getDataSource();
  try {
    await dataSource.initialize();
    console.log('🌱 Starting database seed...');

    // Clear existing data
    await dataSource.query('TRUNCATE TABLE trips CASCADE');
    await dataSource.query('TRUNCATE TABLE spaceships CASCADE');
    await dataSource.query('TRUNCATE TABLE locations CASCADE');

    // Seed locations
    const locationRepo = dataSource.getRepository(Location);
    const locations = await locationRepo.save([
      { code: 'JFK', latitude: 40.6413, longitude: -73.7781 },
      { code: 'SFO', latitude: 37.6213, longitude: -122.379 },
      { code: 'LAX', latitude: 33.9416, longitude: -118.4085 },
    ]);
    console.log(`✅ Seeded ${locations.length} locations`);

    // Seed spaceships
    const spaceshipRepo = dataSource.getRepository(Spaceship);
    const spaceships = await spaceshipRepo.save([
      { id: 'SS-001', name: 'Galactic Voyager', currentLocationCode: 'JFK' },
      { id: 'SS-002', name: 'Star Hopper', currentLocationCode: 'JFK' },
      { id: 'SS-003', name: 'Cosmic Cruiser', currentLocationCode: 'SFO' },
    ]);
    console.log(`✅ Seeded ${spaceships.length} spaceships`);

    console.log('🎉 Database seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

seed();
