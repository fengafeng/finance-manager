@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================
:: 财务管家 - Windows 一键部署脚本
:: ============================================

echo.
echo 🚀 财务管家 - Windows 本地部署
echo ================================

:: 检查管理员权限
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ⚠️  请以管理员身份运行此脚本
    pause
    exit /b 1
)

:: 检查 Node.js
echo.
echo [1/6] 检查 Node.js...
where node >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ 未安装 Node.js
    echo.
    echo 请先安装 Node.js 18+: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✅ Node.js !NODE_VERSION! 已安装

:: 检查 pnpm
echo.
echo [2/6] 检查 pnpm...
where pnpm >nul 2>&1
if %errorLevel% neq 0 (
    echo ⏳ 正在安装 pnpm...
    npm install -g pnpm
    if %errorLevel% neq 0 (
        echo ❌ pnpm 安装失败
        pause
        exit /b 1
    )
)
for /f "tokens=*" %%i in ('pnpm -v') do set PNPM_VERSION=%%i
echo ✅ pnpm !PNPM_VERSION! 已安装

:: 检查 PostgreSQL
echo.
echo [3/6] 检查 PostgreSQL...
where psql >nul 2>&1
if %errorLevel% neq 0 (
    echo ⚠️  未检测到 PostgreSQL
    echo.
    echo 请确保 PostgreSQL 已安装并运行
    echo 下载地址: https://www.postgresql.org/download/windows/
    echo.
    set /p CONTINUE="是否继续部署？(y/n): "
    if /i not "!CONTINUE!"=="y" exit /b 0
) else (
    echo ✅ PostgreSQL 已安装
)

:: 创建后端环境变量
echo.
echo [4/6] 配置环境变量...
if not exist "backend\.env" (
    (
        echo # 服务配置
        echo PORT=3000
        echo NODE_ENV=development
        echo.
        echo # 数据库配置 - 请根据实际情况修改
        echo DATABASE_URL="postgres://postgres:postgres@localhost:5432/finance_manager?schema=public"
        echo.
        echo # CORS配置
        echo CORS_ORIGIN="http://localhost:5173"
    ) > backend\.env
    echo ✅ 已创建 backend\.env
    echo ⚠️  请检查 backend\.env 中的数据库连接信息
) else (
    echo ℹ️  backend\.env 已存在
)

:: 创建前端环境变量
if not exist "frontend\.env" (
    (
        echo VITE_API_URL=http://localhost:3000/api
    ) > frontend\.env
    echo ✅ 已创建 frontend\.env
) else (
    echo ℹ️  frontend\.env 已存在
)

:: 安装依赖
echo.
echo [5/6] 安装项目依赖...
cd backend
echo    安装后端依赖...
call pnpm install
cd ..\frontend
echo    安装前端依赖...
call pnpm install
cd ..
echo ✅ 依赖安装完成

:: 初始化数据库
echo.
echo [6/6] 初始化数据库...
cd backend
echo    生成 Prisma Client...
call npx prisma generate
echo.
echo    同步数据库结构...
echo ⚠️  请确保 PostgreSQL 服务已启动且数据库已创建
echo    如果数据库不存在，请先创建: CREATE DATABASE finance_manager;
echo.
set /p DB_INIT="是否初始化数据库表？(y/n): "
if /i "!DB_INIT!"=="y" (
    call npx prisma db push
    if !errorLevel! equ 0 (
        echo ✅ 数据库初始化完成
    ) else (
        echo ❌ 数据库初始化失败，请检查连接配置
    )
)
cd ..

:: 完成
echo.
echo ================================
echo ✅ 部署完成！
echo.
echo 📝 启动方式:
echo    开发模式: dev.bat
echo    生产模式: start.bat
echo    停止服务: stop.bat
echo.
echo 🌐 访问地址:
echo    前端: http://localhost:5173
echo    后端: http://localhost:3000
echo.
echo ⚠️  首次使用请检查 backend\.env 中的数据库配置
echo.
pause
