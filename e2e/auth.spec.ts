import { test, expect } from "@playwright/test";

function uniqueEmail(tag: string) {
  return `${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

test("가입하면 자동으로 워크스페이스(홈 화면)에 진입한다", async ({ page }) => {
  await page.goto("/login");
  await page.getByText("계정이 없나요? 가입").click();
  await page.getByPlaceholder("이름").fill("E2E User");
  await page.getByPlaceholder("이메일").fill(uniqueEmail("e2e-signup"));
  await page.getByPlaceholder("비밀번호").fill("password123");
  await page.getByRole("button", { name: "가입하기" }).click();

  await expect(page).toHaveURL("/");
  await expect(page.getByText("Nosion")).toBeVisible();
});

test("로그아웃하면 보호 경로 접근이 차단된다", async ({ page }) => {
  await page.goto("/login");
  await page.getByText("계정이 없나요? 가입").click();
  await page.getByPlaceholder("이름").fill("E2E Logout User");
  await page.getByPlaceholder("이메일").fill(uniqueEmail("e2e-logout"));
  await page.getByPlaceholder("비밀번호").fill("password123");
  await page.getByRole("button", { name: "가입하기" }).click();
  await expect(page).toHaveURL("/");

  await page.getByText("로그아웃").click();
  await expect(page).toHaveURL("/login");

  // 보호 경로(홈)에 직접 접근하면 로그인 화면으로 리다이렉트된다.
  await page.goto("/");
  await expect(page).toHaveURL("/login");
});

test("워크스페이스 격리: 서로 다른 계정은 서로 다른 workspaceId를 가진다", async ({
  browser,
}) => {
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();

  const emailA = uniqueEmail("e2e-iso-a");
  const emailB = uniqueEmail("e2e-iso-b");

  const resA = await contextA.request.post("/api/auth/sign-up/email", {
    data: { email: emailA, password: "password123", name: "Iso A" },
  });
  expect(resA.ok()).toBeTruthy();

  const resB = await contextB.request.post("/api/auth/sign-up/email", {
    data: { email: emailB, password: "password123", name: "Iso B" },
  });
  expect(resB.ok()).toBeTruthy();

  const meA = await (await contextA.request.get("/api/me")).json();
  const meB = await (await contextB.request.get("/api/me")).json();

  expect(meA.workspaceId).toBeTruthy();
  expect(meB.workspaceId).toBeTruthy();
  expect(meA.workspaceId).not.toBe(meB.workspaceId);
  expect(meA.userId).not.toBe(meB.userId);

  // 타 계정 컨텍스트(쿠키 없음)로는 어느 워크스페이스 정보에도 접근할 수 없다.
  const anon = await browser.newContext();
  const meAnon = await anon.request.get("/api/me");
  expect(meAnon.status()).toBe(401);

  await contextA.close();
  await contextB.close();
  await anon.close();
});
