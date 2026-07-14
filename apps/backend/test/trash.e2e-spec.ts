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

describe("Trash (e2e)", () => {
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
    for (const u of rows.filter((r) => /^trash-\d+-/.test(r.email))) {
      await db.delete(user).where(eq(user.id, u.id));
    }
    await app.close();
  });

  it("삭제 시 하위 페이지까지 트리·휴지통 목록에서 함께 이동하고, 복원하면 되돌아온다", async () => {
    const cookie = await signUp(app, "trash");
    const http = request(app.getHttpServer());

    const parent = await http
      .post("/api/pages")
      .set("Cookie", cookie)
      .send({ type: "document" })
      .expect(201);
    const child = await http
      .post("/api/pages")
      .set("Cookie", cookie)
      .send({ type: "document", parentId: parent.body.id })
      .expect(201);

    await http.delete(`/api/pages/${parent.body.id}`).set("Cookie", cookie).expect(200);

    const treeAfterDelete = await http
      .get("/api/pages/tree")
      .set("Cookie", cookie)
      .expect(200);
    expect(treeAfterDelete.body).toHaveLength(0);

    const trash = await http.get("/api/trash").set("Cookie", cookie).expect(200);
    const trashIds = trash.body.map((t: any) => t.id);
    expect(trashIds).toEqual(expect.arrayContaining([parent.body.id, child.body.id]));

    await http.post(`/api/pages/${parent.body.id}/restore`).set("Cookie", cookie).expect(201);

    const treeAfterRestore = await http
      .get("/api/pages/tree")
      .set("Cookie", cookie)
      .expect(200);
    expect(treeAfterRestore.body).toHaveLength(1);
    expect(treeAfterRestore.body[0].children).toHaveLength(1);
  });

  it("부모가 휴지통에 있을 때 자식만 복원하면 최상위로 복원된다", async () => {
    const cookie = await signUp(app, "trash");
    const http = request(app.getHttpServer());

    const parent = await http
      .post("/api/pages")
      .set("Cookie", cookie)
      .send({ type: "document" })
      .expect(201);
    const child = await http
      .post("/api/pages")
      .set("Cookie", cookie)
      .send({ type: "document", parentId: parent.body.id })
      .expect(201);

    await http.delete(`/api/pages/${parent.body.id}`).set("Cookie", cookie).expect(200);
    // 자식만 복원(부모는 여전히 휴지통에 있음)
    await http.post(`/api/pages/${child.body.id}/restore`).set("Cookie", cookie).expect(201);

    const tree = await http.get("/api/pages/tree").set("Cookie", cookie).expect(200);
    expect(tree.body.some((n: any) => n.id === child.body.id)).toBe(true);
  });

  it("영구 삭제하면 데이터가 실제로 제거되고 복원할 수 없다", async () => {
    const cookie = await signUp(app, "trash");
    const http = request(app.getHttpServer());

    const target = await http
      .post("/api/pages")
      .set("Cookie", cookie)
      .send({ type: "document" })
      .expect(201);
    await http.delete(`/api/pages/${target.body.id}`).set("Cookie", cookie).expect(200);
    await http
      .delete(`/api/pages/${target.body.id}/permanent`)
      .set("Cookie", cookie)
      .expect(200);

    const trash = await http.get("/api/trash").set("Cookie", cookie).expect(200);
    expect(trash.body.some((t: any) => t.id === target.body.id)).toBe(false);

    await http
      .post(`/api/pages/${target.body.id}/restore`)
      .set("Cookie", cookie)
      .expect(404);
  });
});
