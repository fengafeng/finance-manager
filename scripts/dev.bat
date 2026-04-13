@echo off
chcp 65001 >nul

:: ============================================
:: 财务管家 - 开发模式启动脚本
:: ============================================

echo.
echo 🚀 启动开发服务器...
echo.

:: 启动后端 (新窗口)
echo 启动后端服务...
start "财务管家-后端" cmd /k "cd /d %~dp0..\backend && pnpm dev"

:: 等待后端启动
echo 等待后端启动...
timeout /t 3 /nobreak >nul

:: 启动前端 (新窗口)
echo 启动前端服务...
start "财务管家-前端" cmd /k "cd /d %~dp0..\frontend && pnpm dev"

echo.
echo ✅ 开发服务器已启动
echo.
echo 🌐 访问地址:
echo    前端: http://localhost:5173
echo    后端: http://localhost:3000
echo.
echo ℹ️  后端和前端在独立窗口运行，关闭窗口即可停止服务
echo.
pause
