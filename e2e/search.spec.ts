import { test, expect } from "@playwright/test";

function uniqueEmail(tag: string) {
  return `${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

function searchOverlay(page: import("@playwright/test").Page) {
  return page.locator(".fixed.inset-0");
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

test("제목으로 검색되고 단축키로 검색창을 열 수 있다", async ({ page }) => {
  await signUpAndGoHome(page, "search-title");
  await page.getByRole("button", { name: "+ 문서" }).click();
  await page.locator("nav li button").first().click();
  await page.waitForURL(/\/page\//);
  const titleInput = page.locator("input[placeholder='제목 없음']");
  await titleInput.fill("제목검색테스트페이지");
  await titleInput.press("Enter");

  // 단축키(Control+K)로 검색창 열기
  await page.keyboard.press("Control+k");
  await page.getByPlaceholder("페이지 제목·본문 검색").fill("제목검색테스트");
  await expect(searchOverlay(page).getByText("제목검색테스트페이지")).toBeVisible();
});

test("본문 저장 직후 본문 텍스트(한국어 부분 문자열)로 검색된다", async ({ page }) => {
  await signUpAndGoHome(page, "search-body");
  await page.getByRole("button", { name: "+ 문서" }).click();
  await page.locator("nav li button").first().click();
  await page.waitForURL(/\/page\//);

  const editor = page.locator(".bn-editor, [contenteditable='true']").first();
  await editor.click();
  await page.keyboard.type("한국어부분문자열검색테스트");
  await page.waitForTimeout(1500); // 자동저장 디바운스+서버 왕복

  await page.getByRole("button", { name: "검색 열기" }).click();
  await page.getByPlaceholder("페이지 제목·본문 검색").fill("부분문자열검색");
  await expect(searchOverlay(page).getByText("제목 없음")).toBeVisible();
});

test("검색 결과를 클릭하면 해당 페이지로 이동한다", async ({ page }) => {
  await signUpAndGoHome(page, "search-click");
  await page.getByRole("button", { name: "+ 문서" }).click();
  await page.locator("nav li button").first().click();
  await page.waitForURL(/\/page\//);
  const titleInput = page.locator("input[placeholder='제목 없음']");
  await titleInput.fill("클릭이동테스트페이지");
  await titleInput.press("Enter");

  await page.goto("/");
  await page.getByRole("button", { name: "검색 열기" }).click();
  await page.getByPlaceholder("페이지 제목·본문 검색").fill("클릭이동테스트");
  await searchOverlay(page).getByText("클릭이동테스트페이지").click();
  await page.waitForURL(/\/page\//);
  await expect(page.locator("input[placeholder='제목 없음']")).toHaveValue(
    "클릭이동테스트페이지",
  );
});

test("휴지통으로 이동한 페이지는 검색 결과에서 제외된다", async ({ page }) => {
  await signUpAndGoHome(page, "search-trash");
  await page.getByRole("button", { name: "+ 문서" }).click();
  const nodeLi = page.locator("nav li").first();
  await nodeLi.getByRole("button", { name: "더보기" }).click();
  await page.getByText("이름 변경").click();
  const renameInput = page.locator("nav input");
  await renameInput.fill("휴지통제외검색테스트");
  await renameInput.press("Enter");

  await page.getByRole("button", { name: "검색 열기" }).click();
  await page.getByPlaceholder("페이지 제목·본문 검색").fill("휴지통제외검색");
  await expect(searchOverlay(page).getByText("휴지통제외검색테스트")).toBeVisible();
  await page.keyboard.press("Escape");

  await nodeLi.getByRole("button", { name: "더보기" }).click();
  await page.getByText("삭제(휴지통으로)").click();

  await page.getByRole("button", { name: "검색 열기" }).click();
  await page.getByPlaceholder("페이지 제목·본문 검색").fill("휴지통제외검색");
  await expect(searchOverlay(page).getByText("휴지통제외검색테스트")).toHaveCount(0);
});
