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

describe("Views (e2e)", () => {
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
    for (const u of rows.filter((r) => /^views-\d+-/.test(r.email))) {
      await db.delete(user).where(eq(user.id, u.id));
    }
    await app.close();
  });

  it("데이터베이스에는 기본 테이블 뷰가 1개 있고, 뷰를 추가·전환·삭제할 수 있다", async () => {
    const cookie = await signUp(app, "views");
    const http = request(app.getHttpServer());

    const dbPage = await http
      .post("/api/pages")
      .set("Cookie", cookie)
      .send({ type: "database" })
      .expect(201);

    let database = await http
      .get(`/api/databases/${dbPage.body.id}`)
      .set("Cookie", cookie)
      .expect(200);
    expect(database.body.views).toHaveLength(1);
    expect(database.body.views[0].type).toBe("table");

    const boardView = await http
      .post(`/api/databases/${dbPage.body.id}/views`)
      .set("Cookie", cookie)
      .send({ name: "보드", type: "board" })
      .expect(201);

    database = await http
      .get(`/api/databases/${dbPage.body.id}`)
      .set("Cookie", cookie)
      .expect(200);
    expect(database.body.views).toHaveLength(2);

    await http
      .delete(`/api/databases/${dbPage.body.id}/views/${boardView.body.id}`)
      .set("Cookie", cookie)
      .expect(200);
    database = await http
      .get(`/api/databases/${dbPage.body.id}`)
      .set("Cookie", cookie)
      .expect(200);
    expect(database.body.views).toHaveLength(1);
  });

  it("뷰 config(필터·정렬·그룹기준)를 저장할 수 있다", async () => {
    const cookie = await signUp(app, "views");
    const http = request(app.getHttpServer());

    const dbPage = await http
      .post("/api/pages")
      .set("Cookie", cookie)
      .send({ type: "database" })
      .expect(201);
    const prop = await http
      .post(`/api/databases/${dbPage.body.id}/properties`)
      .set("Cookie", cookie)
      .send({ name: "상태", type: "select", config: { options: [{ id: "todo", label: "할일" }] } })
      .expect(201);

    const database1 = await http
      .get(`/api/databases/${dbPage.body.id}`)
      .set("Cookie", cookie)
      .expect(200);
    const tableViewId = database1.body.views[0].id;

    await http
      .patch(`/api/databases/${dbPage.body.id}/views/${tableViewId}`)
      .set("Cookie", cookie)
      .send({
        config: {
          filter: [{ propertyId: prop.body.id, value: "todo" }],
          sort: { propertyId: prop.body.id, direction: "asc" },
          groupPropertyId: prop.body.id,
        },
      })
      .expect(200);

    const database2 = await http
      .get(`/api/databases/${dbPage.body.id}`)
      .set("Cookie", cookie)
      .expect(200);
    const view = database2.body.views.find((v: any) => v.id === tableViewId);
    expect(view.config.sort).toEqual({ propertyId: prop.body.id, direction: "asc" });
    expect(view.config.groupPropertyId).toBe(prop.body.id);
  });
});
