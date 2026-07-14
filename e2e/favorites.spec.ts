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

test("즐겨찾기를 켜면 섹션에 표시되고 클릭하면 이동한다", async ({ page }) => {
  await signUpAndGoHome(page, "fav-on");
  await page.getByRole("button", { name: "+ 문서" }).click();
  const node = page.locator("nav > ul li").first();
  await node.locator(":scope > div").getByRole("button", { name: "더보기" }).click();
  await page.getByText("즐겨찾기 추가").click();

  const favSection = page.locator("nav >> text=즐겨찾기").locator("..");
  await expect(favSection.getByText("제목 없음")).toBeVisible();

  await favSection.getByText("제목 없음").click();
  await page.waitForURL(/\/page\//);
});

test("즐겨찾기를 끄면 섹션에서 사라진다", async ({ page }) => {
  await signUpAndGoHome(page, "fav-off");
  await page.getByRole("button", { name: "+ 문서" }).click();
  const node = page.locator("nav > ul li").first();
  await node.locator(":scope > div").getByRole("button", { name: "더보기" }).click();
  await page.getByText("즐겨찾기 추가").click();
  await expect(page.getByText("즐겨찾기", { exact: true })).toBeVisible();

  await node.locator(":scope > div").getByRole("button", { name: "더보기" }).click();
  await page.getByText("즐겨찾기 해제").click();
  await expect(page.getByText("즐겨찾기", { exact: true })).toHaveCount(0);
});

test("삭제된 페이지는 즐겨찾기 섹션에서 사라진다", async ({ page }) => {
  await signUpAndGoHome(page, "fav-trash");
  await page.getByRole("button", { name: "+ 문서" }).click();
  const node = page.locator("nav > ul li").first();
  await node.locator(":scope > div").getByRole("button", { name: "더보기" }).click();
  await page.getByText("즐겨찾기 추가").click();
  await expect(page.getByText("즐겨찾기", { exact: true })).toBeVisible();

  await node.locator(":scope > div").getByRole("button", { name: "더보기" }).click();
  await page.getByText("삭제(휴지통으로)").click();

  await expect(page.getByText("즐겨찾기", { exact: true })).toHaveCount(0);
});
