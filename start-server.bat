@echo off
echo "Instalando dependencias (isso pode levar um momento)..."
call npm install
echo "Iniciando o servidor de desenvolvimento..."
call npm run serve
pause
