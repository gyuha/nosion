import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { eq } from "drizzle-orm";
import { AppModule } from "../src/app.module";
import { db } from "../src/drizzle/client";
import { user } from "../src/drizzle/schema";

function uniqueEmail(tag: string) {
  return `${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function signUp(app: INestApplication, tag: string) {
  const res = await request(app.getHttpServer())
    .post("/api/auth/sign-up/email")
    .send({ email: uniqueEmail(tag), password: "password123", name: tag })
    .expect(200);
  return res.headers["set-cookie"];
}

describe("Documents (e2e)", () => {
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
    const rows = await db.select().from(user);
    for (const u of rows.filter((r) => /^docs-\d+-/.test(r.email))) {
      await db.delete(user).where(eq(user.id, u.id));
    }
    await app.close();
  });

  it("본문이 없으면 빈 배열을 반환하고, 저장 후 그대로 조회된다", async () => {
    const cookie = await signUp(app, "docs");
    const http = request(app.getHttpServer());

    const page = await http
      .post("/api/pages")
      .set("Cookie", cookie)
      .send({ type: "document" })
      .expect(201);

    const empty = await http
      .get(`/api/pages/${page.body.id}/content`)
      .set("Cookie", cookie)
      .expect(200);
    expect(empty.body.content).toEqual([]);

    const blocks = [{ type: "paragraph", content: "안녕하세요" }];
    await http
      .put(`/api/pages/${page.body.id}/content`)
      .set("Cookie", cookie)
      .send({ content: blocks })
      .expect(200);

    const saved = await http
      .get(`/api/pages/${page.body.id}/content`)
      .set("Cookie", cookie)
      .expect(200);
    expect(saved.body.content).toEqual(blocks);
  });

  it("워크스페이스 격리: 타 계정의 문서 본문에 접근할 수 없다", async () => {
    const cookieA = await signUp(app, "docs");
    const cookieB = await signUp(app, "docs");
    const http = request(app.getHttpServer());

    const page = await http
      .post("/api/pages")
      .set("Cookie", cookieA)
      .send({ type: "document" })
      .expect(201);

    await http
      .get(`/api/pages/${page.body.id}/content`)
      .set("Cookie", cookieB)
      .expect(404);
    await http
      .put(`/api/pages/${page.body.id}/content`)
      .set("Cookie", cookieB)
      .send({ content: [] })
      .expect(404);
  });
});
