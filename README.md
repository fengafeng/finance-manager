# 财务管家 - 个人财务资产管理系统

<div align="center">

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)

**一款现代化的个人财务管理工具，助您轻松掌控财务状况**

[功能特性](#功能特性) • [快速开始](#快速开始) • [技术栈](#技术栈) • [文档](#文档)

</div>

---

## 📖 项目简介

财务管家是一款功能完整的个人财务管理应用，支持账户管理、交易记录、基金持仓、贷款追踪、财务分析等功能。通过直观的可视化界面和智能分析，帮助用户全面了解和优化个人财务状况。

## ✨ 功能特性

### 核心功能

- 📊 **数据看板** - 一目了然的财务概览，资产趋势可视化
- 💰 **账户管理** - 支持多账户、多类型资产管理
- 📝 **交易流水** - 完整的收支记录，智能分类标签
- 📈 **基金持仓** - 实时基金净值，收益分析

### 高级功能（二期）

- 🏦 **贷款管理** - 房贷/车贷追踪，还款计划，提前还款模拟
- 📅 **定期账单** - 智能识别周期账单，到期提醒
- ⚡ **自动化规则** - 商户/金额匹配，自动分类打标签
- 🤖 **AI财务助手** - 对话式查询，快捷报表，财务建议
- 💎 **资产全景** - 全资产净值仪表盘
- 🏥 **财务健康** - 五维健康评分，个性化建议

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0（自动安装）
- PostgreSQL >= 14.0

### Windows 一键部署

```powershell
# 1. 克隆项目
git clone https://github.com/fengafeng/finance-manager.git
cd finance-manager

# 2. 以管理员身份运行部署脚本
scripts\setup.bat

# 3. 启动开发服务器
scripts\dev.bat
```

### macOS / Linux 部署

```bash
# 1. 克隆项目
git clone https://github.com/fengafeng/finance-manager.git
cd finance-manager

# 2. 运行部署脚本
./scripts/setup.sh

# 3. 启动开发服务器
./scripts/dev.sh
```

### 访问地址

- 前端：http://localhost:5173
- 后端API：http://localhost:3000/api

## 📁 脚本说明

| 脚本 | Windows | Linux/macOS | 说明 |
|------|---------|-------------|------|
| 一键部署 | `scripts\setup.bat` | `./scripts/setup.sh` | 环境配置、依赖安装、数据库初始化 |
| 开发启动 | `scripts\dev.bat` | `./scripts/dev.sh` | 启动前后端开发服务器 |
| 生产启动 | `scripts\start.bat` | `./scripts/start.sh` | 启动生产环境服务 |
| 停止服务 | `scripts\stop.bat` | `./scripts/stop.sh` | 停止所有服务 |

## 🛠 技术栈

### 前端
- **框架**: React 19 + TypeScript
- **构建**: Vite 7
- **样式**: Tailwind CSS + shadcn/ui
- **状态管理**: TanStack Query
- **动画**: Framer Motion

### 后端
- **框架**: Express.js + TypeScript
- **数据库**: PostgreSQL + Prisma ORM
- **AI**: 腾讯混元大模型

## 📁 项目结构

```
finance-manager/
├── frontend/          # 前端项目
│   ├── src/
│   │   ├── components/   # 组件
│   │   ├── pages/        # 页面
│   │   ├── hooks/        # Hooks
│   │   └── types/        # 类型定义
│   └── package.json
├── backend/           # 后端项目
│   ├── src/
│   │   ├── modules/      # 功能模块
│   │   ├── lib/          # 工具库
│   │   └── config/       # 配置
│   └── prisma/           # 数据库模型
├── scripts/           # 部署脚本
│   ├── setup.bat/.sh     # 一键部署
│   ├── dev.bat/.sh       # 开发启动
│   ├── start.bat/.sh     # 生产启动
│   └── stop.bat/.sh      # 停止服务
└── docs/              # 文档目录
```

## 📚 文档

- [开发文档](docs/development.md) - 详细的开发指南
- [使用文档](docs/usage.md) - 用户使用指南
- [API文档](docs/api.md) - 后端API接口说明

## 📄 License

MIT License © 2024

---

<div align="center">

**⭐ 如果这个项目对您有帮助，请给一个 Star ⭐**

</div>
