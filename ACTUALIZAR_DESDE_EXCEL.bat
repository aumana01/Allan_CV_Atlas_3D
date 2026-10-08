@echo off
cd /d "%~dp0"
py -3 scripts\publicar_excel.py --provider cache || python scripts\publicar_excel.py --provider cache
pause
