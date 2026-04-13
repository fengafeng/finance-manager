#!/bin/bash

# ============================================
# 财务管家 - 开发模式启动脚本
# ============================================

echo "🚀 启动开发服务器..."

# 启动后端 (后台运行)
echo "启动后端服务..."
cd backend && pnpm dev &
BACKEND_PID=$!

# 等待后端启动
sleep 3

# 启动前端
echo "启动前端服务..."
cd ../frontend && pnpm dev

# 清理
trap "kill $BACKEND_PID 2>/dev/null" EXIT
