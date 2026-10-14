@echo off
title Aria Vale - Portfolio Server
start "" "http://localhost:4173/"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
