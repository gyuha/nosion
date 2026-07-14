import { Global, Module } from "@nestjs/common";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

export const DRIZZLE = Symbol("DRIZZLE_CONNECTION");

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      useFactory: () => {
        const connectionString =
          process.env.DATABASE_URL ??
          "postgres://nosion:nosion@localhost:5432/nosion";
        const client = postgres(connectionString);
        return drizzle(client);
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DrizzleModule {}
