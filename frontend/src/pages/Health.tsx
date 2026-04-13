import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { FadeIn, Stagger } from '@/components/MotionPrimitives';
import { useLatestHealthReport, useGenerateHealthReport } from '@/hooks/use-health';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Activity,
  RefreshCw,
  Shield,
  AlertTriangle,
  CheckCircle,
  PiggyBank,
  CreditCard,
  Target,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Landmark,
  Users,
  Wallet,
  AlertCircle,
} from 'lucide-react';

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-success';
  if (score >= 60) return 'text-warning';
  return 'text-destructive';
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    </div>
  );
}

// 雷达图组件
function RadarChart({ scores }: { scores: Record<string, { score: number; weight: number }> }) {
  const dimensions = Object.entries(scores);
  const centerX = 100;
  const centerY = 100;
  const radius = 80;

  const points = dimensions.map(([key, value], index) => {
    const angle = (index / dimensions.length) * Math.PI * 2 - Math.PI / 2;
    const r = (value.score / 100) * radius;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle),
      label: key,
      score: value.score,
    };
  });

  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  return (
    <div className="flex justify-center">
      <svg viewBox="0 0 200 200" className="w-48 h-48">
        {/* 背景圆环 */}
        {[20, 40, 60, 80, 100].map(r => (
          <circle
            key={r}
            cx={centerX}
            cy={centerY}
            r={(r / 100) * radius}
            fill="none"
            stroke="currentColor"
            className="text-border"
            strokeWidth="1"
          />
        ))}
        {/* 轴线 */}
        {points.map((_, i) => (
          <line
            key={i}
            x1={centerX}
            y1={centerY}
            x2={centerX + radius * Math.cos((i / dimensions.length) * Math.PI * 2 - Math.PI / 2)}
            y2={centerY + radius * Math.sin((i / dimensions.length) * Math.PI * 2 - Math.PI / 2)}
            stroke="currentColor"
            className="text-border"
            strokeWidth="1"
          />
        ))}
        {/* 数据区域 */}
        <path d={pathData} fill="currentColor" className="text-primary/20" stroke="currentColor" strokeWidth="2" />
        {/* 数据点 */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="4" fill="currentColor" className="text-primary" />
        ))}
      </svg>
    </div>
  );
}

