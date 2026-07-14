import * as path from "node:path";
import * as dotenv from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

// main.ts는 부트스트랩 시 이미 .env를 로드하지만, 이 클라이언트를 직접 import하는
// 테스트 실행 경로(jest 등)에는 그 부트스트랩이 없으므로 여기서도 로드해 둔다.
dotenv.config({ path: path.resolve(__dirname, "../../../../.env") });

const connectionString =
  process.env.DATABASE_URL ??
  "postgres://nosion:nosion@localhost:5432/nosion";

const queryClient = postgres(connectionString);

export const db = drizzle(queryClient, { schema });
