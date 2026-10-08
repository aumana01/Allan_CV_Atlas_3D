@echo off
setlocal
cd /d "%~dp0"
title ALLAN UMANA - Atlas Profesional 3D
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 scripts\servidor_local.py
  goto :end
)
where python >nul 2>nul
if %errorlevel%==0 (
  python scripts\servidor_local.py
  goto :end
)
echo ERROR: Python no esta instalado o no esta en el PATH.
echo Descarga Python desde https://www.python.org/downloads/
pause
:end
