// 账户类型
export type AccountType = 'ALIPAY' | 'WECHAT' | 'BANK' | 'CREDIT_CARD' | 'CASH' | 'OTHER';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  icon: string | null;
  color: string | null;
  balance: number;
  currency: string;
  remark: string | null;
  isArchived: boolean;
  isAsset: boolean;
  includeNetWorth: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AccountSummary {
  totalBalance: number;
  accountCount: number;
  byType: Record<string, number>;
}

// 交易类型
export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'REFUND';

export interface Transaction {
  id: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  category: string | null;
  tags: string[];
  merchant: string | null;
  description: string | null;
  transactionDate: string;
  sourceType: string;
  sourceRef: string | null;
  isCleaned: boolean;
  cleanType: string | null;
  isRecurring: boolean;
  recurringBillId: string | null;
  needsReview: boolean;
  createdAt: string;
  updatedAt: string;
  account?: {
    id: string;
    name: string;
    type: AccountType;
    icon: string | null;
  };
}

export interface TransactionStatistics {
  income: { total: number; count: number };
  expense: { total: number; count: number };
  balance: number;
  byCategory: Array<{
    category: string | null;
    amount: number;
    count: number;
  }>;
}

// 基金类型
export type FundType = 'STOCK' | 'BOND' | 'MIXED' | 'MONEY' | 'QDII' | 'OTHER';

export interface Fund {
  id: string;
  code: string;
  name: string;
  type: FundType;
  shares: number;
  costPerShare: number;
  currentValue: number;
  profit: number;
  profitRate: number;
  targetWeight: number | null;
  purchaseDate: string | null;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FundSummary {
  totalValue: number;
  totalProfit: number;
  totalCost: number;
  profitRate: number;
  fundCount: number;
  byType: Record<string, { value: number; profit: number }>;
}

// 分类
export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string | null;
  color: string | null;
  parentId: string | null;
  sortOrder: number;
  createdAt: string;
  children?: Category[];
}

// 报表数据
export interface OverviewData {
  totalAssets: number;
  totalFundValue: number;
  totalFundProfit: number;
  totalWealth: number;
  accountCount: number;
  fundCount: number;
  month: {
    income: number;
    expense: number;
    balance: number;
  };
  monthlyTrend: Array<{
    month: string;
    income: number;
    expense: number;
  }>;
}

// ==================== 二期新增类型 ====================

// 净资产快照
export interface NetWorthSnapshot {
  id: string;
  snapshotDate: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  assetBreakdown: string | null;
  createdAt: string;
}

// 净资产明细
export interface NetWorthBreakdown {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  assetBreakdown: {
    accounts: number;
    funds: number;
  };
  liabilityBreakdown: {
    creditCards: number;
    loans: number;
  };
  accountsByType: Record<string, number>;
  fundsByType: Record<string, number>;
  loans: Array<{
    name: string;
    remainingPrincipal: number;
    type: string;
  }>;
}

// 健康报告维度得分
export interface DimensionScore {
  score: number;
  value: number;
  details: Record<string, any>;
  weight: number;
}

// 健康报告
export interface HealthReport {
  id: string;
  reportDate: string;
  totalScore: number;
  dimensionScores: {
    savingsRate: DimensionScore;
    emergencyFund: DimensionScore;
    debtRatio: DimensionScore;
    budgetExecution: DimensionScore;
    investmentVolatility: DimensionScore;
  };
  suggestions: string[];
  createdAt: string;
}

// 贷款类型
export type LoanType = 'MORTGAGE' | 'CAR_LOAN' | 'CREDIT_CARD' | 'OTHER';

// 贷款
export interface Loan {
  id: string;
  name: string;
  loanType: LoanType;
  principal: number;
  remainingPrincipal: number;
  annualRate: number;
  startDate: string;
  endDate: string;
  paymentDay: number | null;
  monthlyPayment: number | null;
  linkedAccountId: string | null;
  autoTrackRepayment: boolean;
  progress: number;
  linkedAccount?: {
    id: string;
    name: string;
    type: AccountType;
  };
  createdAt: string;
  updatedAt: string;
}

// 还款计划项
export interface PaymentScheduleItem {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  remaining: number;
}

// 提前还款模拟结果
export interface PrepaySimulation {
  original: {
    remainingPrincipal: number;
    remainingMonths: number;
    monthlyPayment: number;
  };
  afterPrepay: {
    newPrincipal: number;
    newMonths: number;
    newMonthlyPayment: number;
    monthsSaved?: number;
    paymentReduction?: number;
    totalInterestSaved: number;
  };
  prepayAmount: number;
  mode: 'shorten_term' | 'reduce_payment';
}

// 周期类型
export type CycleType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

// 定期账单
export interface RecurringBill {
  id: string;
  name: string;
  merchantPattern: string | null;
  amountPattern: string | null;
  cycleType: CycleType;
  cycleDay: number | null;
  nextDueDate: string | null;
  reminderDays: number;
  isActive: boolean;
  lastMatchedAt: string | null;
  daysUntilDue?: number | null;
  isUpcoming?: boolean;
  createdAt: string;
  updatedAt: string;
}

// 自动化规则
export interface AutomationRule {
  id: string;
  name: string;
  triggerType: 'merchant' | 'category' | 'amount' | 'combination';
  triggerConfig: Record<string, any>;
  actionType: 'add_tag' | 'set_category' | 'send_notification' | 'mark_review';
  actionConfig: Record<string, any>;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
