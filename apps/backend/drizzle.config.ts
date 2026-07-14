import * as path from "node:path";
import * as dotenv from "dotenv";
import type { Config } from "drizzle-kit";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export default {
  schema: "./src/drizzle/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgres://nosion:nosion@localhost:5432/nosion",
  },
} satisfies Config;
