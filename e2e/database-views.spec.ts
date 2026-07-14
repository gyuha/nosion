import { test, expect } from "@playwright/test";

function uniqueEmail(tag: string) {
  return `${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
}

async function signUpAndOpenDatabase(
  page: import("@playwright/test").Page,
  tag: string,
) {
  await page.goto("/login");
  await page.getByText("계정이 없나요? 가입").click();
  await page.getByPlaceholder("이름").fill(tag);
  await page.getByPlaceholder("이메일").fill(uniqueEmail(tag));
  await page.getByPlaceholder("비밀번호").fill("password123");
  await page.getByRole("button", { name: "가입하기" }).click();
  await expect(page).toHaveURL("/");
  await page.getByRole("button", { name: "+ DB" }).click();
  await page.locator("nav li button").first().click();
  await page.waitForURL(/\/page\//);
}

async function addProperty(
  page: import("@playwright/test").Page,
  name: string,
  type: string,
  options?: string,
) {
  await page.getByRole("button", { name: "+ 속성 추가" }).click();
  await page.getByPlaceholder("속성 이름").fill(name);
  await page.locator("form select").first().selectOption({ label: type });
  if (options) {
    await page.getByPlaceholder("옵션(쉼표로 구분)").fill(options);
  }
  await page.locator("form").getByRole("button", { name: "추가" }).click();
}

test("테이블 뷰에서 셀을 인라인으로 편집할 수 있다", async ({ page }) => {
  await signUpAndOpenDatabase(page, "views-table");
  await addProperty(page, "이름", "텍스트");
  await page.getByRole("button", { name: "+ 행 추가" }).click();

  const cell = page.locator("tbody tr").first().locator("td").first().locator("input");
  await cell.fill("인라인 편집됨");
  await cell.blur();
  await expect(cell).toHaveValue("인라인 편집됨");
});

test("보드 뷰: 셀렉트 기준 그룹핑과 카드 드래그로 값이 바뀐다", async ({ page }) => {
  await signUpAndOpenDatabase(page, "views-board");
  await addProperty(page, "상태", "셀렉트", "할일,진행중");

  // 보드 뷰 추가
  await page.getByRole("button", { name: "+ 뷰 추가" }).click();
  await page.getByPlaceholder("뷰 이름").fill("보드");
  await page.locator("form select").last().selectOption({ label: "보드" });
  await page.locator("form").getByRole("button", { name: "추가" }).click();
  await page.getByRole("button", { name: "보드" }).click();

  // 그룹 기준 속성 지정이 필요하다는 안내가 먼저 보인다.
  await expect(page.getByText("그룹 기준으로 쓸 셀렉트 속성이 필요합니다")).toBeVisible();

  // 그룹 기준 지정
  const groupSelect = page.getByLabel("그룹 기준:");
  await groupSelect.selectOption({ label: "상태" });

  await expect(page.getByText("할일", { exact: true })).toBeVisible();
  await expect(page.getByText("진행중", { exact: true })).toBeVisible();
  await expect(page.getByText("미지정", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "+ 카드 추가" }).click();
  const card = page.locator("[draggable='true']").first();
  const targetColumn = page
    .locator("div")
    .filter({ hasText: "진행중" })
    .last();

  await card.dragTo(targetColumn);
  await page.waitForTimeout(300);

  // 다른 뷰(테이블)로 전환해 값이 실제로 바뀌었는지 확인
  await page.getByRole("button", { name: "테이블" }).click();
  const select = page.locator("tbody select").first();
  await expect(select).toHaveValue(
    await select.locator("option", { hasText: "진행중" }).getAttribute("value") ?? "",
  );
});

test("리스트 뷰에서 행 제목이 목록으로 표시된다", async ({ page }) => {
  await signUpAndOpenDatabase(page, "views-list");
  await addProperty(page, "이름", "텍스트");
  await page.getByRole("button", { name: "+ 행 추가" }).click();

  await page.getByRole("button", { name: "+ 뷰 추가" }).click();
  await page.getByPlaceholder("뷰 이름").fill("리스트");
  await page.locator("form select").last().selectOption({ label: "리스트" });
  await page.locator("form").getByRole("button", { name: "추가" }).click();
  await page.getByRole("button", { name: "리스트" }).click();

  await expect(page.getByText("+ 항목 추가")).toBeVisible();
  await expect(page.locator("main ul li")).toHaveCount(1);
});

test("뷰를 추가·전환·삭제할 수 있고 기본 뷰는 테이블이다", async ({ page }) => {
  await signUpAndOpenDatabase(page, "views-switch");

  // 기본 뷰는 테이블
  await expect(
    page.getByRole("button", { name: "테이블" }),
  ).toHaveClass(/bg-gray-900|dark:bg-gray-100/);

  await page.getByRole("button", { name: "+ 뷰 추가" }).click();
  await page.getByPlaceholder("뷰 이름").fill("보드뷰");
  await page.locator("form select").last().selectOption({ label: "보드" });
  await page.locator("form").getByRole("button", { name: "추가" }).click();

  await expect(page.getByRole("button", { name: "보드뷰" })).toBeVisible();
  await page.getByRole("button", { name: "보드뷰" }).click();
  await expect(page.getByText("그룹 기준으로 쓸 셀렉트 속성이 필요합니다")).toBeVisible();

  await page.getByRole("button", { name: "보드뷰" }).click();
  await page.getByText("✕").click();
  await expect(page.getByRole("button", { name: "보드뷰" })).toHaveCount(0);
});

test("필터·정렬이 뷰별로 저장된다(새로고침 후에도 유지)", async ({ page }) => {
  await signUpAndOpenDatabase(page, "views-filtersort");
  await addProperty(page, "이름", "텍스트");

  const filterSelect = page.getByLabel("필터:");
  await filterSelect.selectOption({ label: "이름" });
  // 필터 선택 반영(쿼리 재조회)이 끝난 뒤에 정렬을 선택해야, 두 mutation이 서로의
  // config 변경을 덮어쓰는 경쟁 상태를 피할 수 있다.
  await expect(page.getByPlaceholder("값 포함")).toBeVisible();

  const sortSelect = page.getByLabel("정렬:");
  await sortSelect.selectOption({ label: "이름" });
  await expect(sortSelect).toHaveValue(
    await sortSelect.locator("option", { hasText: "이름" }).getAttribute("value") ?? "",
  );

  await page.reload();
  await expect(page.getByLabel("필터:")).toHaveValue(
    await page.getByLabel("필터:").locator("option", { hasText: "이름" }).getAttribute("value") ?? "",
  );
  await expect(page.getByLabel("정렬:")).toHaveValue(
    await page.getByLabel("정렬:").locator("option", { hasText: "이름" }).getAttribute("value") ?? "",
  );
});
