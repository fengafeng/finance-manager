# 个人财务资产管理系统

## 产品概述

一个本地运行的个人财务资产管理系统，帮助用户全面管理个人财务资产，包括多平台账户管理、基金持仓追踪、流水账单导入、AI智能数据清洗、记账功能等。系统采用本地优先设计，所有敏感数据加密存储，保障用户数据安全。

## 核心功能

### 1. 多平台账户管理
- 支持多种账户类型：支付宝、微信、银行卡、信用卡、现金账户等
- 账户余额追踪
- 账户分组管理
- 账户图标和颜色自定义

### 2. 流水账单导入
- 手动上传账单文件（CSV/Excel格式）
- 支持支付宝、微信账单格式解析
- 账单预览和数据确认
- 历史导入记录查看

### 3. AI智能数据清洗
- 自动识别退款交易
- 识别内部转账
- 识别提现/充值操作
- 智能分类交易类型
- 商家名称标准化

### 4. 基金持仓管理
- 基金信息录入
- 持仓成本计算
- 收益率追踪
- 基金净值更新

### 5. 记账功能
- 收入/支出记录
- 分类管理（自定义分类）
- 标签系统
- 备注和附件

### 6. 数据看板
- 资产总览
- 收支统计图表
- 消费分类分析
- 基金收益概览
- 月度/年度报表

### 7. 数据安全
- 敏感数据加密存储
- 本地优先设计
- 数据导出备份

## 用户故事

### 账户管理
1. 作为用户，我想添加多个不同平台的账户，以便统一管理所有财务资产
2. 作为用户，我想为每个账户设置图标和颜色，以便快速识别
3. 作为用户，我想查看所有账户的总余额，以便了解整体财务状况

### 账单导入
4. 作为用户，我想导入支付宝/微信账单，以便自动记录消费流水
5. 作为用户，我想预览导入的数据，以便确认信息正确
6. 作为用户，我想查看历史导入记录，以便追溯数据来源

### 智能清洗
7. 作为用户，我想系统自动识别退款交易，以便避免重复记账
8. 作为用户，我想系统识别内部转账，以便准确统计收支
9. 作为用户，我想系统自动分类交易，以便节省手动分类时间

### 基金管理
10. 作为用户，我想录入基金持仓，以便追踪投资收益
11. 作为用户，我想查看基金收益曲线，以便了解投资表现
12. 作为用户，我想记录基金买入卖出，以便计算持仓成本

### 记账功能
13. 作为用户，我想快速记录日常收支，以便养成记账习惯
14. 作为用户，我想自定义分类和标签，以便灵活管理账目
15. 作为用户，我想查看收支明细，以便回顾消费历史

### 数据分析
16. 作为用户，我想查看资产变化趋势，以便了解财务健康
17. 作为用户，我想分析消费分类占比，以便优化消费结构
18. 作为用户，我想生成月度/年度报表，以便总结财务状况

## 页面结构

```
/                          # 首页/看板
/accounts                  # 账户管理
/accounts/new              # 新增账户
/accounts/:id              # 账户详情
/accounts/:id/edit         # 编辑账户
/import                    # 账单导入
/import/history            # 导入历史
/transactions              # 交易流水
/transactions/new          # 新增交易
/funds                     # 基金持仓
/funds/new                 # 新增基金
/funds/:id                 # 基金详情
/reports                   # 报表分析
/settings                  # 系统设置
```

## 数据模型

### Account (账户)
```
- id: UUID
- name: string (账户名称)
- type: enum (alipay, wechat, bank, credit_card, cash, other)
- icon: string (图标)
- color: string (颜色)
- balance: decimal (余额)
- currency: string (币种，默认CNY)
- remark: string (备注)
- is_archived: boolean (是否归档)
- created_at: datetime
- updated_at: datetime
```

