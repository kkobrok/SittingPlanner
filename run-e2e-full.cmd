@echo off
REM Run E2E tests with FULL authentication (no skipping)
REM Uses real Supabase and e2e@e2e.pl credentials

echo.
echo ===============================================
echo   Running E2E Tests with Real Authentication
echo ===============================================
echo.
echo Test User: e2e@e2e.pl
echo User ID:   11ba4a5c-aa20-4777-ae3d-f8efc8eaef99
echo.

REM Override DISABLE_AUTH from .env.test
set DISABLE_AUTH=false

echo Starting Playwright tests...
echo.

npx playwright test %*

echo.
echo ===============================================