// 维度卡片
function DimensionCard({
  title,
  icon: Icon,
  score,
  description,
}: {
  title: string;
  icon: React.ElementType;
  score: number;
  description?: string;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent style={{ padding: 'var(--spacing-md)' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span style={{ fontSize: 'var(--font-size-label)' }}>{title}</span>
          </div>
          <Badge variant={score >= 80 ? 'default' : score >= 60 ? 'secondary' : 'destructive'}>{score}分</Badge>
        </div>
        <div className="mt-2">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${
                score >= 80 ? 'bg-success' : score >= 60 ? 'bg-warning' : 'bg-destructive'
              }`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
        {description && (
          <p className="text-muted-foreground mt-2" style={{ fontSize: 'var(--font-size-small)' }}>
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

const dimensionLabels: Record<string, { label: string; icon: React.ElementType; format: (v: number) => string }> = {
  savingsRate: { label: '储蓄率', icon: PiggyBank, format: v => `${v.toFixed(1)}%` },
  emergencyFund: { label: '应急金覆盖率', icon: Shield, format: v => `${v.toFixed(1)}个月` },
  debtRatio: { label: '负债收入比', icon: CreditCard, format: v => `${v.toFixed(1)}%` },
  budgetExecution: { label: '预算执行率', icon: Target, format: v => `${v.toFixed(1)}%` },
  investmentVolatility: { label: '投资波动率', icon: BarChart3, format: v => `${v.toFixed(1)}%` },
};

export default function Health() {
  const { data: report, isLoading } = useLatestHealthReport();
  const generateReport = useGenerateHealthReport();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await generateReport.mutateAsync();
    } finally {
      setIsGenerating(false);
    }
  };

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
        <FadeIn className="flex items-center justify-between">
          <div>
            <h1 className="font-bold" style={{ fontSize: 'var(--font-size-headline)' }}>
              财务健康
            </h1>
            <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-body)', marginTop: 'var(--spacing-xs)' }}>
              财务健康评分与体检报告
            </p>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
            生成报告
          </Button>
        </FadeIn>

        {report ? (
          <>
            {/* 综合得分 */}
            <FadeIn>
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                <CardContent style={{ padding: 'var(--spacing-xl)' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-label)' }}>
                        综合健康评分
                      </p>
                      <p className={`font-bold ${getScoreColor(report.totalScore)}`} style={{ fontSize: '3rem' }}>
                        {report.totalScore.toFixed(0)}
                        <span style={{ fontSize: 'var(--font-size-headline)' }}>分</span>
                      </p>
                      <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                        {new Date(report.reportDate).toLocaleDateString()} 生成
                      </p>
                    </div>
                    <Activity className="h-16 w-16 text-primary/20" />
                  </div>
                </CardContent>
              </Card>
            </FadeIn>

            {/* 雷达图和维度得分 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <FadeIn>
                <Card>
                  <CardHeader>
                    <CardTitle>各维度评分</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {report.dimensionScores && (
                      <RadarChart scores={report.dimensionScores} />
                    )}
                  </CardContent>
                </Card>
              </FadeIn>

              <FadeIn>
                <Card>
                  <CardHeader>
                    <CardTitle>改进建议</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {report.suggestions?.map((suggestion, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                        >
                          {index === report.suggestions.length - 1 ? (
                            <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
                          )}
                          <p style={{ fontSize: 'var(--font-size-label)' }}>{suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>
            </div>

            {/* 维度详情 */}
            <FadeIn>
              <h2 className="font-semibold" style={{ fontSize: 'var(--font-size-title)' }}>
                维度详情
              </h2>
            </FadeIn>
            <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {report.dimensionScores &&
                Object.entries(report.dimensionScores).map(([key, data]) => {
                  const config = dimensionLabels[key];
                  if (!config) return null;
                  return (
                    <FadeIn key={key}>
                      <DimensionCard
                        title={config.label}
                        icon={config.icon}
                        score={data.score}
                        description={
                          data.details
                            ? Object.entries(data.details)
                                .map(([k, v]) => `${k}: ${typeof v === 'number' ? v.toFixed(2) : v}`)
                                .join(' | ')
                            : undefined
                        }
                      />
                    </FadeIn>
                  );
                })}
            </Stagger>

            {/* 扩展分析数据 */}
            {report.analysisData && (
              <>
                <FadeIn>
                  <h2 className="font-semibold" style={{ fontSize: 'var(--font-size-title)' }}>综合分析</h2>
                </FadeIn>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 收支趋势 */}
                  <FadeIn>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5" /> 收支趋势（近6月）
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {report.analysisData.monthlyTrend?.map((m: any) => (
                            <div key={m.month} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground w-16">{m.month}</span>
                              <div className="flex items-center gap-2 flex-1 justify-end">
                                <TrendingUp className="h-3 w-3 text-success" />
                                <span className="text-success w-20 text-right">{m.income.toLocaleString()}</span>
                                <TrendingDown className="h-3 w-3 text-destructive" />
                                <span className="text-destructive w-20 text-right">{m.expense.toLocaleString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        {/* 预期收入达成率 */}
                        {report.analysisData.incomeAchievementRate !== null && (
                          <div className="mt-4 pt-3 border-t">
                            <p className="text-sm text-muted-foreground mb-1">当月收入达成率</p>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${report.analysisData.incomeAchievementRate >= 100 ? 'bg-success' : 'bg-warning'}`}
                                  style={{ width: `${Math.min(100, report.analysisData.incomeAchievementRate)}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium w-12 text-right">{report.analysisData.incomeAchievementRate.toFixed(0)}%</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </FadeIn>

                  {/* 资产配置 */}
                  <FadeIn>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Wallet className="h-5 w-5" /> 资产配置
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {[
                            { key: 'cash', label: '现金/存款', icon: Wallet, color: 'bg-blue-500' },
                            { key: 'investment', label: '投资资产', icon: TrendingUp, color: 'bg-purple-500' },
                            { key: 'providentFund', label: '公积金', icon: Landmark, color: 'bg-green-500' },
                          ].map(({ key, label, icon: Icon, color }) => {
                            const asset = report.analysisData.assetAllocation?.[key];
                            if (!asset) return null;
                            return (
                              <div key={key} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${color}`} />
                                  <span className="text-sm">{label}</span>
                                </div>
                                <div className="text-right">
                                  <span className="font-semibold text-sm">{asset.value?.toLocaleString()}</span>
                                  <span className="text-muted-foreground text-xs ml-1">({asset.ratio?.toFixed(1)}%)</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </FadeIn>

                  {/* 借款健康 */}
                  <FadeIn>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" /> 借款健康
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4 mb-3">
                          <div className="p-3 bg-green-50 rounded-lg">
                            <p className="text-xs text-muted-foreground">借出（应收）</p>
                            <p className="font-bold text-success">{report.analysisData.loanHealth?.totalReceivable?.toLocaleString() || 0}</p>
                            <p className="text-xs text-muted-foreground">{report.analysisData.loanHealth?.receivableCount || 0} 笔</p>
                          </div>
                          <div className="p-3 bg-red-50 rounded-lg">
                            <p className="text-xs text-muted-foreground">借入（应付）</p>
                            <p className="font-bold text-destructive">{report.analysisData.loanHealth?.totalPayable?.toLocaleString() || 0}</p>
                            <p className="text-xs text-muted-foreground">{report.analysisData.loanHealth?.payableCount || 0} 笔</p>
                          </div>
                        </div>
                        {report.analysisData.loanHealth?.overdueCount > 0 && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center gap-1 mb-2">
                              <AlertCircle className="h-4 w-4 text-red-500" />
                              <span className="font-medium text-sm text-red-700">逾期提醒（{report.analysisData.loanHealth.overdueCount}笔）</span>
                            </div>
                            {report.analysisData.loanHealth.overdueList?.map((item: any, i: number) => (
                              <div key={i} className="text-sm flex justify-between py-1">
                                <span className="text-muted-foreground">{item.name}{item.counterparty ? `（${item.counterparty}）` : ''}</span>
                                <span className="font-medium text-destructive">¥{item.amount?.toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {(!report.analysisData.loanHealth?.receivableCount && !report.analysisData.loanHealth?.payableCount) && (
                          <p className="text-sm text-muted-foreground text-center py-4">暂无借款记录</p>
                        )}
                      </CardContent>
                    </Card>
                  </FadeIn>

                  {/* 公积金 */}
                  <FadeIn>
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Landmark className="h-5 w-5" /> 公积金
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {report.analysisData.providentFund?.accountCount > 0 ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 bg-primary/5 rounded-lg">
                                <p className="text-xs text-muted-foreground">总余额</p>
                                <p className="font-bold">¥{report.analysisData.providentFund.totalBalance?.toLocaleString()}</p>
                              </div>
                              <div className="p-3 bg-primary/5 rounded-lg">
                                <p className="text-xs text-muted-foreground">月缴存</p>
                                <p className="font-bold">¥{report.analysisData.providentFund.totalMonthlyContribution?.toLocaleString()}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">按城市分布</p>
                              {Object.entries(report.analysisData.providentFund.byCity || {}).map(([city, balance]) => (
                                <div key={city} className="flex justify-between text-sm py-1 border-b border-border/50 last:border-0">
                                  <span>{city}</span>
                                  <span className="font-medium">¥{Number(balance).toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">暂无公积金账户</p>
                        )}
                      </CardContent>
                    </Card>
                  </FadeIn>
                </div>
              </>
            )}
          </>
        ) : (
          <FadeIn>
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">暂无健康报告</p>
                <Button onClick={handleGenerate}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  生成报告
                </Button>
              </CardContent>
            </Card>
          </FadeIn>
        )}
      </div>
    </MainLayout>
  );
}
