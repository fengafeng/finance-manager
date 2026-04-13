// 账户类型
export type AccountType = 'ALIPAY' | 'WECHAT' | 'BANK' | 'CREDIT_CARD' | 'CASH' | 'HUABEI' | 'BAITIAO' | 'DOUYIN_PAY' | 'OTHER';

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
  // 卡号（银行卡/信用卡）
  cardNumber?: string | null;
  // 信用账户扩展字段
  creditLimit?: number | null;
  availableCredit?: number | null;
  billingDate?: number | null;
  paymentDueDate?: number | null;
  unpostedBalance?: number | null;
  installmentInfo?: string | null;
  linkedLoanId?: string | null;
  // 支付宝/微信扩展字段
  thirdPartyAccount?: string | null;
  thirdPartyNickname?: string | null;
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

// 基金类型（扩展为投资产品类型）
export type FundType = 'STOCK' | 'BOND' | 'MIXED' | 'MONEY' | 'QDII' | 'INDEX' | 'WEALTH_MANAGEMENT' | 'STOCK_PRODUCT' | 'PENSION' | 'ANNUITY' | 'UNIVERSAL' | 'INSURANCE_CASH' | 'OTHER';

// 投资平台
export type InvestmentPlatform = 'ALIPAY' | 'WECHAT' | 'TENCENT' | 'JD_FINANCE' | 'BAIDU_WALLET' | 'BANK_APP' | 'FUND_COMPANY' | 'STOCK_BROKER' | 'OTHER';

export interface Fund {
  id: string;
  code: string;
  name: string;
  type: FundType;
  platform: InvestmentPlatform;
  cost: number;
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
  byPlatform: Record<string, { value: number; profit: number }>;
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
  analysisData: HealthAnalysisData | null;
  createdAt: string;
}

// 贷款类型
export type LoanType = 'MORTGAGE' | 'CAR_LOAN' | 'CREDIT_CARD' | 'HUABEI' | 'BAITIAO' | 'DOUYIN_PAY' | 'PERSONAL_LOAN' | 'OTHER';

// 借款方向
export type LoanDirection = 'INCOMING' | 'OUTGOING';

// 借款状态
export type LoanStatus = 'PENDING' | 'OVERDUE' | 'SETTLED';

// 贷款
export interface Loan {
  id: string;
  name: string;
  loanType: LoanType;
  principal: number;
  remainingPrincipal: number;
  annualRate: number;
  startDate: string;
  endDate: string | null;
  paymentDay: number | null;
  monthlyPayment: number | null;
  linkedAccountId: string | null;
  linkedCreditAccountId: string | null;
  autoTrackRepayment: boolean;
  progress: number;
  linkedAccount?: {
    id: string;
    name: string;
    type: AccountType;
  };
  creditAccount?: {
    id: string;
    name: string;
    type: AccountType;
  };
  // 信用账户特有字段
  creditLimit?: number | null;
  availableCredit?: number | null;
  billingDate?: number | null;
  paymentDueDate?: number | null;
  unpostedBalance?: number | null;
  installmentInfo?: string | null;
  // 借款扩展字段
  direction?: LoanDirection | null;
  counterparty?: string | null;
  loanDate?: string | null;
  dueDate?: string | null;
  status?: LoanStatus | null;
  remark?: string | null;
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

// ==================== 三期新增类型 ====================

// 月度预算/预期收支
export interface Budget {
  yearMonth: string;
  expectedIncome: number;
  expectedExpense: number;
  actualIncome: number | null;
  actualExpense: number | null;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

// 公积金账户
export interface ProvidentFund {
  id: string;
  name: string;
  city: string;
  accountNumber: string | null;
  balance: number;
  monthlyContribution: number;
  personalContribution: number | null;
  employerContribution: number | null;
  interestRate: number | null;
  accountStatus: string;
  includeNetWorth: boolean;
  remark: string | null;
  lastUpdated: string;
  createdAt: string;
  updatedAt: string;
}

// 公积金汇总
export interface ProvidentFundSummary {
  totalBalance: number;
  totalMonthlyContribution: number;
  accountCount: number;
  byCity: Record<string, number>;
}

// 健康报告扩展分析数据
export interface HealthAnalysisData {
  assetAllocation: {
    cash: { value: number; ratio: number };
    investment: { value: number; ratio: number };
    providentFund: { value: number; ratio: number };
    byAccountType: Record<string, number>;
  };
  loanHealth: {
    receivableCount: number;
    payableCount: number;
    overdueCount: number;
    totalReceivable: number;
    totalPayable: number;
    overdueList: Array<{
      name: string;
      counterparty: string | null;
      amount: number;
      dueDate: string | null;
    }>;
  };
  monthlyTrend: Array<{ month: string; income: number; expense: number }>;
  providentFund: {
    totalBalance: number;
    totalMonthlyContribution: number;
    accountCount: number;
    byCity: Record<string, number>;
  };
  incomeAchievementRate: number | null;
  expenseAchievementRate: number | null;
}

// 扩展健康报告
export interface HealthReportExtended {
  id: string;
  reportDate: string;
  totalScore: number;
  dimensionScores: any;
  suggestions: string[];
  analysisData: HealthAnalysisData | null;
  createdAt: string;
}

// ==================== 四期新增：导入配置 ====================

// 导入配置来源类型
export type ImportConfigSourceType = 'IMPORT_ALIPAY' | 'IMPORT_WECHAT' | 'IMPORT_BANK';

// 导入配置
export interface ImportConfig {
  id: string;
  name: string;
  sourceType: ImportConfigSourceType;
  linkedAccountId: string | null;
  thirdPartyAccount: string | null;
  nickname: string | null;
  defaultCategory: string | null;
  autoTag: boolean;
  skipInternal: boolean;
  mergeSimilar: boolean;
  isActive: boolean;
  lastImportAt: string | null;
  lastImportCount: number | null;
  remark: string | null;
  linkedAccount?: {
    id: string;
    name: string;
    type: AccountType;
  } | null;
  createdAt: string;
  updatedAt: string;
}

// 导入配置摘要
export interface ImportConfigSummary {
  alipay: {
    configCount: number;
    lastImportAt: string | null;
  };
  wechat: {
    configCount: number;
    lastImportAt: string | null;
  };
  bank: {
    configCount: number;
    lastImportAt: string | null;
  };
}

// 其他可导入的信息类型
export type ImportableInfoType =
  | 'ALIPAY_BILL_SUMMARY'      // 支付宝年度账单汇总
  | 'ALIPAY_MONTHLY_STATS'     // 支付宝月度统计
  | 'ALIPAY_MERCHANT_STATS'     // 支付宝商家消费分析
  | 'WECHAT_YEAR_SUMMARY'      // 微信年度账单
  | 'WECHAT_MONTHLY_STATS'     // 微信月度统计
  | 'WECHAT_MERCHANT_STATS'    // 微信商家消费分析
  | 'BANK_STATEMENT'            // 银行对账单
  | 'CREDIT_CARD_BILL';        // 信用卡账单

// 可导入信息项目
export interface ImportableInfoItem {
  type: ImportableInfoType;
  label: string;
  description: string;
  supportedFormats: string[];
  example: string;
}
