@echo off
setlocal
chcp 65001 >nul
set "NEED_PAUSE=0"
set "COMMIT_MSG="

if "%~1"=="" set "NEED_PAUSE=1"

cd /d "%~dp0"

echo [1/5] Current git status:
git -c core.quotepath=false status --short
if errorlevel 1 goto :fail

if not "%~1"=="" (
  set "COMMIT_MSG=%~1"
  :collect_args
  shift
  if "%~1"=="" goto after_args
  set "COMMIT_MSG=%COMMIT_MSG% %~1"
  goto collect_args
)

:after_args
if not defined COMMIT_MSG (
  echo.
  echo No commit message was passed in. The script is waiting for you to type one.
  set /p "COMMIT_MSG=Enter commit message: "
)

:trim_leading
if defined COMMIT_MSG if "%COMMIT_MSG:~0,1%"==" " (
  set "COMMIT_MSG=%COMMIT_MSG:~1%"
  goto trim_leading
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

git diff --cached --quiet --exit-code
if not errorlevel 1 goto :no_staged_changes

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

:no_staged_changes
for /f %%i in ('git rev-list --count origin/main..HEAD 2^>nul') do set "AHEAD_COUNT=%%i"
if not defined AHEAD_COUNT set "AHEAD_COUNT=0"

if not "%AHEAD_COUNT%"=="0" (
  echo.
  echo No new file changes were detected, but there are %AHEAD_COUNT% local commit^(s^) waiting to be pushed.
  echo.
  echo [4/5] Skipping commit because there are no new staged changes...
  echo.
  echo [5/5] Pushing to origin/main...
  git push origin main
  if errorlevel 1 goto :fail
  echo.
  echo Done: pushed %AHEAD_COUNT% existing local commit^(s^).
  if "%NEED_PAUSE%"=="1" pause
  exit /b 0
)

echo.
echo No file changes detected. Nothing to commit or push.
if "%NEED_PAUSE%"=="1" pause
exit /b 0

:fail
echo.
echo Git publish failed.
if "%NEED_PAUSE%"=="1" pause
exit /b 1
