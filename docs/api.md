# API 接口文档

## 基础信息

- **Base URL**: `http://localhost:3000/api`
- **请求方式**: POST
- **请求格式**: `application/json`
- **响应格式**: `application/json`

## 通用响应格式

```typescript
// 成功响应
{
  "success": true,
  "data": T
}

// 错误响应
{
  "success": false,
  "error": "错误信息"
}
```

---

## 账户模块

### 获取账户列表

```
POST /accounts/list
```

**请求参数**: 无

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "招商银行",
      "type": "BANK",
      "balance": 10000.00,
      "isAsset": true,
      "includeNetWorth": true
    }
  ]
}
```

### 创建账户

```
POST /accounts/create
```

**请求参数**:
```json
{
  "name": "招商银行",
  "type": "BANK",
  "balance": 10000.00,
  "isAsset": true,
  "includeNetWorth": true
}
```

### 更新账户

```
POST /accounts/update
```

**请求参数**:
```json
{
  "id": "uuid",
  "name": "招商银行储蓄卡",
  "balance": 15000.00
}
```

### 删除账户

```
POST /accounts/delete
```

**请求参数**:
```json
{
  "id": "uuid"
}
```

---

## 交易模块

### 获取交易列表

```
POST /transactions/list
```

**请求参数**:
```json
{
  "accountId": "uuid",  // 可选
  "startDate": "2024-01-01",  // 可选
  "endDate": "2024-12-31",  // 可选
  "type": "EXPENSE"  // 可选，INCOME | EXPENSE
}
```

### 创建交易

```
POST /transactions/create
```

**请求参数**:
```json
{
  "accountId": "uuid",
  "type": "EXPENSE",
  "amount": 100.00,
  "category": "餐饮",
  "merchant": "美团外卖",
  "description": "午餐",
  "transactionDate": "2024-01-15"
}
```

---

## 基金模块

### 获取基金列表

```
POST /funds/list
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "code": "000001",
      "name": "华夏成长混合",
      "shares": 1000.00,
      "costPerShare": 1.50,
      "currentValue": 1600.00,
      "profit": 100.00,
      "profitRate": 6.67
    }
  ]
}
```

---

## 贷款模块

### 获取贷款列表

```
POST /loans/list
```

### 获取还款计划

```
POST /loans/payment-schedule
```

**请求参数**:
```json
{
  "id": "loan-uuid"
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "totalInterest": 50000.00,
    "totalPayment": 350000.00,
    "schedule": [
      {
        "month": 1,
        "payment": 8750.00,
        "principal": 7500.00,
        "interest": 1250.00,
        "remaining": 292500.00
      }
    ]
  }
}
```

### 提前还款模拟

```
POST /loans/prepay-simulate
```

**请求参数**:
```json
{
  "id": "loan-uuid",
  "prepayAmount": 50000.00,
  "mode": "shorten_term"  // shorten_term | reduce_payment
}
```

---

## 定期账单模块

### 获取定期账单

```
POST /recurring/list
```

### 获取智能建议

```
POST /recurring/suggestions
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "name": "房租",
      "merchantPattern": "房东",
      "cycleType": "MONTHLY",
      "occurrences": 6,
      "amountPattern": "约 3000 元"
    }
  ]
}
```

---

## 自动化规则模块

### 获取规则列表

```
POST /automation/list
```

### 创建规则

```
POST /automation/create
```

**请求参数**:
```json
{
  "name": "外卖自动分类",
  "triggerType": "merchant",
  "triggerConfig": {
    "pattern": "美团,饿了么"
  },
  "actionType": "set_category",
  "actionConfig": {
    "categoryId": "餐饮"
  },
  "priority": 10
}
```

### 切换规则状态

```
POST /automation/toggle
```

**请求参数**:
```json
{
  "id": "rule-uuid"
}
```

---

## AI 对话模块

### 对话接口

```
POST /ai-chat/chat
```

**请求参数**:
```json
{
  "message": "我这个月花了多少钱？",
  "history": [
    {
      "role": "user",
      "content": "你好"
    },
    {
      "role": "assistant",
      "content": "您好！我是您的财务助手..."
    }
  ]
}
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "reply": "根据统计，本月您的总支出为 ¥3,256.80，其中餐饮支出最多...",
    "usage": {
      "PromptTokens": 500,
      "CompletionTokens": 100,
      "TotalTokens": 600
    }
  }
}
```

### 快捷查询

```
POST /ai-chat/quick-query
```

**请求参数**:
```json
{
  "queryType": "balance"  // balance | month_summary | fund_status | loan_status | savings_rate | expense_analysis
}
```

---

## 净值模块

### 获取最新净值

```
POST /net-worth/latest
```

### 获取资产分布

```
POST /net-worth/breakdown
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "byAccount": [
      { "name": "招商银行", "value": 10000.00, "percentage": 50 }
    ],
    "byFund": [
      { "name": "华夏成长", "value": 5000.00, "percentage": 25 }
    ]
  }
}
```

---

## 健康评分模块

### 获取最新报告

```
POST /health/latest
```

### 生成健康报告

```
POST /health/generate
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "totalScore": 75,
    "dimensionScores": {
      "savingsRate": { "score": 80, "value": 0.25 },
      "emergencyFund": { "score": 60, "value": 2.5 },
      "debtRatio": { "score": 90, "value": 0.1 },
      "budgetExecution": { "score": 70, "value": 0.85 },
      "investmentVolatility": { "score": 75, "value": 0.08 }
    },
    "suggestions": [
      "建议建立3-6个月支出的应急储备金"
    ]
  }
}
```

---

## 系统模块

### 健康检查

```
GET /health
```

### 就绪检查

```
GET /health/ready
```

### 系统状态

```
GET /status
```
