#!/bin/bash

# ============================================
# 财务管家 - 生产模式启动脚本
# ============================================

echo "🚀 启动生产服务器..."

# 启动后端
echo "启动后端服务..."
cd backend && node dist/index.js &

# 等待后端启动
sleep 2

# 启动前端静态服务器 (需要 serve)
if ! command -v serve &> /dev/null; then
    echo "安装 serve..."
    npm install -g serve
fi

echo "启动前端服务..."
cd ../frontend && serve -s dist -l 5173
