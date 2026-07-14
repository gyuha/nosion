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

describe("Databases (e2e)", () => {
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
    for (const u of rows.filter((r) => /^dbcore-\d+-/.test(r.email))) {
      await db.delete(user).where(eq(user.id, u.id));
    }
    await app.close();
  });

  it("속성 6종을 추가하고 값을 편집할 수 있다", async () => {
    const cookie = await signUp(app, "dbcore");
    const http = request(app.getHttpServer());

    const dbPage = await http
      .post("/api/pages")
      .set("Cookie", cookie)
      .send({ type: "database" })
      .expect(201);

    const types: Array<[string, string, object?]> = [
      ["텍스트", "text"],
      ["숫자", "number"],
      ["셀렉트", "select", { options: [{ id: "opt1", label: "옵션1" }] }],
      ["다중셀렉트", "multi_select", { options: [{ id: "opt1", label: "옵션1" }] }],
      ["날짜", "date"],
      ["체크박스", "checkbox"],
    ];
    const propertyIds: Record<string, string> = {};
    for (const [name, type, config] of types) {
      const res = await http
        .post(`/api/databases/${dbPage.body.id}/properties`)
        .set("Cookie", cookie)
        .send({ name, type, config })
        .expect(201);
      propertyIds[type] = res.body.id;
    }

    const row = await http
      .post(`/api/databases/${dbPage.body.id}/rows`)
      .set("Cookie", cookie)
      .expect(201);

    await http
      .patch(`/api/rows/${row.body.id}/values/${propertyIds.text}`)
      .set("Cookie", cookie)
      .send({ value: "안녕" })
      .expect(200);
    await http
      .patch(`/api/rows/${row.body.id}/values/${propertyIds.number}`)
      .set("Cookie", cookie)
      .send({ value: 42 })
      .expect(200);
    await http
      .patch(`/api/rows/${row.body.id}/values/${propertyIds.checkbox}`)
      .set("Cookie", cookie)
      .send({ value: true })
      .expect(200);

    const database = await http
      .get(`/api/databases/${dbPage.body.id}`)
      .set("Cookie", cookie)
      .expect(200);
    expect(database.body.properties).toHaveLength(6);
    const savedRow = database.body.rows.find((r: any) => r.pageId === row.body.id);
    expect(savedRow.values[propertyIds.text]).toBe("안녕");
    expect(savedRow.values[propertyIds.number]).toBe(42);
    expect(savedRow.values[propertyIds.checkbox]).toBe(true);
  });

  it("속성 이름·타입을 변경하고 삭제할 수 있다", async () => {
    const cookie = await signUp(app, "dbcore");
    const http = request(app.getHttpServer());

    const dbPage = await http
      .post("/api/pages")
      .set("Cookie", cookie)
      .send({ type: "database" })
      .expect(201);
    const prop = await http
      .post(`/api/databases/${dbPage.body.id}/properties`)
      .set("Cookie", cookie)
      .send({ name: "원래이름", type: "text" })
      .expect(201);

    await http
      .patch(`/api/databases/${dbPage.body.id}/properties/${prop.body.id}`)
      .set("Cookie", cookie)
      .send({ name: "바뀐이름", type: "number" })
      .expect(200);

    let database = await http
      .get(`/api/databases/${dbPage.body.id}`)
      .set("Cookie", cookie)
      .expect(200);
    expect(database.body.properties[0].name).toBe("바뀐이름");
    expect(database.body.properties[0].type).toBe("number");

    await http
      .delete(`/api/databases/${dbPage.body.id}/properties/${prop.body.id}`)
      .set("Cookie", cookie)
      .expect(200);
    database = await http
      .get(`/api/databases/${dbPage.body.id}`)
      .set("Cookie", cookie)
      .expect(200);
    expect(database.body.properties).toHaveLength(0);
  });

  it("행을 추가·삭제할 수 있고, 행 페이지는 문서 콘텐츠 편집이 가능하다", async () => {
    const cookie = await signUp(app, "dbcore");
    const http = request(app.getHttpServer());

    const dbPage = await http
      .post("/api/pages")
      .set("Cookie", cookie)
      .send({ type: "database" })
      .expect(201);
    const row = await http
      .post(`/api/databases/${dbPage.body.id}/rows`)
      .set("Cookie", cookie)
      .expect(201);
    expect(row.body.isRow).toBe(true);

    // 행 페이지는 본문(document content) 편집이 가능해야 한다.
    await http
      .put(`/api/pages/${row.body.id}/content`)
      .set("Cookie", cookie)
      .send({ content: [{ type: "paragraph", content: "행 본문" }] })
      .expect(200);

    let database = await http
      .get(`/api/databases/${dbPage.body.id}`)
      .set("Cookie", cookie)
      .expect(200);
    expect(database.body.rows).toHaveLength(1);

    await http.delete(`/api/pages/${row.body.id}`).set("Cookie", cookie).expect(200);
    database = await http
      .get(`/api/databases/${dbPage.body.id}`)
      .set("Cookie", cookie)
      .expect(200);
    expect(database.body.rows).toHaveLength(0);
  });

  it("워크스페이스 격리: 타 계정의 데이터베이스에 접근할 수 없다", async () => {
    const cookieA = await signUp(app, "dbcore");
    const cookieB = await signUp(app, "dbcore");
    const http = request(app.getHttpServer());

    const dbPage = await http
      .post("/api/pages")
      .set("Cookie", cookieA)
      .send({ type: "database" })
      .expect(201);

    await http
      .get(`/api/databases/${dbPage.body.id}`)
      .set("Cookie", cookieB)
      .expect(404);
    await http
      .post(`/api/databases/${dbPage.body.id}/properties`)
      .set("Cookie", cookieB)
      .send({ name: "탈취", type: "text" })
      .expect(404);
  });
});
