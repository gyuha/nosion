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
  return { cookie: res.headers["set-cookie"], userId: res.body.user.id };
}

describe("Pages (e2e)", () => {
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
    for (const u of rows.filter((r) => /^pages-\d+-/.test(r.email))) {
      await db.delete(user).where(eq(user.id, u.id));
    }
    await app.close();
  });

  it("페이지를 생성·조회·이름변경·이동·삭제(소프트)할 수 있다", async () => {
    const { cookie } = await signUp(app, "pages");
    const http = request(app.getHttpServer());

    // 최상위 문서 페이지 생성
    const root = await http
      .post("/api/pages")
      .set("Cookie", cookie)
      .send({ type: "document" })
      .expect(201);
    expect(root.body.title).toBe("제목 없음");

    // 하위 페이지 3단 중첩 생성
    const child = await http
      .post("/api/pages")
      .set("Cookie", cookie)
      .send({ type: "document", parentId: root.body.id })
      .expect(201);
    const grandchild = await http
      .post("/api/pages")
      .set("Cookie", cookie)
      .send({ type: "database", parentId: child.body.id })
      .expect(201);

    // 트리 조회: 3단 중첩이 반영되어야 함
    const tree = await http.get("/api/pages/tree").set("Cookie", cookie).expect(200);
    const rootNode = tree.body.find((n: any) => n.id === root.body.id);
    expect(rootNode.children[0].id).toBe(child.body.id);
    expect(rootNode.children[0].children[0].id).toBe(grandchild.body.id);

    // 이름 변경
    await http
      .patch(`/api/pages/${root.body.id}`)
      .set("Cookie", cookie)
      .send({ title: "새 제목" })
      .expect(200);
    const afterRename = await http
      .get(`/api/pages/${root.body.id}`)
      .set("Cookie", cookie)
      .expect(200);
    expect(afterRename.body.title).toBe("새 제목");

    // 이동: grandchild를 최상위로
    await http
      .post(`/api/pages/${grandchild.body.id}/move`)
      .set("Cookie", cookie)
      .send({ parentId: null, position: 0 })
      .expect(201);
    const treeAfterMove = await http
      .get("/api/pages/tree")
      .set("Cookie", cookie)
      .expect(200);
    expect(
      treeAfterMove.body.some((n: any) => n.id === grandchild.body.id),
    ).toBe(true);

    // 삭제(소프트): 트리에서 사라져야 함
    await http.delete(`/api/pages/${root.body.id}`).set("Cookie", cookie).expect(200);
    const treeAfterDelete = await http
      .get("/api/pages/tree")
      .set("Cookie", cookie)
      .expect(200);
    expect(treeAfterDelete.body.some((n: any) => n.id === root.body.id)).toBe(
      false,
    );
  });

  it("워크스페이스 격리: 타 계정의 페이지는 조회/수정할 수 없다", async () => {
    const userA = await signUp(app, "pages");
    const userB = await signUp(app, "pages");
    const http = request(app.getHttpServer());

    const pageA = await http
      .post("/api/pages")
      .set("Cookie", userA.cookie)
      .send({ type: "document" })
      .expect(201);

    await http
      .get(`/api/pages/${pageA.body.id}`)
      .set("Cookie", userB.cookie)
      .expect(404);
    await http
      .patch(`/api/pages/${pageA.body.id}`)
      .set("Cookie", userB.cookie)
      .send({ title: "탈취 시도" })
      .expect(404);
  });
});
