import { MainLayout } from '@/components/layout/MainLayout';
import { FadeIn } from '@/components/MotionPrimitives';
import { useOverview, useIncomeExpenseReport, useCategoryAnalysis } from '@/hooks/use-reports';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  PieChart,
  TrendingUp,
  BarChart3,
  Calendar,
} from 'lucide-react';

function formatMoney(amount: number) {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  });
}

// 简易柱状图组件
function SimpleBarChart({ data, type }: { data: Array<{ date: string; income: number; expense: number }>; type: 'income' | 'expense' }) {
  const maxValue = Math.max(...data.map(d => type === 'income' ? d.income : d.expense), 1);

  return (
    <div className="flex items-end gap-1 h-40">
      {data.slice(-14).map((item, index) => {
        const value = type === 'income' ? item.income : item.expense;
        const height = (value / maxValue) * 100;
        return (
          <div
            key={index}
            className="flex-1 flex flex-col items-center gap-1"
          >
            <div
              className={`w-full rounded-t transition-all hover:opacity-80 ${
                type === 'income' ? 'bg-success' : 'bg-destructive'
              }`}
              style={{ height: `${Math.max(height, 2)}%` }}
              title={`${formatDate(item.date)}: ${formatMoney(value)}`}
            />
          </div>
        );
      })}
    </div>
  );
}

// 简易饼图组件
function SimplePieChart({ data }: { data: Array<{ category: string | null; amount: number }> }) {
  const total = data.reduce((sum, item) => sum + item.amount, 0);
  const colors = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

  let currentAngle = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-40 h-40">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {data.map((item, index) => {
            const percentage = (item.amount / total) * 100;
            const angle = (percentage / 100) * 360;
            const startAngle = currentAngle;
            currentAngle += angle;

            // 将角度转换为弧度
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (currentAngle * Math.PI) / 180;

            // 计算路径
            const x1 = 50 + 40 * Math.cos(startRad);
            const y1 = 50 + 40 * Math.sin(startRad);
            const x2 = 50 + 40 * Math.cos(endRad);
            const y2 = 50 + 40 * Math.sin(endRad);

            const largeArc = angle > 180 ? 1 : 0;

            return (
              <path
                key={index}
                d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
                fill={colors[index % colors.length]}
                className="hover:opacity-80 transition-opacity"
              />
            );
          })}
        </svg>
      </div>
      <div className="flex-1 space-y-2">
        {data.slice(0, 6).map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <span style={{ fontSize: 'var(--font-size-small)' }}>{item.category || '未分类'}</span>
            </div>
            <span className="font-medium" style={{ fontSize: 'var(--font-size-small)' }}>
              {formatMoney(item.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Reports() {
  const { data: overview, isLoading: overviewLoading } = useOverview();

  // 本月日期范围
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const { data: incomeExpenseData, isLoading: ieLoading } = useIncomeExpenseReport(monthStart, monthEnd);
  const { data: categoryData, isLoading: catLoading } = useCategoryAnalysis(monthStart, monthEnd);

  const isLoading = overviewLoading || ieLoading || catLoading;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-64" />
        </div>
      </MainLayout>
    );
  }

  const expenseCategories = categoryData?.filter(c => c.type === 'EXPENSE') || [];

  return (
    <MainLayout>
      <div style={{ gap: 'var(--spacing-xl)' }} className="flex flex-col">
        {/* 页面标题 */}
        <FadeIn>
          <h1 className="font-bold" style={{ fontSize: 'var(--font-size-headline)' }}>
            报表分析
          </h1>
          <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-body)', marginTop: 'var(--spacing-xs)' }}>
            深入了解您的财务状况
          </p>
        </FadeIn>

        {/* 月度汇总 */}
        <FadeIn>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                本月概览
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-label)' }}>
                    收入
                  </p>
                  <p className="font-bold text-success" style={{ fontSize: 'var(--font-size-headline)' }}>
                    {formatMoney(incomeExpenseData?.total.income || 0)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-label)' }}>
                    支出
                  </p>
                  <p className="font-bold text-destructive" style={{ fontSize: 'var(--font-size-headline)' }}>
                    {formatMoney(incomeExpenseData?.total.expense || 0)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-label)' }}>
                    结余
                  </p>
                  <p
                    className={`font-bold ${(incomeExpenseData?.total.balance || 0) >= 0 ? 'text-success' : 'text-destructive'}`}
                    style={{ fontSize: 'var(--font-size-headline)' }}
                  >
                    {formatMoney(incomeExpenseData?.total.balance || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 收支趋势 */}
          <FadeIn>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  收支趋势
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="expense">
                  <TabsList className="mb-4">
                    <TabsTrigger value="expense">支出</TabsTrigger>
                    <TabsTrigger value="income">收入</TabsTrigger>
                  </TabsList>
                  <TabsContent value="expense">
                    <SimpleBarChart data={incomeExpenseData?.daily || []} type="expense" />
                  </TabsContent>
                  <TabsContent value="income">
                    <SimpleBarChart data={incomeExpenseData?.daily || []} type="income" />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </FadeIn>

          {/* 消费分类 */}
          <FadeIn>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  消费分类
                </CardTitle>
              </CardHeader>
              <CardContent>
                {expenseCategories.length > 0 ? (
                  <SimplePieChart data={expenseCategories} />
                ) : (
                  <div className="flex items-center justify-center h-40 text-muted-foreground">
                    暂无数据
                  </div>
                )}
              </CardContent>
            </Card>
          </FadeIn>
        </div>

        {/* 月度趋势 */}
        <FadeIn>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                近6个月趋势
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {overview?.monthlyTrend.map((item, index) => {
                  const date = new Date(item.month);
                  const monthLabel = `${date.getFullYear()}年${date.getMonth() + 1}月`;
                  return (
                    <div key={index} className="flex items-center gap-4">
                      <div className="w-24 text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                        {monthLabel}
                      </div>
                      <div className="flex-1 flex items-center gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-success" style={{ fontSize: 'var(--font-size-small)' }}>收入</span>
                            <span style={{ fontSize: 'var(--font-size-small)' }}>{formatMoney(item.income)}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-success rounded-full"
                              style={{ width: `${(item.income / Math.max(item.income, item.expense, 1)) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-destructive" style={{ fontSize: 'var(--font-size-small)' }}>支出</span>
                            <span style={{ fontSize: 'var(--font-size-small)' }}>{formatMoney(item.expense)}</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-destructive rounded-full"
                              style={{ width: `${(item.expense / Math.max(item.income, item.expense, 1)) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </MainLayout>
  );
}
