@echo off
setlocal
title Dragonbornink Local Website
cd /d "%~dp0"
if not exist "%~dp0index.html" goto not_extracted
if not exist "%~dp0serve.cjs" goto not_extracted
set "DRAGONBORN_NODE="
for %%I in (node.exe) do set "DRAGONBORN_NODE=%%~$PATH:I"
if not defined DRAGONBORN_NODE if exist "%ProgramFiles%\nodejs\node.exe" set "DRAGONBORN_NODE=%ProgramFiles%\nodejs\node.exe"
if not defined DRAGONBORN_NODE if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "DRAGONBORN_NODE=%ProgramFiles(x86)%\nodejs\node.exe"
if not defined DRAGONBORN_NODE if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "DRAGONBORN_NODE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
if not defined DRAGONBORN_NODE goto no_node
echo Starting Dragonbornink...
echo Keep this window open. Use the exact address printed below.
echo.
"%DRAGONBORN_NODE%" "%~dp0serve.cjs"
echo.
echo The server has stopped. Copy any error shown above when asking for help.
pause
exit /b
:not_extracted
echo The website files are missing from this folder.
echo Right-click the downloaded ZIP and choose Extract All first.
echo Open the extracted folder and double-click Start-Dragonbornink.cmd there.
pause
exit /b 1
:no_node
echo Node.js could not be found in PATH or the standard installation folders.
echo If you just installed Node.js, restart Windows and try this launcher again.
echo Otherwise install the LTS version from https://nodejs.org/
pause
exit /b 1
