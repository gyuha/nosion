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

test("삭제하면 하위 페이지까지 트리에서 사라지고 휴지통에 나타난다", async ({ page }) => {
  await signUpAndGoHome(page, "trash-delete");
  await page.getByRole("button", { name: "+ 문서" }).click();
  const parent = page.locator("nav li").first();
  await parent.locator(":scope > div").getByRole("button", { name: "더보기" }).click();
  await page.getByText("하위 문서 추가").click();
  await expect(page.locator("nav li")).toHaveCount(2);

  await parent.locator(":scope > div").getByRole("button", { name: "더보기" }).click();
  await page.getByText("삭제(휴지통으로)").click();

  await expect(page.locator("nav li")).toHaveCount(0);

  await page.getByRole("button", { name: "🗑️ 휴지통" }).click();
  await expect(page).toHaveURL("/trash");
  await expect(page.locator("li")).toHaveCount(2);
});

test("복원하면 되돌아오고, 부모가 휴지통에 있으면 자식은 최상위로 복원된다", async ({
  page,
}) => {
  await signUpAndGoHome(page, "trash-restore");
  await page.getByRole("button", { name: "+ 문서" }).click();
  const parent = page.locator("nav li").first();
  await parent.locator(":scope > div").getByRole("button", { name: "더보기" }).click();
  await page.getByText("하위 문서 추가").click();
  await expect(page.locator("nav li")).toHaveCount(2);

  await parent.locator(":scope > div").getByRole("button", { name: "더보기" }).click();
  await page.getByText("삭제(휴지통으로)").click();
  await expect(page.locator("nav li")).toHaveCount(0);

  await page.getByRole("button", { name: "🗑️ 휴지통" }).click();
  // 자식만 복원한다(부모는 여전히 휴지통에 있음) → 최상위로 복원되어야 한다.
  const items = page.locator("li");
  await items.nth(1).getByRole("button", { name: "복원" }).click();

  await page.goto("/");
  await expect(page.locator("nav li")).toHaveCount(1);
});

test("영구 삭제하면 데이터가 제거되고 복원할 수 없다", async ({ page }) => {
  await signUpAndGoHome(page, "trash-permanent");
  await page.getByRole("button", { name: "+ 문서" }).click();
  const node = page.locator("nav li").first();
  await node.getByRole("button", { name: "더보기" }).click();
  await page.getByText("삭제(휴지통으로)").click();

  await page.getByRole("button", { name: "🗑️ 휴지통" }).click();
  await expect(page.locator("li")).toHaveCount(1);
  await page.getByRole("button", { name: "영구 삭제" }).click();
  await expect(page.locator("li")).toHaveCount(0);
  await expect(page.getByText("휴지통이 비어 있습니다.")).toBeVisible();

  await page.goto("/");
  await expect(page.locator("nav li")).toHaveCount(0);
});
