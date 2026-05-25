@echo off
setlocal
cd /d "%~dp0.."
powershell -ExecutionPolicy ByPass -File "%~dp0run.ps1"
pause
