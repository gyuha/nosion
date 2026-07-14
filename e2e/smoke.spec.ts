import { test, expect } from "@playwright/test";

// 스캐폴드 골격이 기동되는지 확인하는 최소 스모크 테스트.
// F1~F10 기능 시나리오는 각 기능 태스크에서 별도 스펙 파일로 추가된다.
test("frontend 앱 셸이 로드된다", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Nosion");
});
