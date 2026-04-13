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
