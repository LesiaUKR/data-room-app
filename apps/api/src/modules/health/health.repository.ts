import { type DatabaseClient } from '../../libs/modules/database/index.js';

class HealthRepository {
  private readonly database: DatabaseClient;

  public constructor(database: DatabaseClient) {
    this.database = database;
  }

  /** The cheapest possible round trip: proves the connection works without reading a table. */
  public async ping(): Promise<void> {
    await this.database.$queryRaw`SELECT 1`;
  }
}

export { HealthRepository };
