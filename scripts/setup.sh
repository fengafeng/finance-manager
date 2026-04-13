#!/bin/bash

# ============================================
# 财务管家 - 本地一键部署脚本
# ============================================

set -e

echo "🚀 财务管家 - 本地部署脚本"
echo "================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印函数
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_info() { echo -e "${YELLOW}➜${NC} $1"; }

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 未安装，请先安装 $1"
        exit 1
    fi
    print_success "$1 已安装"
}

# 检查依赖
echo ""
print_info "检查系统依赖..."
check_command "node"
check_command "pnpm" || { print_info "正在安装 pnpm..."; npm install -g pnpm; }

# 设置环境变量
echo ""
print_info "配置环境变量..."

# 后端环境变量
if [ ! -f "backend/.env" ]; then
    cat > backend/.env << 'EOF'
# 服务配置
PORT=3000
NODE_ENV=development

# 数据库配置
DATABASE_URL="postgres://postgres:Tencent2025@localhost:5432/genie?schema=public"

# CORS配置
CORS_ORIGIN="http://localhost:5173"
EOF
    print_success "已创建 backend/.env"
else
    print_info "backend/.env 已存在，跳过"
fi

# 前端环境变量
if [ ! -f "frontend/.env" ]; then
    cat > frontend/.env << 'EOF'
VITE_API_URL=http://localhost:3000/api
EOF
    print_success "已创建 frontend/.env"
else
    print_info "frontend/.env 已存在，跳过"
fi

# 安装依赖
echo ""
print_info "安装项目依赖..."
cd backend && pnpm install
cd ../frontend && pnpm install
cd ..
print_success "依赖安装完成"

# 数据库初始化
echo ""
print_info "初始化数据库..."
cd backend
npx prisma generate
npx prisma db push --accept-data-loss 2>/dev/null || print_info "数据库表已存在"
cd ..
print_success "数据库初始化完成"

# 构建项目
echo ""
print_info "构建项目..."
cd backend && pnpm build
cd ../frontend && pnpm build
cd ..
print_success "项目构建完成"

echo ""
echo "================================"
print_success "部署完成！"
echo ""
echo "启动方式："
echo "  开发模式: ./scripts/dev.sh"
echo "  生产模式: ./scripts/start.sh"
echo ""
echo "访问地址："
echo "  前端: http://localhost:5173"
echo "  后端: http://localhost:3000"
echo ""
