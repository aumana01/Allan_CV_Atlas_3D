@echo off
cd /d "%~dp0"
py -3 -m pip install -r requirements-traduccion.txt || python -m pip install -r requirements-traduccion.txt
py -3 scripts\publicar_excel.py --provider google || python scripts\publicar_excel.py --provider google
pause
