import { MainLayout } from '@/components/layout/MainLayout';
import { FadeIn, Stagger } from '@/components/MotionPrimitives';
import { useLatestNetWorth, useNetWorthBreakdown, useNetWorthTrend, useCreateNetWorthSnapshot } from '@/hooks/use-net-worth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  RefreshCw,
  Wallet,
  PiggyBank,
  CreditCard,
  Home,
} from 'lucide-react';

function formatMoney(amount: number) {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

// 简易趋势图
function TrendChart({ data }: { data: Array<{ date: string; netWorth: number }> }) {
  if (data.length === 0) return null;

  const max = Math.max(...data.map(d => d.netWorth));
  const min = Math.min(...data.map(d => d.netWorth));
  const range = max - min || 1;

  return (
    <div className="h-40 flex items-end gap-1">
      {data.map((item, index) => {
        const height = ((item.netWorth - min) / range) * 100;
        return (
          <div
            key={index}
            className="flex-1 bg-primary/20 hover:bg-primary/40 transition-colors rounded-t"
            style={{ height: `${Math.max(height, 5)}%` }}
            title={`${new Date(item.date).toLocaleDateString()}: ${formatMoney(item.netWorth)}`}
          />
        );
      })}
    </div>
  );
}

// 简易饼图
function PieChart({ data, colors }: { data: Record<string, number>; colors: string[] }) {
  const total = Object.values(data).reduce((sum, v) => sum + v, 0);
  if (total === 0) return null;

  let currentAngle = 0;
  const segments: Array<{ start: number; end: number; color: string; label: string; value: number }> = [];

  Object.entries(data).forEach(([label, value], index) => {
    const percentage = (value / total) * 100;
    segments.push({
      start: currentAngle,
      end: currentAngle + percentage * 3.6,
      color: colors[index % colors.length],
      label,
      value,
    });
    currentAngle += percentage * 3.6;
  });

  return (
    <div className="flex items-center gap-6">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={seg.color}
              strokeWidth="20"
              strokeDasharray={`${(seg.end - seg.start) / 3.6 * 2.51} 251.2`}
              strokeDashoffset={-seg.start / 360 * 251.2}
            />
          ))}
        </svg>
      </div>
      <div className="flex-1 space-y-2">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }} />
              <span style={{ fontSize: 'var(--font-size-small)' }}>{seg.label}</span>
            </div>
            <span style={{ fontSize: 'var(--font-size-small)' }}>{formatMoney(seg.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NetWorth() {
  const { data: latest, isLoading: latestLoading } = useLatestNetWorth();
  const { data: breakdown, isLoading: breakdownLoading } = useNetWorthBreakdown();
  const { data: trend, isLoading: trendLoading } = useNetWorthTrend(6);
  const createSnapshot = useCreateNetWorthSnapshot();

  const isLoading = latestLoading || breakdownLoading || trendLoading;

  if (isLoading) {
    return (
      <MainLayout>
        <LoadingSkeleton />
      </MainLayout>
    );
  }

  const colors = ['#3b82f6', '#22c55e', '#eab308', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <MainLayout>
      <div style={{ gap: 'var(--spacing-xl)' }} className="flex flex-col">
        {/* 页面标题 */}
        <FadeIn className="flex items-center justify-between">
          <div>
            <h1 className="font-bold" style={{ fontSize: 'var(--font-size-headline)' }}>
              资产全景
            </h1>
            <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-body)', marginTop: 'var(--spacing-xs)' }}>
              全资产净值仪表盘
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => createSnapshot.mutate(new Date().toISOString().split('T')[0])}
            disabled={createSnapshot.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${createSnapshot.isPending ? 'animate-spin' : ''}`} />
            刷新快照
          </Button>
        </FadeIn>

        {/* 核心指标 */}
        <Stagger className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FadeIn>
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent style={{ padding: 'var(--spacing-lg)' }}>
                <div className="flex items-center gap-3 mb-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span className="text-muted-foreground" style={{ fontSize: 'var(--font-size-label)' }}>
                    净资产
                  </span>
                </div>
                <p className="font-bold" style={{ fontSize: 'var(--font-size-headline)' }}>
                  {formatMoney(latest?.netWorth || 0)}
                </p>
                {latest?.isLive && (
                  <span className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                    实时计算
                  </span>
                )}
              </CardContent>
            </Card>
          </FadeIn>
          <FadeIn>
            <Card>
              <CardContent style={{ padding: 'var(--spacing-lg)' }}>
                <div className="flex items-center gap-3 mb-2">
                  <Wallet className="h-5 w-5 text-success" />
                  <span className="text-muted-foreground" style={{ fontSize: 'var(--font-size-label)' }}>
                    总资产
                  </span>
                </div>
                <p className="font-bold text-success" style={{ fontSize: 'var(--font-size-headline)' }}>
                  {formatMoney(latest?.totalAssets || 0)}
                </p>
              </CardContent>
            </Card>
          </FadeIn>
          <FadeIn>
            <Card>
              <CardContent style={{ padding: 'var(--spacing-lg)' }}>
                <div className="flex items-center gap-3 mb-2">
                  <CreditCard className="h-5 w-5 text-destructive" />
                  <span className="text-muted-foreground" style={{ fontSize: 'var(--font-size-label)' }}>
                    总负债
                  </span>
                </div>
                <p className="font-bold text-destructive" style={{ fontSize: 'var(--font-size-headline)' }}>
                  {formatMoney(latest?.totalLiabilities || 0)}
                </p>
              </CardContent>
            </Card>
          </FadeIn>
        </Stagger>

        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* 净资产趋势 */}
          <FadeIn>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  净资产趋势（近6个月）
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trend && trend.length > 0 ? (
                  <TrendChart data={trend} />
                ) : (
                  <div className="h-40 flex items-center justify-center text-muted-foreground">
                    暂无历史数据
                  </div>
                )}
              </CardContent>
            </Card>
          </FadeIn>

          {/* 资产构成 */}
          <FadeIn>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PiggyBank className="h-5 w-5" />
                  资产构成
                </CardTitle>
              </CardHeader>
              <CardContent>
                {breakdown && Object.keys(breakdown.accountsByType).length > 0 ? (
                  <PieChart data={breakdown.accountsByType} colors={colors} />
                ) : (
                  <div className="h-40 flex items-center justify-center text-muted-foreground">
                    暂无资产数据
                  </div>
                )}
              </CardContent>
            </Card>
          </FadeIn>
        </div>

        {/* 债务明细 */}
        {breakdown && breakdown.loans.length > 0 && (
          <FadeIn>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  贷款债务
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {breakdown.loans.map((loan, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <Home className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium" style={{ fontSize: 'var(--font-size-label)' }}>
                            {loan.name}
                          </p>
                          <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                            {loan.type}
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold text-destructive" style={{ fontSize: 'var(--font-size-label)' }}>
                        {formatMoney(loan.remainingPrincipal)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        )}
      </div>
    </MainLayout>
  );
}
