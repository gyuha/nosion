import { Global, Module } from "@nestjs/common";
import { db } from "./client";

export const DRIZZLE = Symbol("DRIZZLE_CONNECTION");

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      useValue: db,
    },
  ],
  exports: [DRIZZLE],
})
export class DrizzleModule {}
