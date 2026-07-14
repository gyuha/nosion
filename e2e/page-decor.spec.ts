import { test, expect } from "@playwright/test";

function uniqueEmail(tag: string) {
  return `${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function signUpAndOpenPage(page: import("@playwright/test").Page, tag: string) {
  await page.goto("/login");
  await page.getByText("계정이 없나요? 가입").click();
  await page.getByPlaceholder("이름").fill(tag);
  await page.getByPlaceholder("이메일").fill(uniqueEmail(tag));
  await page.getByPlaceholder("비밀번호").fill("password123");
  await page.getByRole("button", { name: "가입하기" }).click();
  await expect(page).toHaveURL("/");
  await page.getByRole("button", { name: "+ 문서" }).click();
  await page.locator("nav > ul li").first().locator("button").first().click();
  await page.waitForURL(/\/page\//);
}

test("이모지 아이콘을 설정·변경·제거할 수 있고 트리·헤더에 표시된다", async ({ page }) => {
  await signUpAndOpenPage(page, "decor-icon");

  await page.getByRole("button", { name: "아이콘 설정" }).click();
  await page.getByText("🚀", { exact: true }).click();
  await expect(page.getByRole("button", { name: "아이콘 설정" })).toContainText("🚀");
  await expect(page.locator("nav > ul li").first()).toContainText("🚀");

  await page.getByRole("button", { name: "아이콘 설정" }).click();
  await page.getByText("🎯", { exact: true }).click();
  await expect(page.getByRole("button", { name: "아이콘 설정" })).toContainText("🎯");

  await page.getByRole("button", { name: "아이콘 설정" }).click();
  await page.getByText("아이콘 제거").click();
  await expect(page.getByRole("button", { name: "아이콘 설정" })).toContainText("🙂");
});

test("프리셋 커버를 설정·변경·제거할 수 있고 페이지 상단에 표시된다", async ({ page }) => {
  await signUpAndOpenPage(page, "decor-cover");

  await page.getByRole("button", { name: "+ 커버 추가" }).click();
  await page.getByRole("button", { name: "블루" }).click();
  await expect(page.getByRole("button", { name: "+ 커버 추가" })).toHaveCount(0);

  const cover = page.locator("div.h-32");
  await expect(cover).toBeVisible();
  await cover.click();
  await page.getByRole("button", { name: "선셋" }).click();
  await expect(page.locator("div.h-32")).toBeVisible();

  await page.locator("div.h-32").click();
  await page.getByText("커버 제거").click();
  await expect(page.getByRole("button", { name: "+ 커버 추가" })).toBeVisible();
});
