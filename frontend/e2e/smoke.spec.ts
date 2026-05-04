import { expect, test } from "@playwright/test";

test.describe("QuizApp smoke flows", () => {
  test("home page navigates to the leaderboard with real data", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("button", { name: "Leaderboards" })).toBeVisible();
    await page.getByRole("button", { name: "Leaderboards" }).click();

    await expect(page).toHaveURL(/\/leaderboards$/);
    await expect(page.getByRole("heading", { name: "Leaderboards" })).toBeVisible();
    
    // Verify leaderboard data loads from backend
    await expect(page.getByText(/Showing \d+-\d+ of \d+ players/)).toBeVisible();
    await expect(page.getByText("Failed to load leaderboard.")).toHaveCount(0);
    
    // Verify table has data (at least 1 row)
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible();
    
    // Verify columns exist
    await expect(page.getByRole("columnheader", { name: "Rank" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Username" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "ELO" })).toBeVisible();
  });

  test("main menu routes through pyramid menu to local game", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("button", { name: "AZ Pyramid" })).toBeVisible();
    await page.getByRole("button", { name: "AZ Pyramid" }).click();

    await expect(page).toHaveURL(/\/pyramidGameMenu$/);
    await expect(page.getByRole("button", { name: /back to main menu/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Local Game" })).toBeVisible();
    
    // Navigate to local game
    await page.getByRole("button", { name: "Local Game" }).click();
    await expect(page).toHaveURL(/\/pyramidGameMenu\/localGame$/);
    
    // Verify game board renders
    await expect(page.getByText("Player 1").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Concede" })).toBeVisible();
  });

  test("questions endpoint provides questions through browser API", async ({ page }) => {
    await page.goto("/api/questions?question_type=standard");

    // Verify response structure
    const content = page.locator("body").textContent();
    await expect(page.locator("body")).toContainText("question_type");
    await expect(page.locator("body")).toContainText("standard");
    await expect(page.locator("body")).toContainText("question_text");
    await expect(page.locator("body")).toContainText("category");
  });

  test("check question endpoint validates answers", async ({ page }) => {
    // First fetch a question
    const questionRes = await page.request.get("/api/questions?question_type=standard");
    const questionData = await questionRes.json();
    
    // Check an answer
    const checkRes = await page.request.post("/api/questions/check", {
      data: {
        question_id: questionData.id,
        answer: questionData.question_text, // Use a test answer
        question_type: "standard",
      },
    });

    const checkData = await checkRes.json();
    expect(checkData).toHaveProperty("is_correct");
    expect(checkData).toHaveProperty("correct_answer");
  });

  test("backend health endpoint responds through the browser", async ({ page }) => {
    await page.goto("/api/health/db");

    await expect(page.locator("body")).toContainText('"db":"connected"');
  });

  test("header navigation and branding", async ({ page }) => {
    await page.goto("/");

    // Check header branding
    await expect(page.getByText("QuizApp")).toBeVisible();
    
    // Check leaderboard button exists
    await expect(page.getByRole("button", { name: "Leaderboards" })).toBeVisible();
    
    // Check color mode button exists
    await expect(page.getByRole("button", { name: /color|theme/i })).toBeVisible();
  });

  test("yes/no questions work correctly", async ({ page }) => {
    await page.goto("/api/questions?question_type=yes_no");

    const content = await page.locator("body").textContent();
    expect(content).toContain("question_type");
    expect(content).toContain("yes_no");
  });

  test("leaderboard pagination controls are present", async ({ page }) => {
    await page.goto("/leaderboards");

    // Wait for data to load
    await expect(page.getByText(/Showing \d+-\d+ of \d+ players/)).toBeVisible();

    // Verify pagination buttons are present
    await expect(page.getByRole("button", { name: /Previous|previous page/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Next|next page/i }).first()).toBeVisible();
  });
});
