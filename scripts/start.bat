@echo off
chcp 65001 >nul

:: ============================================
:: 财务管家 - 生产模式启动脚本
:: ============================================

echo.
echo 🚀 启动生产服务器...
echo.

:: 检查是否已构建
if not exist "backend\dist\index.js" (
    echo ⏳ 正在构建后端...
    cd backend
    call pnpm build
    cd ..
)

if not exist "frontend\dist\index.html" (
    echo ⏳ 正在构建前端...
    cd frontend
    call pnpm build
    cd ..
)

:: 启动后端
echo 启动后端服务...
start "财务管家-后端" cmd /k "cd /d %~dp0..\backend && node dist\index.js"

:: 等待后端启动
timeout /t 2 /nobreak >nul

:: 检查 serve 是否安装
where serve >nul 2>&1
if %errorLevel% neq 0 (
    echo 安装 serve...
    call npm install -g serve
)

:: 启动前端
echo 启动前端服务...
start "财务管家-前端" cmd /k "cd /d %~dp0..\frontend && serve -s dist -l 5173"

echo.
echo ✅ 生产服务器已启动
echo.
echo 🌐 访问地址:
echo    前端: http://localhost:5173
echo    后端: http://localhost:3000
echo.
echo ℹ️  后端和前端在独立窗口运行，关闭窗口即可停止服务
echo.
pause
