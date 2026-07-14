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

describe("Page decor (icon/cover) (e2e)", () => {
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
    for (const u of rows.filter((r) => /^decor-\d+-/.test(r.email))) {
      await db.delete(user).where(eq(user.id, u.id));
    }
    await app.close();
  });

  it("아이콘·커버를 설정·변경·제거할 수 있다", async () => {
    const cookie = await signUp(app, "decor");
    const http = request(app.getHttpServer());

    const created = await http
      .post("/api/pages")
      .set("Cookie", cookie)
      .send({ type: "document" })
      .expect(201);
    expect(created.body.icon).toBeNull();
    expect(created.body.cover).toBeNull();

    await http
      .patch(`/api/pages/${created.body.id}`)
      .set("Cookie", cookie)
      .send({ icon: "🚀", cover: "blue" })
      .expect(200);

    let detail = await http
      .get(`/api/pages/${created.body.id}`)
      .set("Cookie", cookie)
      .expect(200);
    expect(detail.body.icon).toBe("🚀");
    expect(detail.body.cover).toBe("blue");

    await http
      .patch(`/api/pages/${created.body.id}`)
      .set("Cookie", cookie)
      .send({ icon: "🎯", cover: "sunset" })
      .expect(200);
    detail = await http
      .get(`/api/pages/${created.body.id}`)
      .set("Cookie", cookie)
      .expect(200);
    expect(detail.body.icon).toBe("🎯");
    expect(detail.body.cover).toBe("sunset");

    await http
      .patch(`/api/pages/${created.body.id}`)
      .set("Cookie", cookie)
      .send({ icon: null, cover: null })
      .expect(200);
    detail = await http
      .get(`/api/pages/${created.body.id}`)
      .set("Cookie", cookie)
      .expect(200);
    expect(detail.body.icon).toBeNull();
    expect(detail.body.cover).toBeNull();
  });
});
