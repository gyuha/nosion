import { test, expect } from "@playwright/test";

function uniqueEmail(tag: string) {
  return `${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function signUpAndGoHome(page: import("@playwright/test").Page, tag: string) {
  await page.goto("/login");
  await page.getByText("계정이 없나요? 가입").click();
  await page.getByPlaceholder("이름").fill(tag);
  await page.getByPlaceholder("이메일").fill(uniqueEmail(tag));
  await page.getByPlaceholder("비밀번호").fill("password123");
  await page.getByRole("button", { name: "가입하기" }).click();
  await expect(page).toHaveURL("/");
}

test("문서·데이터베이스 페이지를 생성할 수 있다", async ({ page }) => {
  await signUpAndGoHome(page, "tree-create");
  await page.getByRole("button", { name: "+ 문서" }).click();
  await expect(page.locator("nav li")).toHaveCount(1);
  await page.getByRole("button", { name: "+ DB" }).click();
  await expect(page.locator("nav li")).toHaveCount(2);
});

test("하위 페이지를 3단 이상 중첩할 수 있다", async ({ page }) => {
  await signUpAndGoHome(page, "tree-nest");
  await page.getByRole("button", { name: "+ 문서" }).click();
  const root = page.locator("nav li").first();
  await root.getByRole("button", { name: "더보기" }).click();
  await page.getByText("하위 문서 추가").click();

  // 중첩된 하위 항목이 생겼는지: nav li 총 개수가 2개(루트+자식)
  await expect(page.locator("nav li")).toHaveCount(2);

  const child = page.locator("nav li").nth(1);
  await child.getByRole("button", { name: "더보기" }).click();
  await page.getByText("하위 문서 추가").click();
  await expect(page.locator("nav li")).toHaveCount(3);
});

test("이름 변경이 트리에 반영된다", async ({ page }) => {
  await signUpAndGoHome(page, "tree-rename");
  await page.getByRole("button", { name: "+ 문서" }).click();
  await page.locator("nav li").first().getByRole("button", { name: "더보기" }).click();
  await page.getByText("이름 변경").click();
  const input = page.locator("nav input");
  await input.fill("새 페이지 제목");
  await input.press("Enter");
  await expect(page.locator("nav").getByText("새 페이지 제목")).toBeVisible();
});

test("이동(부모 변경)이 동작한다", async ({ page }) => {
  await signUpAndGoHome(page, "tree-move");
  await page.getByRole("button", { name: "+ 문서" }).click();
  await page.getByRole("button", { name: "+ 문서" }).click();

  const items = page.locator("nav li");
  await expect(items).toHaveCount(2);

  const second = items.nth(1);
  await second.getByRole("button", { name: "더보기" }).click();
  const select = page.getByLabel("제목 없음 이동 대상").first();
  // 첫 번째 항목의 title(제목 없음)을 대상으로 선택
  const options = await select.locator("option").allTextContents();
  const targetOption = options.find((o) => o === "제목 없음");
  expect(targetOption).toBeTruthy();
  await select.selectOption({ label: "제목 없음" });

  // 이동 후 최상위 li는 1개(부모)만 남아야 한다
  await expect(page.locator("nav > ul > li")).toHaveCount(1);
});

test("새로고침 후에도 트리 상태가 유지된다", async ({ page }) => {
  await signUpAndGoHome(page, "tree-persist");
  await page.getByRole("button", { name: "+ 문서" }).click();
  await page.locator("nav li").first().getByRole("button", { name: "더보기" }).click();
  await page.getByText("이름 변경").click();
  const input = page.locator("nav input");
  await input.fill("유지되는 제목");
  await input.press("Enter");
  await expect(page.locator("nav").getByText("유지되는 제목")).toBeVisible();

  await page.reload();
  await expect(page.locator("nav").getByText("유지되는 제목")).toBeVisible();
});
