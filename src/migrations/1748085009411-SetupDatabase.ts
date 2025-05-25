import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class SetupDatabase1748085009411 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create locations table
    await queryRunner.createTable(
      new Table({
        name: 'locations',
        columns: [
          {
            name: 'code',
            type: 'varchar',
            length: '3',
            isPrimary: true,
            comment: 'IATA airport code',
          },
          {
            name: 'latitude',
            type: 'decimal',
            precision: 10,
            scale: 6,
            isNullable: false,
            comment: 'Latitude coordinate',
          },
          {
            name: 'longitude',
            type: 'decimal',
            precision: 10,
            scale: 6,
            isNullable: false,
            comment: 'Longitude coordinate',
          },
        ],
      }),
      true,
    );

    // Create spaceships table
    await queryRunner.createTable(
      new Table({
        name: 'spaceships',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            isPrimary: true,
            comment: 'Unique spaceship identifier (e.g., SS-001)',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false,
            comment: 'Friendly name of the spaceship',
          },
          {
            name: 'current_location_code',
            type: 'varchar',
            length: '3',
            isNullable: false,
            comment: 'Current location IATA code',
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create trips table
    await queryRunner.createTable(
      new Table({
        name: 'trips',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'uuid',
            comment: 'Unique trip identifier',
          },
          {
            name: 'spaceship_id',
            type: 'varchar',
            isNullable: false,
            comment: 'Assigned spaceship for this trip',
          },
          {
            name: 'departure_location_code',
            type: 'varchar',
            length: '3',
            isNullable: false,
            comment: 'Departure airport IATA code',
          },
          {
            name: 'destination_location_code',
            type: 'varchar',
            length: '3',
            isNullable: false,
            comment: 'Destination airport IATA code',
          },
          {
            name: 'departure_at',
            type: 'timestamptz',
            isNullable: false,
            comment: 'Scheduled departure time',
          },
          {
            name: 'arrival_at',
            type: 'timestamptz',
            isNullable: false,
            comment: 'Estimated arrival time',
          },
          {
            name: 'status',
            type: 'varchar',
            default: "'SCHEDULED'",
            comment: 'Current status of the trip',
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Add foreign key constraints
    await queryRunner.createForeignKeys('spaceships', [
      new TableForeignKey({
        columnNames: ['current_location_code'],
        referencedTableName: 'locations',
        referencedColumnNames: ['code'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    ]);

    await queryRunner.createForeignKeys('trips', [
      new TableForeignKey({
        columnNames: ['spaceship_id'],
        referencedTableName: 'spaceships',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['departure_location_code'],
        referencedTableName: 'locations',
        referencedColumnNames: ['code'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
      new TableForeignKey({
        columnNames: ['destination_location_code'],
        referencedTableName: 'locations',
        referencedColumnNames: ['code'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    ]);

    // Add status enum constraint
    await queryRunner.query(
      `ALTER TABLE "trips" ADD CONSTRAINT "CHK_trips_status" CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'))`,
    );

    // Add departure before arrival constraint
    await queryRunner.query(
      `ALTER TABLE "trips" ADD CONSTRAINT "CHK_trips_departure_before_arrival" CHECK (departure_at < arrival_at)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints first
    const spaceshipsTable = await queryRunner.getTable('spaceships');
    const tripsTable = await queryRunner.getTable('trips');

    if (spaceshipsTable) {
      const foreignKey1 = spaceshipsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('current_location_code') !== -1,
      );
      if (foreignKey1) {
        await queryRunner.dropForeignKey('spaceships', foreignKey1);
      }
    }

    if (tripsTable) {
      const foreignKey1 = tripsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('spaceship_id') !== -1,
      );
      const foreignKey2 = tripsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('departure_location_code') !== -1,
      );
      const foreignKey3 = tripsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('destination_location_code') !== -1,
      );

      if (foreignKey1) await queryRunner.dropForeignKey('trips', foreignKey1);
      if (foreignKey2) await queryRunner.dropForeignKey('trips', foreignKey2);
      if (foreignKey3) await queryRunner.dropForeignKey('trips', foreignKey3);
    }

    // Drop tables in reverse order
    await queryRunner.dropTable('trips');
    await queryRunner.dropTable('spaceships');
    await queryRunner.dropTable('locations');
  }
}
