import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { eq } from "drizzle-orm";
import { AppModule } from "../src/app.module";
import { db } from "../src/drizzle/client";
import { user, workspace } from "../src/drizzle/schema";

function uniqueEmail(tag: string) {
  return `${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

describe("Auth + Workspace (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("가입하면 워크스페이스가 정확히 1개 자동 생성된다", async () => {
    const email = uniqueEmail("signup");
    const res = await request(app.getHttpServer())
      .post("/api/auth/sign-up/email")
      .send({ email, password: "password123", name: "Signup User" })
      .expect(200);

    const userId = res.body.user.id as string;
    const rows = await db
      .select()
      .from(workspace)
      .where(eq(workspace.userId, userId));
    expect(rows).toHaveLength(1);
  });

  it("미인증 요청은 401을 반환한다", async () => {
    await request(app.getHttpServer()).get("/api/me").expect(401);
  });

  it("워크스페이스 격리: 서로 다른 계정은 서로 다른 workspaceId를 가지며 자신의 것만 조회된다", async () => {
    const emailA = uniqueEmail("iso-a");
    const emailB = uniqueEmail("iso-b");

    const signUpA = await request(app.getHttpServer())
      .post("/api/auth/sign-up/email")
      .send({ email: emailA, password: "password123", name: "User A" })
      .expect(200);
    const cookieA = signUpA.headers["set-cookie"];

    const signUpB = await request(app.getHttpServer())
      .post("/api/auth/sign-up/email")
      .send({ email: emailB, password: "password123", name: "User B" })
      .expect(200);
    const cookieB = signUpB.headers["set-cookie"];

    const meA = await request(app.getHttpServer())
      .get("/api/me")
      .set("Cookie", cookieA)
      .expect(200);
    const meB = await request(app.getHttpServer())
      .get("/api/me")
      .set("Cookie", cookieB)
      .expect(200);

    expect(meA.body.userId).not.toBe(meB.body.userId);
    expect(meA.body.workspaceId).not.toBe(meB.body.workspaceId);
    expect(meA.body.userId).toBe(signUpA.body.user.id);
    expect(meB.body.userId).toBe(signUpB.body.user.id);
  });

  afterAll(async () => {
    // 테스트가 만든 유저를 정리(간단한 이메일 패턴으로 식별)
    const rows = await db.select().from(user);
    const testUsers = rows.filter((u) =>
      /^(signup|iso-a|iso-b)-\d+-/.test(u.email),
    );
    for (const u of testUsers) {
      await db.delete(user).where(eq(user.id, u.id));
    }
  });
});
