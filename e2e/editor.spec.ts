import { test, expect } from "@playwright/test";

function uniqueEmail(tag: string) {
  return `${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function pickSlashMenuItem(
  page: import("@playwright/test").Page,
  exactTitle: string,
) {
  await page
    .locator(".bn-mt-suggestion-menu-item-title")
    .filter({ hasText: new RegExp(`^${exactTitle}$`) })
    .click();
}

async function signUpAndOpenDocument(page: import("@playwright/test").Page, tag: string) {
  await page.goto("/login");
  await page.getByText("계정이 없나요? 가입").click();
  await page.getByPlaceholder("이름").fill(tag);
  await page.getByPlaceholder("이메일").fill(uniqueEmail(tag));
  await page.getByPlaceholder("비밀번호").fill("password123");
  await page.getByRole("button", { name: "가입하기" }).click();
  await expect(page).toHaveURL("/");
  await page.getByRole("button", { name: "+ 문서" }).click();
  await page.locator("nav li button").first().click();
  await page.waitForURL(/\/page\//);
  return page.locator(".bn-editor, [contenteditable='true']").first();
}

test("슬래시 메뉴로 헤딩·리스트·코드 블록을 생성할 수 있다", async ({ page }) => {
  const editor = await signUpAndOpenDocument(page, "editor-slash");

  await editor.click();
  await page.keyboard.type("/");
  await pickSlashMenuItem(page, "Heading 1");
  await page.keyboard.type("제목입니다");
  await expect(page.locator(".bn-editor h1")).toHaveText("제목입니다");

  await page.keyboard.press("Enter");
  await page.keyboard.type("/");
  await pickSlashMenuItem(page, "Bullet List");
  await page.keyboard.type("항목1");
  await expect(
    page.locator(".bn-editor [data-content-type='bulletListItem']"),
  ).toContainText("항목1");

  await page.keyboard.press("Enter");
  await page.keyboard.type("/");
  await pickSlashMenuItem(page, "Code Block");
  await page.keyboard.type("console.log(1)");
  await expect(page.locator(".bn-editor pre code")).toContainText(
    "console.log(1)",
  );
});

test("서식(굵게·링크)을 적용할 수 있다", async ({ page }) => {
  const editor = await signUpAndOpenDocument(page, "editor-format");

  await editor.click();
  await page.keyboard.type("hello world");
  await page.getByText("hello world").click({ clickCount: 3 });
  await page.getByRole("button", { name: "Bold" }).click();
  await expect(page.locator(".bn-editor strong")).toContainText("hello world");

  await page.getByText("hello world").click({ clickCount: 3 });
  await page.getByRole("button", { name: "Create link" }).click();
  await page.getByPlaceholder("Edit URL").fill("https://example.com");
  await page.getByPlaceholder("Edit URL").press("Enter");
  await expect(page.locator(".bn-editor a")).toHaveAttribute(
    "href",
    "https://example.com",
  );
});

test("자동저장 후 새로고침하면 내용이 복원된다", async ({ page }) => {
  const editor = await signUpAndOpenDocument(page, "editor-autosave");

  await editor.click();
  await page.keyboard.type("자동저장 테스트 문장");
  // 자동저장 디바운스(800ms) + 서버 왕복 대기
  await page.waitForTimeout(1500);

  await page.reload();
  await expect(page.locator(".bn-editor")).toContainText("자동저장 테스트 문장");
});

test("페이지 제목을 편집하면 사이드바 트리에 즉시 반영된다", async ({ page }) => {
  await signUpAndOpenDocument(page, "editor-title");

  const titleInput = page.locator("input[placeholder='제목 없음']");
  await titleInput.fill("멋진 문서 제목");
  await titleInput.press("Enter");

  await expect(page.locator("nav").getByText("멋진 문서 제목")).toBeVisible();
});
