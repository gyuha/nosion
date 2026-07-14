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

describe("Search (e2e)", () => {
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
    for (const u of rows.filter((r) => /^search-\d+-/.test(r.email))) {
      await db.delete(user).where(eq(user.id, u.id));
    }
    await app.close();
  });

  it("제목 매칭으로 검색되고, 본문 저장 직후 본문 텍스트로도 검색된다", async () => {
    const cookie = await signUp(app, "search");
    const http = request(app.getHttpServer());

    const titled = await http
      .post("/api/pages")
      .set("Cookie", cookie)
      .send({ type: "document" })
      .expect(201);
    await http
      .patch(`/api/pages/${titled.body.id}`)
      .set("Cookie", cookie)
      .send({ title: "제목검색대상문서" })
      .expect(200);

    const bodyPage = await http
      .post("/api/pages")
      .set("Cookie", cookie)
      .send({ type: "document" })
      .expect(201);
    await http
      .put(`/api/pages/${bodyPage.body.id}/content`)
      .set("Cookie", cookie)
      .send({
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "안녕하세요 한국어 본문검색테스트", styles: {} },
            ],
          },
        ],
      })
      .expect(200);

    const byTitle = await http
      .get("/api/search")
      .query({ q: "제목검색대상" })
      .set("Cookie", cookie)
      .expect(200);
    expect(byTitle.body.results.some((r: any) => r.pageId === titled.body.id)).toBe(true);

    const byBody = await http
      .get("/api/search")
      .query({ q: "본문검색테스트" })
      .set("Cookie", cookie)
      .expect(200);
    expect(byBody.body.results.some((r: any) => r.pageId === bodyPage.body.id)).toBe(true);
  });

  it("휴지통에 있는 페이지는 검색 결과에서 제외된다", async () => {
    const cookie = await signUp(app, "search");
    const http = request(app.getHttpServer());

    const trashed = await http
      .post("/api/pages")
      .set("Cookie", cookie)
      .send({ type: "document" })
      .expect(201);
    await http
      .patch(`/api/pages/${trashed.body.id}`)
      .set("Cookie", cookie)
      .send({ title: "휴지통검색제외테스트" })
      .expect(200);

    let results = await http
      .get("/api/search")
      .query({ q: "휴지통검색제외" })
      .set("Cookie", cookie)
      .expect(200);
    expect(results.body.results.some((r: any) => r.pageId === trashed.body.id)).toBe(true);

    await http.delete(`/api/pages/${trashed.body.id}`).set("Cookie", cookie).expect(200);

    results = await http
      .get("/api/search")
      .query({ q: "휴지통검색제외" })
      .set("Cookie", cookie)
      .expect(200);
    expect(results.body.results.some((r: any) => r.pageId === trashed.body.id)).toBe(false);
  });

  it("워크스페이스 격리: 타 계정의 페이지는 검색되지 않는다", async () => {
    const cookieA = await signUp(app, "search");
    const cookieB = await signUp(app, "search");
    const http = request(app.getHttpServer());

    const pageA = await http
      .post("/api/pages")
      .set("Cookie", cookieA)
      .send({ type: "document" })
      .expect(201);
    await http
      .patch(`/api/pages/${pageA.body.id}`)
      .set("Cookie", cookieA)
      .send({ title: "격리검색테스트문서" })
      .expect(200);

    const results = await http
      .get("/api/search")
      .query({ q: "격리검색테스트" })
      .set("Cookie", cookieB)
      .expect(200);
    expect(results.body.results.some((r: any) => r.pageId === pageA.body.id)).toBe(false);
  });
});
