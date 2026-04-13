@echo off
chcp 65001 >nul

:: ============================================
:: 财务管家 - 停止所有服务
:: ============================================

echo.
echo 🛑 停止所有服务...
echo.

:: 停止后端 Node 进程
echo 停止后端服务...
taskkill /f /im "node.exe" /fi "WINDOWTITLE eq 财务管家*" >nul 2>&1

:: 停止 Vite 进程
echo 停止前端服务...
taskkill /f /im "node.exe" /fi "WINDOWTITLE eq *vite*" >nul 2>&1

:: 关闭相关窗口
taskkill /f /fi "WINDOWTITLE eq 财务管家*" >nul 2>&1

echo ✅ 所有服务已停止
echo.
pause
