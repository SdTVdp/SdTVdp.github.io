@echo off
setlocal
set "NEED_PAUSE=0"

if "%~1"=="" set "NEED_PAUSE=1"

cd /d "%~dp0"

echo [1/5] Current git status:
git status --short
if errorlevel 1 goto :fail

set "COMMIT_MSG=%*"
if not defined COMMIT_MSG (
  set /p COMMIT_MSG=Enter commit message: 
)

if not defined COMMIT_MSG (
  echo Commit message cannot be empty.
  if "%NEED_PAUSE%"=="1" pause
  exit /b 1
)

echo.
echo [2/5] Building site...
call npm run build
if errorlevel 1 (
  echo Build failed. Commit canceled.
  if "%NEED_PAUSE%"=="1" pause
  exit /b 1
)

echo.
echo [3/5] Staging changes...
git add -A
if errorlevel 1 goto :fail

echo.
echo [4/5] Creating commit...
git commit -m "%COMMIT_MSG%"
if errorlevel 1 (
  echo Commit failed. If there are no staged changes, nothing will be committed.
  if "%NEED_PAUSE%"=="1" pause
  exit /b 1
)

echo.
echo [5/5] Pushing to origin/main...
git push origin main
if errorlevel 1 goto :fail

echo.
echo Done: %COMMIT_MSG%
if "%NEED_PAUSE%"=="1" pause
exit /b 0

:fail
echo.
echo Git publish failed.
if "%NEED_PAUSE%"=="1" pause
exit /b 1
