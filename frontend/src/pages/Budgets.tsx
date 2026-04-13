import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { FadeIn, Stagger } from '@/components/MotionPrimitives';
import { useBudgets, useUpsertBudget, useDeleteBudget, useSyncActualBudget } from '@/hooks/use-budget';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  PiggyBank,
  Calendar,
  ArrowRight,
} from 'lucide-react';

function formatMoney(amount: number) {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getCurrentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// 月份预算表单
function BudgetForm({
  budget,
  onSubmit,
  onCancel,
}: {
  budget?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const [yearMonth, setYearMonth] = useState(budget?.yearMonth || getCurrentYearMonth());
  const [expectedIncome, setExpectedIncome] = useState(budget?.expectedIncome?.toString() || '');
  const [expectedExpense, setExpectedExpense] = useState(budget?.expectedExpense?.toString() || '');
  const [remark, setRemark] = useState(budget?.remark || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      yearMonth,
      expectedIncome: parseFloat(expectedIncome) || 0,
      expectedExpense: parseFloat(expectedExpense) || 0,
      remark: remark || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>年月</Label>
        <Input type="month" value={yearMonth} onChange={(e) => setYearMonth(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>预期收入</Label>
          <Input type="number" step="0.01" value={expectedIncome} onChange={(e) => setExpectedIncome(e.target.value)} placeholder="0.00" />
        </div>
        <div className="space-y-2">
          <Label>预期支出</Label>
          <Input type="number" step="0.01" value={expectedExpense} onChange={(e) => setExpectedExpense(e.target.value)} placeholder="0.00" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>备注</Label>
        <Input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="备注" />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>取消</Button>
        <Button type="submit">{budget ? '更新' : '创建'}</Button>
      </div>
    </form>
  );
}

export default function Budgets() {
  const { data: budgets, isLoading } = useBudgets(24);
  const upsertMutation = useUpsertBudget();
  const deleteMutation = useDeleteBudget();
  const syncMutation = useSyncActualBudget();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<any>(null);
  const [syncMonth, setSyncMonth] = useState(getCurrentYearMonth());

  const handleSubmit = (data: any) => {
    upsertMutation.mutate(data, {
      onSuccess: () => { setDialogOpen(false); setEditingBudget(null); },
    });
  };

  const handleDelete = (yearMonth: string) => {
    if (confirm(`确定要删除 ${yearMonth} 的预算吗？`)) {
      deleteMutation.mutate(yearMonth);
    }
  };

  const handleSync = () => {
    syncMutation.mutate(syncMonth, {
      onSuccess: () => alert('已根据当月交易记录同步实际收支！'),
    });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-64" /></div>
      </MainLayout>
    );
  }

  // 计算当月数据
  const now = new Date();
  const currentYM = getCurrentYearMonth();
  const currentBudget = budgets?.find(b => b.yearMonth === currentYM);
  const currentExpectedIncome = currentBudget?.expectedIncome || 0;
  const currentExpectedExpense = currentBudget?.expectedExpense || 0;
  const currentActualIncome = currentBudget?.actualIncome;
  const currentActualExpense = currentBudget?.actualExpense;

  // 收入达成率
  const incomeRate = currentActualIncome !== null && currentExpectedIncome > 0
    ? (currentActualIncome / currentExpectedIncome) * 100 : null;
  const expenseRate = currentActualExpense !== null && currentExpectedExpense > 0
    ? (currentActualExpense / currentExpectedExpense) * 100 : null;

  return (
    <MainLayout>
      <div style={{ gap: 'var(--spacing-xl)' }} className="flex flex-col">
        <FadeIn className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-bold" style={{ fontSize: 'var(--font-size-headline)' }}>月度预算</h1>
            <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-body)', marginTop: 'var(--spacing-xs)' }}>规划每月预期收支，月末对比实际达成情况</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingBudget(null)}><Plus className="h-4 w-4 mr-2" />添加预算</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>{editingBudget ? '编辑预算' : '添加月度预算'}</DialogTitle></DialogHeader>
                <BudgetForm budget={editingBudget} onSubmit={handleSubmit} onCancel={() => { setDialogOpen(false); setEditingBudget(null); }} />
              </DialogContent>
            </Dialog>
          </div>
        </FadeIn>

        {/* 当月汇总卡片 */}
        <FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent style={{ padding: 'var(--spacing-lg)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>预期收入</p>
                  <TrendingUp className="h-4 w-4 text-success" />
                </div>
                <p className="font-bold text-lg">{formatMoney(currentExpectedIncome)}</p>
                {currentActualIncome !== null && (
                  <p className="text-sm text-muted-foreground mt-1">
                    实际：{formatMoney(currentActualIncome)}
                    {incomeRate !== null && <span className={`ml-2 ${incomeRate >= 100 ? 'text-success' : 'text-warning'}`}>{incomeRate.toFixed(0)}%</span>}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent style={{ padding: 'var(--spacing-lg)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>预期支出</p>
                  <TrendingDown className="h-4 w-4 text-destructive" />
                </div>
                <p className="font-bold text-lg">{formatMoney(currentExpectedExpense)}</p>
                {currentActualExpense !== null && (
                  <p className="text-sm text-muted-foreground mt-1">
                    实际：{formatMoney(currentActualExpense)}
                    {expenseRate !== null && <span className={`ml-2 ${expenseRate <= 100 ? 'text-success' : 'text-destructive'}`}>{expenseRate.toFixed(0)}%</span>}
                  </p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent style={{ padding: 'var(--spacing-lg)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>预期结余</p>
                  <PiggyBank className="h-4 w-4 text-primary" />
                </div>
                <p className="font-bold text-lg">{formatMoney(currentExpectedIncome - currentExpectedExpense)}</p>
                {currentActualIncome !== null && currentActualExpense !== null && (
                  <p className="text-sm text-muted-foreground mt-1">实际结余：{formatMoney(currentActualIncome - currentActualExpense)}</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardContent style={{ padding: 'var(--spacing-lg)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>同步实际收支</p>
                  <RefreshCw className="h-4 w-4" />
                </div>
                <div className="flex gap-2">
                  <Input type="month" value={syncMonth} onChange={(e) => setSyncMonth(e.target.value)} className="flex-1" />
                  <Button size="sm" onClick={handleSync} disabled={syncMutation.isPending}>
                    {syncMutation.isPending ? '同步中...' : '同步'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </FadeIn>

        {/* 历史预算列表 */}
        <FadeIn>
          <h2 className="font-semibold mb-3">历史预算</h2>
          {budgets && budgets.length > 0 ? (
            <Stagger className="space-y-3">
              {budgets.map((budget) => {
                const isCurrent = budget.yearMonth === currentYM;
                const surplus = budget.expectedIncome - budget.expectedExpense;
                const actualSurplus = budget.actualIncome !== null && budget.actualExpense !== null
                  ? budget.actualIncome - budget.actualExpense : null;
                const incRate = budget.actualIncome !== null && budget.expectedIncome > 0
                  ? (budget.actualIncome / budget.expectedIncome) * 100 : null;
                const expRate = budget.actualExpense !== null && budget.expectedExpense > 0
                  ? (budget.actualExpense / budget.expectedExpense) * 100 : null;

                return (
                  <FadeIn key={budget.yearMonth}>
                    <Card className={isCurrent ? 'border-primary/30' : ''}>
                      <CardContent style={{ padding: 'var(--spacing-md)' }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Calendar className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{budget.yearMonth}</h3>
                                {isCurrent && <Badge>当月</Badge>}
                                {budget.remark && <span className="text-sm text-muted-foreground">({budget.remark})</span>}
                              </div>
                              <div className="flex gap-4 mt-1 text-sm">
                                <span className="text-success">预期收入 {formatMoney(budget.expectedIncome)}</span>
                                <span className="text-destructive">预期支出 {formatMoney(budget.expectedExpense)}</span>
                                <span className={surplus >= 0 ? 'text-primary' : 'text-warning'}>预期结余 {formatMoney(surplus)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {budget.actualIncome !== null && (
                              <div className="text-right">
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-muted-foreground">实际收入</span>
                                  <span className="font-medium">{formatMoney(budget.actualIncome)}</span>
                                  {incRate !== null && <span className={`text-xs ${incRate >= 100 ? 'text-success' : 'text-warning'}`}>{incRate.toFixed(0)}%</span>}
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-muted-foreground">实际支出</span>
                                  <span className="font-medium">{formatMoney(budget.actualExpense ?? 0)}</span>
                                  {expRate !== null && <span className={`text-xs ${expRate <= 100 ? 'text-success' : 'text-destructive'}`}>{expRate.toFixed(0)}%</span>}
                                </div>
                                {actualSurplus !== null && (
                                  <div className="flex items-center gap-1 text-sm font-medium">
                                    <ArrowRight className="h-3 w-3" />
                                    <span className={actualSurplus >= 0 ? 'text-success' : 'text-destructive'}>实际结余 {formatMoney(actualSurplus)}</span>
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingBudget(budget); setDialogOpen(true); }}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(budget.yearMonth)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </FadeIn>
                );
              })}
            </Stagger>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <PiggyBank className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">暂无预算记录，点击上方按钮添加</p>
              </CardContent>
            </Card>
          )}
        </FadeIn>
      </div>
    </MainLayout>
  );
}
