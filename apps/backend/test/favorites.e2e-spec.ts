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

describe("Favorites (e2e)", () => {
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
    for (const u of rows.filter((r) => /^fav-\d+-/.test(r.email))) {
      await db.delete(user).where(eq(user.id, u.id));
    }
    await app.close();
  });

  it("is_favorite를 켜고 끌 수 있고, 트리 조회에 반영된다", async () => {
    const cookie = await signUp(app, "fav");
    const http = request(app.getHttpServer());

    const created = await http
      .post("/api/pages")
      .set("Cookie", cookie)
      .send({ type: "document" })
      .expect(201);
    expect(created.body.isFavorite).toBe(false);

    await http
      .patch(`/api/pages/${created.body.id}`)
      .set("Cookie", cookie)
      .send({ isFavorite: true })
      .expect(200);

    let tree = await http.get("/api/pages/tree").set("Cookie", cookie).expect(200);
    expect(tree.body.find((n: any) => n.id === created.body.id).isFavorite).toBe(true);

    await http
      .patch(`/api/pages/${created.body.id}`)
      .set("Cookie", cookie)
      .send({ isFavorite: false })
      .expect(200);

    tree = await http.get("/api/pages/tree").set("Cookie", cookie).expect(200);
    expect(tree.body.find((n: any) => n.id === created.body.id).isFavorite).toBe(false);
  });

  it("삭제(휴지통 이동)된 페이지는 트리 조회에서 사라지므로 즐겨찾기 섹션에도 나타나지 않는다", async () => {
    const cookie = await signUp(app, "fav");
    const http = request(app.getHttpServer());

    const created = await http
      .post("/api/pages")
      .set("Cookie", cookie)
      .send({ type: "document" })
      .expect(201);
    await http
      .patch(`/api/pages/${created.body.id}`)
      .set("Cookie", cookie)
      .send({ isFavorite: true })
      .expect(200);

    await http.delete(`/api/pages/${created.body.id}`).set("Cookie", cookie).expect(200);

    const tree = await http.get("/api/pages/tree").set("Cookie", cookie).expect(200);
    expect(tree.body.some((n: any) => n.id === created.body.id)).toBe(false);
  });
});
