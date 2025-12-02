# Run E2E tests with REAL authentication
# This script bypasses .env.test and sets environment variables directly

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  E2E Tests - REAL Authentication Mode" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test User: e2e@e2e.pl" -ForegroundColor Yellow
Write-Host "User ID:   11ba4a5c-aa20-4777-ae3d-f8efc8eaef99" -ForegroundColor Yellow
Write-Host ""

# Set environment variables (these override .env.test)
$env:DISABLE_AUTH = "false"
$env:E2E_USERNAME = "e2e@e2e.pl"
$env:E2E_PASSWORD = "pomidor123"
$env:E2E_USERNAME_ID = "11ba4a5c-aa20-4777-ae3d-f8efc8eaef99"

Write-Host "Starting Playwright tests..." -ForegroundColor Green
Write-Host ""

# Run playwright directly (not through npm to avoid npm shell quirks)
npx playwright test $args

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
