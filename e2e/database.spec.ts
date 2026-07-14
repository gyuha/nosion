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
  await page.locator("form select").selectOption({ label: type });
  if (options) {
    await page.getByPlaceholder("옵션(쉼표로 구분)").fill(options);
  }
  await page.locator("form").getByRole("button", { name: "추가" }).click();
}

test("속성 6종을 추가하고 값을 편집할 수 있다", async ({ page }) => {
  await signUpAndOpenDatabase(page, "db-props");

  await addProperty(page, "텍스트속성", "텍스트");
  await addProperty(page, "숫자속성", "숫자");
  await addProperty(page, "셀렉트속성", "셀렉트", "옵션A,옵션B");
  await addProperty(page, "다중속성", "다중 셀렉트", "옵션X,옵션Y");
  await addProperty(page, "날짜속성", "날짜");
  await addProperty(page, "체크속성", "체크박스");

  await expect(page.locator("table th")).toHaveCount(7); // 6개 속성 + 추가 버튼 칸

  await page.getByRole("button", { name: "+ 행 추가" }).click();
  const row = page.locator("tbody tr").first();

  await row.locator("td").nth(0).locator("input").fill("텍스트 값");
  await row.locator("td").nth(0).locator("input").blur();
  await expect(row.locator("td").nth(0).locator("input")).toHaveValue("텍스트 값");

  await row.locator("td").nth(1).locator("input").fill("123");
  await row.locator("td").nth(1).locator("input").blur();
  await expect(row.locator("td").nth(1).locator("input")).toHaveValue("123");

  await row.locator("td").nth(4).locator("input[type='date']").fill("2026-01-01");
  await row.locator("td").nth(4).locator("input[type='date']").blur();
  await expect(row.locator("td").nth(4).locator("input[type='date']")).toHaveValue(
    "2026-01-01",
  );

  await row.locator("td").nth(5).locator("input[type='checkbox']").check();
  await expect(row.locator("td").nth(5).locator("input[type='checkbox']")).toBeChecked();
});

test("속성 이름·타입을 변경하고 삭제할 수 있다", async ({ page }) => {
  await signUpAndOpenDatabase(page, "db-edit");
  await addProperty(page, "원래이름", "텍스트");

  // 메뉴는 한 번 열면 열려 있는 상태를 유지한다(재클릭 시 토글되어 닫히므로 다시 클릭하지 않는다).
  await page.getByRole("button", { name: "원래이름" }).click();
  const renameInput = page.locator("th input").first();
  await renameInput.fill("바뀐이름");
  await renameInput.blur();
  await expect(page.getByRole("button", { name: "바뀐이름" })).toBeVisible();

  await page.locator("th select").first().selectOption({ label: "숫자" });
  await expect(page.locator("th select").first()).toHaveValue("number");

  await page.getByRole("button", { name: "속성 삭제" }).click();
  await expect(page.locator("table th")).toHaveCount(1); // 추가 버튼 칸만 남음
});

test("행을 추가·삭제할 수 있다", async ({ page }) => {
  await signUpAndOpenDatabase(page, "db-rows");
  await addProperty(page, "이름", "텍스트");

  await page.getByRole("button", { name: "+ 행 추가" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "+ 행 추가" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(2);

  await page.locator("tbody tr").first().getByRole("button", { name: "삭제" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
});

test("행을 열면 속성 편집 영역과 본문 편집이 함께 보인다", async ({ page }) => {
  await signUpAndOpenDatabase(page, "db-open-row");
  await addProperty(page, "이름", "텍스트");
  await page.getByRole("button", { name: "+ 행 추가" }).click();

  await page.locator("tbody tr").first().getByRole("button", { name: "열기" }).click();
  await page.waitForURL(/\/page\//);

  // 상단 속성 편집 영역(RowPropertiesPanel)이 보인다.
  await expect(page.getByText("이름", { exact: true })).toBeVisible();
  // 하단 본문(BlockNote 에디터)도 함께 보인다.
  await expect(page.locator(".bn-editor")).toBeVisible();
});
