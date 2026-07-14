import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "../drizzle/client";
import { workspace } from "../drizzle/schema";

export const auth = betterAuth({
  // AuthModule은 Nest의 setGlobalPrefix를 우회해 이 경로에 직접 마운트되므로,
  // architecture.md 계약(POST/GET /api/auth/*)에 맞춰 basePath에 api를 직접 포함한다.
  basePath: "/api/auth",
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
  },
  // 브라우저는 프론트(:5173, Vite dev proxy) 오리진으로 요청하므로 둘 다 신뢰해야 한다.
  trustedOrigins: [
    process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
    "http://localhost:5173",
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const existing = await db.query.workspace.findFirst({
            where: eq(workspace.userId, user.id),
          });
          if (!existing) {
            await db.insert(workspace).values({
              userId: user.id,
              name: `${user.name || user.email}의 워크스페이스`,
            });
          }
        },
      },
    },
  },
});
