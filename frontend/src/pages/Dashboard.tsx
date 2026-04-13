import { MainLayout } from '@/components/layout/MainLayout';
import { FadeIn, Stagger } from '@/components/MotionPrimitives';
import { useOverview } from '@/hooks/use-reports';
import { useAccounts } from '@/hooks/use-accounts';
import { useFundSummary, useFunds } from '@/hooks/use-funds';
import { useLoans } from '@/hooks/use-loans';
import { useBudgets } from '@/hooks/use-budget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  BarChart3,
  CreditCard,
  Scale,
} from 'lucide-react';

// 格式化金额
function formatMoney(amount: number, prefix = '¥') {
  return `${prefix}${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// 统计卡片组件
function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  color = 'primary',
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: 'up' | 'down';
  trendValue?: string;
  color?: 'primary' | 'success' | 'warning' | 'destructive';
}) {
  const colorClasses = {
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent style={{ padding: 'var(--spacing-lg)' }}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-label)' }}>
              {title}
            </p>
            <p className="font-bold mt-1" style={{ fontSize: 'var(--font-size-headline)' }}>
              {value}
            </p>
            {trend && trendValue && (
              <div className="flex items-center gap-1 mt-2">
                {trend === 'up' ? (
                  <ArrowUpRight className="h-4 w-4 text-success" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-destructive" />
                )}
                <span className={trend === 'up' ? 'text-success' : 'text-destructive'} style={{ fontSize: 'var(--font-size-small)' }}>
                  {trendValue}
                </span>
              </div>
            )}
          </div>
          <div className={cn('p-2 rounded-lg bg-accent', colorClasses[color])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

// 加载骨架
function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => (
        <Card key={i}>
          <CardContent style={{ padding: 'var(--spacing-lg)' }}>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-8 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { data: overview, isLoading: overviewLoading } = useOverview();
  const { data: fundSummary } = useFundSummary();
  const { data: accounts } = useAccounts();
  const { data: funds } = useFunds();
  const { data: loans } = useLoans();
  const { data: budgets } = useBudgets(12);

  const isLoading = overviewLoading;

  // 计算各类汇总
  const totalAssets = (accounts || []).reduce((sum, acc) => sum + (acc.balance || 0), 0)
    + (fundSummary?.totalValue || 0);
  const totalLiabilities = (loans || []).reduce((sum, loan) => sum + (loan.remainingPrincipal || 0), 0);
  const netWorth = totalAssets - totalLiabilities;

  // 当月预算对比
  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentBudget = budgets?.find(b => b.yearMonth === currentYM);
  const budgetBalance = (currentBudget?.expectedIncome || 0) - (currentBudget?.expectedExpense || 0);
  const actualBalance = ((currentBudget?.actualIncome ?? overview?.month.income) || 0) - ((currentBudget?.actualExpense ?? overview?.month.expense) || 0);

  if (isLoading) {
    return (
      <MainLayout>
        <LoadingSkeleton />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div style={{ gap: 'var(--spacing-xl)' }} className="flex flex-col">
        {/* 页面标题 */}
        <FadeIn>
          <h1 className="font-bold" style={{ fontSize: 'var(--font-size-headline)' }}>
            数据看板
          </h1>
          <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-body)', marginTop: 'var(--spacing-xs)' }}>
            资产概览与财务分析
          </p>
        </FadeIn>

        {/* 统计卡片 */}
        <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <FadeIn>
            <StatCard
              title="净资产"
              value={formatMoney(netWorth)}
              icon={Scale}
              color={netWorth >= 0 ? 'primary' : 'destructive'}
            />
          </FadeIn>
          <FadeIn>
            <StatCard
              title="本月净收入"
              value={formatMoney(overview?.month.balance || 0)}
              icon={overview?.month.balance >= 0 ? TrendingUp : TrendingDown}
              trend={overview?.month.balance >= 0 ? 'up' : 'down'}
              trendValue={`收入 ${formatMoney(overview?.month.income || 0)} / 支出 ${formatMoney(overview?.month.expense || 0)}`}
              color={overview?.month.balance >= 0 ? 'success' : 'destructive'}
            />
          </FadeIn>
          <FadeIn>
            <StatCard
              title="基金收益"
              value={formatMoney(fundSummary?.totalProfit || 0)}
              icon={PiggyBank}
              trend={fundSummary && fundSummary.profitRate >= 0 ? 'up' : 'down'}
              trendValue={`${fundSummary?.profitRate.toFixed(2) || 0}%`}
              color={fundSummary && fundSummary.totalProfit >= 0 ? 'success' : 'destructive'}
            />
          </FadeIn>
          <FadeIn>
            <StatCard
              title="负债总计"
              value={formatMoney(totalLiabilities)}
              icon={CreditCard}
              color={totalLiabilities > 0 ? 'warning' : 'success'}
            />
          </FadeIn>
        </Stagger>

        {/* 当月预算对比 */}
        {currentBudget && (
          <FadeIn>
            <Card className="bg-gradient-to-r from-primary/10 to-transparent">
              <CardContent style={{ padding: 'var(--spacing-lg)' }}>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  当月预算对比 ({currentYM})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                      预期收入
                    </p>
                    <p className="font-bold" style={{ fontSize: 'var(--font-size-label)' }}>
                      {formatMoney(currentBudget.expectedIncome)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      实际: {formatMoney(currentBudget.actualIncome ?? 0)}
                      {currentBudget.actualIncome !== null && currentBudget.expectedIncome > 0 && (
                        <span className={`ml-1 ${(currentBudget.actualIncome / currentBudget.expectedIncome) * 100 >= 100 ? 'text-success' : 'text-warning'}`}>
                          ({(currentBudget.actualIncome / currentBudget.expectedIncome * 100).toFixed(0)}%)
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                      预期支出
                    </p>
                    <p className="font-bold" style={{ fontSize: 'var(--font-size-label)' }}>
                      {formatMoney(currentBudget.expectedExpense)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      实际: {formatMoney(currentBudget.actualExpense ?? 0)}
                      {currentBudget.actualExpense !== null && currentBudget.expectedExpense > 0 && (
                        <span className={`ml-1 ${(currentBudget.actualExpense / currentBudget.expectedExpense) * 100 <= 100 ? 'text-success' : 'text-destructive'}`}>
                          ({(currentBudget.actualExpense / currentBudget.expectedExpense * 100).toFixed(0)}%)
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                      预期结余
                    </p>
                    <p className="font-bold" style={{ fontSize: 'var(--font-size-label)' }}>
                      {formatMoney(budgetBalance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                      实际结余
                    </p>
                    <p className={`font-bold ${actualBalance >= 0 ? 'text-success' : 'text-destructive'}`} style={{ fontSize: 'var(--font-size-label)' }}>
                      {formatMoney(actualBalance)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        )}

        {/* 账户列表 */}
        <FadeIn>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                账户列表
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {accounts?.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: account.color || 'var(--muted)' }}
                      >
                        <Wallet className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium" style={{ fontSize: 'var(--font-size-label)' }}>
                          {account.name}
                        </p>
                        <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                          {account.type}
                        </p>
                      </div>
                    </div>
                    <p className="font-semibold" style={{ fontSize: 'var(--font-size-label)' }}>
                      {formatMoney(account.balance)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* 基金持仓 */}
        <FadeIn>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                基金持仓
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {funds?.map((fund) => (
                  <div
                    key={fund.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div>
                      <p className="font-medium" style={{ fontSize: 'var(--font-size-label)' }}>
                        {fund.name}
                      </p>
                      <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                        {fund.code}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold" style={{ fontSize: 'var(--font-size-label)' }}>
                        {formatMoney(fund.currentValue)}
                      </p>
                      <p
                        className={fund.profit >= 0 ? 'text-success' : 'text-destructive'}
                        style={{ fontSize: 'var(--font-size-small)' }}
                      >
                        {fund.profit >= 0 ? '+' : ''}{formatMoney(fund.profit)} ({fund.profitRate.toFixed(2)}%)
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </MainLayout>
  );
}
