import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";
dotenv.config();

export class MongoDBService {
    private static uri = process.env.DB_CONNECTION;
    private static dbName = "strapex-events";
    private static client: MongoClient;
  
    static async getClient() {
      if (!this.client) {
        if (!this.uri) {
          throw new Error("DB_CONNECTION is not defined in the environment variables.");
        }
        this.client = new MongoClient(this.uri);
        await this.client.connect();
        console.log("Connected to MongoDB");
      }
      return this.client;
    }
  
    static async getDb() {
      const client = await this.getClient();
      return client.db(this.dbName);
    }
}