### Transaction (交易流水)
```
- id: UUID
- account_id: UUID (关联账户)
- type: enum (income, expense, transfer, refund)
- amount: decimal (金额)
- category: string (分类)
- tags: string[] (标签)
- merchant: string (商家/来源)
- description: string (描述/备注)
- transaction_date: date (交易日期)
- source_type: enum (manual, import_alipay, import_wechat, import_bank)
- source_ref: string (来源引用ID)
- is_cleaned: boolean (是否已清洗)
- clean_type: enum (normal, refund, internal_transfer, withdrawal)
- created_at: datetime
- updated_at: datetime
```

### Fund (基金)
```
- id: UUID
- code: string (基金代码)
- name: string (基金名称)
- type: enum (stock, bond, mixed, money, qdii, other)
- shares: decimal (持有份额)
- cost_per_share: decimal (成本价)
- current_value: decimal (当前市值)
- profit: decimal (收益)
- profit_rate: decimal (收益率)
- purchase_date: date (买入日期)
- remark: string (备注)
- created_at: datetime
- updated_at: datetime
```

### FundTransaction (基金交易记录)
```
- id: UUID
- fund_id: UUID (关联基金)
- type: enum (buy, sell, dividend)
- shares: decimal (份额)
- price: decimal (单价)
- amount: decimal (金额)
- transaction_date: date (交易日期)
- remark: string (备注)
- created_at: datetime
```

### Category (分类)
```
- id: UUID
- name: string (分类名称)
- type: enum (income, expense)
- icon: string (图标)
- color: string (颜色)
- parent_id: UUID (父分类ID，支持多级)
- sort_order: int (排序)
- created_at: datetime
```

### ImportRecord (导入记录)
```
- id: UUID
- source_type: enum (alipay, wechat, bank)
- file_name: string (文件名)
- total_count: int (总记录数)
- success_count: int (成功导入数)
- skip_count: int (跳过数)
- status: enum (pending, processing, completed, failed)
- created_at: datetime
```

## API 端点

### 账户管理
- `POST /api/accounts/list` - 获取账户列表
- `POST /api/accounts/create` - 创建账户
- `POST /api/accounts/get` - 获取账户详情
- `POST /api/accounts/update` - 更新账户
- `POST /api/accounts/delete` - 删除账户
- `POST /api/accounts/summary` - 获取账户汇总

### 交易流水
- `POST /api/transactions/list` - 获取交易列表
- `POST /api/transactions/create` - 创建交易
- `POST /api/transactions/get` - 获取交易详情
- `POST /api/transactions/update` - 更新交易
- `POST /api/transactions/delete` - 删除交易
- `POST /api/transactions/clean` - 数据清洗
- `POST /api/transactions/statistics` - 统计分析

### 账单导入
- `POST /api/import/upload` - 上传账单文件
- `POST /api/import/preview` - 预览解析结果
- `POST /api/import/confirm` - 确认导入
- `POST /api/import/history` - 导入历史

### 基金管理
- `POST /api/funds/list` - 获取基金列表
- `POST /api/funds/create` - 创建基金
- `POST /api/funds/get` - 获取基金详情
- `POST /api/funds/update` - 更新基金
- `POST /api/funds/delete` - 删除基金
- `POST /api/funds/transactions` - 基金交易记录
- `POST /api/funds/summary` - 基金汇总

### 分类管理
- `POST /api/categories/list` - 获取分类列表
- `POST /api/categories/create` - 创建分类
- `POST /api/categories/update` - 更新分类
- `POST /api/categories/delete` - 删除分类

### 报表分析
- `POST /api/reports/overview` - 资产概览
- `POST /api/reports/income-expense` - 收支报表
- `POST /api/reports/category-analysis` - 分类分析
- `POST /api/reports/fund-performance` - 基金收益

## 技术架构

- **前端**: React 19 + TypeScript + Tailwind CSS + shadcn/ui
- **后端**: Express.js + TypeScript + Prisma ORM
- **数据库**: PostgreSQL
- **加密**: 本地敏感数据加密存储
