@echo off
setlocal EnableDelayedExpansion

REM Go to this .bat file folder (repo root)
cd /d "%~dp0"

set "REMOTE_URL=https://github.com/hanhwasung32421-source/coinmaker.git"

REM Verify git repo
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Not a git repository. Run this in the repo root.
  exit /b 1
)

REM Ensure origin points to coinmaker repo
git remote get-url origin >nul 2>&1
if errorlevel 1 (
  git remote add origin "%REMOTE_URL%"
) else (
  git remote set-url origin "%REMOTE_URL%"
)

REM Current branch (fail if detached HEAD)
set "BRANCH="
for /f %%B in ('git rev-parse --abbrev-ref HEAD') do set "BRANCH=%%B"
if /i "%BRANCH%"=="HEAD" (
  echo [ERROR] Detached HEAD state. Please checkout a branch and retry.
  exit /b 1
)

REM Commit message (optional)
set "COMMIT_MSG=%~1"
if "%COMMIT_MSG%"=="" set "COMMIT_MSG=deploy"

REM Update build version (yyMMddHHmmss) on every commit
for /f %%V in ('powershell -NoProfile -Command "(Get-Date).ToString(\"yyMMddHHmmss\")"') do set "BUILD_VERSION=%%V"
powershell -NoProfile -Command "Set-Content -Path 'version.js' -Value ('window.APP_VERSION = \"' + '%BUILD_VERSION%' + '\";') -Encoding ASCII"

REM Stage everything
git add -A

REM Commit only if there are changes
set "HAS_CHANGES="
for /f %%A in ('git status --porcelain') do set "HAS_CHANGES=1"

if defined HAS_CHANGES (
  git commit -m "%COMMIT_MSG%"
) else (
  echo [INFO] No changes to commit. (push only)
)

REM Push
git push -u origin "%BRANCH%"
