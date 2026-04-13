# 开发文档

## 开发环境搭建

### 1. 安装依赖

```bash
# 安装前端依赖
cd frontend && pnpm install

# 安装后端依赖
cd backend && pnpm install
```

### 2. 配置环境变量

#### 后端配置 (backend/.env)

```env
# 服务配置
PORT=3000
NODE_ENV=development

# 数据库配置
DATABASE_URL="postgres://postgres:PASSWORD@localhost:5432/finance_manager?schema=public"

# CORS配置
CORS_ORIGIN="http://localhost:5173"
```

#### 前端配置 (frontend/.env)

```env
VITE_API_URL=http://localhost:3000/api
```

### 3. 数据库初始化

```bash
cd backend

# 生成 Prisma Client
npx prisma generate

# 同步数据库结构
npx prisma db push

# (可选) 打开 Prisma Studio
npx prisma studio
```

## 项目架构

### 前端架构

```
frontend/src/
├── components/          # 组件目录
│   ├── ui/              # 基础UI组件 (shadcn/ui)
│   ├── layout/          # 布局组件
│   └── MotionPrimitives/ # 动画组件
├── pages/               # 页面组件
│   ├── Dashboard.tsx    # 数据看板
│   ├── Accounts.tsx     # 账户管理
│   ├── Transactions.tsx # 交易流水
│   ├── Funds.tsx        # 基金持仓
│   ├── NetWorth.tsx     # 资产全景
│   ├── Health.tsx       # 财务健康
│   ├── Loans.tsx        # 贷款管理
│   ├── Recurring.tsx    # 定期账单
│   ├── Automation.tsx   # 自动化规则
│   └── AIChat.tsx       # AI助手
├── hooks/               # React Query Hooks
├── lib/                 # 工具函数
├── types/               # TypeScript 类型
└── App.tsx              # 应用入口
```

### 后端架构

```
backend/src/
├── modules/             # 功能模块
│   ├── account.ts       # 账户模块
│   ├── transaction.ts   # 交易模块
│   ├── fund.ts          # 基金模块
│   ├── net-worth.ts     # 资产净值
│   ├── health.ts        # 健康评分
│   ├── loan.ts          # 贷款管理
│   ├── recurring.ts     # 定期账单
│   ├── automation.ts    # 自动化规则
│   └── ai-chat.ts       # AI对话
├── lib/                 # 工具库
│   └── hunyuan-chat.ts  # 混元大模型封装
├── config/              # 配置
│   ├── env.ts           # 环境变量
│   └── database.ts      # 数据库连接
├── middleware/          # 中间件
│   ├── errorHandler.ts  # 错误处理
│   ├── logger.ts        # 日志
│   └── validation.ts    # 参数验证
└── app.ts               # 应用入口
```

## 开发规范

### 代码风格

- 使用 TypeScript 编写所有代码
- 使用 ESLint + Prettier 进行代码格式化
- 组件使用函数式组件 + Hooks
- 后端使用 async/await 处理异步

### 命名规范

| 类型 | 规范 | 示例 |
|------|------|------|
| 组件 | PascalCase | `AccountCard.tsx` |
| 函数 | camelCase | `calculateTotal()` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| 文件 | kebab-case | `net-worth.ts` |

### Git 提交规范

```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式
refactor: 重构
test: 测试
chore: 构建/工具
```

## 数据库模型

### 核心表结构

```prisma
// 账户
model Account {
  id              String   @id @default(uuid())
  name            String
  type            AccountType
  balance         Decimal  @db.Decimal(15, 2)
  isAsset         Boolean  @default(true)
  includeNetWorth Boolean  @default(true)
}

// 交易
model Transaction {
  id              String   @id @default(uuid())
  accountId       String
  type            TransactionType
  amount          Decimal  @db.Decimal(15, 2)
  transactionDate DateTime @default(now())
  category        String?
  tags            String[]
  merchant        String?
}

// 基金
model Fund {
  id            String   @id @default(uuid())
  code          String   @unique
  name          String
  shares        Decimal  @db.Decimal(15, 4)
  currentValue  Decimal  @db.Decimal(15, 2)
  profit        Decimal  @db.Decimal(15, 2)
}

// 贷款
model Loan {
  id                  String   @id @default(uuid())
  name                String
  loanType            LoanType
  principal           Decimal  @db.Decimal(15, 2)
  remainingPrincipal  Decimal  @db.Decimal(15, 2)
  annualRate          Decimal  @db.Decimal(5, 4)
}
```

## API 接口

### 请求格式

所有 API 使用 POST 方法，请求体为 JSON 格式：

```typescript
// 请求
POST /api/accounts/list
Content-Type: application/json
{}

// 响应
{
  "success": true,
  "data": [...]
}
```

### 接口列表

| 模块 | 接口 | 描述 |
|------|------|------|
| 账户 | `/accounts/list` | 获取账户列表 |
| 账户 | `/accounts/create` | 创建账户 |
| 账户 | `/accounts/update` | 更新账户 |
| 交易 | `/transactions/list` | 获取交易列表 |
| 交易 | `/transactions/create` | 创建交易 |
| 基金 | `/funds/list` | 获取基金列表 |
| 净值 | `/net-worth/latest` | 获取最新净值 |
| 健康 | `/health/latest` | 获取健康报告 |
| 贷款 | `/loans/list` | 获取贷款列表 |
| AI | `/ai-chat/chat` | AI对话 |

## 常见问题

### 数据库连接失败

检查 PostgreSQL 服务是否启动，确认连接字符串正确：

```bash
# 启动 PostgreSQL
pg_ctl start -D /path/to/data

# 测试连接
psql -h localhost -U postgres -d finance_manager
```

### 前端请求跨域

确保后端 CORS 配置正确：

```typescript
// backend/src/app.ts
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}))
```

### AI 功能不可用

检查混元大模型配置，确保网络可达。
