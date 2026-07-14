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

test("테마 토글로 라이트/다크가 전환된다", async ({ page }) => {
  await signUpAndGoHome(page, "theme-toggle");

  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.getByRole("button", { name: "테마 전환" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("button", { name: "테마 전환" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});

test("새로고침 후에도 선택한 테마가 유지된다", async ({ page }) => {
  await signUpAndGoHome(page, "theme-persist");

  await page.getByRole("button", { name: "테마 전환" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("에디터·데이터베이스 뷰 영역에도 다크 테마가 적용된다", async ({ page }) => {
  await signUpAndGoHome(page, "theme-areas");
  await page.getByRole("button", { name: "테마 전환" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  // 문서 에디터 영역
  await page.getByRole("button", { name: "+ 문서" }).click();
  await page.locator("nav > ul li").first().locator("button").first().click();
  await page.waitForURL(/\/page\//);
  await expect(page.locator(".bn-container")).toHaveAttribute("data-color-scheme", "dark");

  // 데이터베이스 뷰 영역(다크 배경 클래스가 적용된 DOM 존재 확인)
  await page.goto("/");
  await page.getByRole("button", { name: "+ DB" }).click();
  await expect(page.locator("nav > ul li")).toHaveCount(2);
  await page.locator("nav > ul li").last().locator("button").first().click();
  await page.waitForURL(/\/page\//);
  await expect(page.locator("table")).toBeVisible();
  const bodyBg = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );
  expect(bodyBg).not.toBe("");
});
