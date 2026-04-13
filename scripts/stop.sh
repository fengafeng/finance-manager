#!/bin/bash

# ============================================
# 财务管家 - 停止所有服务
# ============================================

echo "🛑 停止所有服务..."

# 停止 node 进程
pkill -f "node.*backend" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "serve.*dist" 2>/dev/null || true

echo "✓ 所有服务已停止"
