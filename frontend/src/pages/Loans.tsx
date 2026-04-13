import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { FadeIn, Stagger } from '@/components/MotionPrimitives';
import { useLoans, useCreateLoan, useUpdateLoan, useDeleteLoan, usePaymentSchedule, usePrepaySimulate } from '@/hooks/use-loans';
import { useAccounts } from '@/hooks/use-accounts';
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
  Home,
  Car,
  CreditCard,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Calculator,
} from 'lucide-react';
import type { LoanType } from '@/types';

const loanTypeLabels: Record<LoanType, { label: string; icon: React.ElementType }> = {
  MORTGAGE: { label: '房贷', icon: Home },
  CAR_LOAN: { label: '车贷', icon: Car },
  CREDIT_CARD: { label: '信用卡分期', icon: CreditCard },
  OTHER: { label: '其他', icon: CreditCard },
};

function formatMoney(amount: number) {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('zh-CN');
}

// 贷款表单组件
function LoanForm({
  loan,
  onSubmit,
  onCancel,
}: {
  loan?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const { data: accounts } = useAccounts();

  const [name, setName] = useState(loan?.name || '');
  const [loanType, setLoanType] = useState<LoanType>(loan?.loanType || 'MORTGAGE');
  const [principal, setPrincipal] = useState(loan?.principal?.toString() || '');
  const [remainingPrincipal, setRemainingPrincipal] = useState(loan?.remainingPrincipal?.toString() || '');
  const [annualRate, setAnnualRate] = useState(loan?.annualRate ? (loan.annualRate * 100).toString() : '');
  const [startDate, setStartDate] = useState(loan?.startDate ? formatDate(loan.startDate) : '');
  const [endDate, setEndDate] = useState(loan?.endDate ? formatDate(loan.endDate) : '');
  const [paymentDay, setPaymentDay] = useState(loan?.paymentDay?.toString() || '');
  const [linkedAccountId, setLinkedAccountId] = useState(loan?.linkedAccountId || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      loanType,
      principal: parseFloat(principal) || 0,
      remainingPrincipal: parseFloat(remainingPrincipal) || parseFloat(principal) || 0,
      annualRate: (parseFloat(annualRate) || 0) / 100,
      startDate,
      endDate,
      paymentDay: paymentDay ? parseInt(paymentDay) : undefined,
      linkedAccountId: linkedAccountId || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>贷款名称</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="如：房贷"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>贷款类型</Label>
          <Select value={loanType} onValueChange={(v) => setLoanType(v as LoanType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(loanTypeLabels).map(([value, { label }]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>初始本金</Label>
          <Input
            type="number"
            step="0.01"
            value={principal}
            onChange={(e) => setPrincipal(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>剩余本金</Label>
          <Input
            type="number"
            step="0.01"
            value={remainingPrincipal}
            onChange={(e) => setRemainingPrincipal(e.target.value)}
            placeholder="默认等于初始本金"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>年化利率(%)</Label>
          <Input
            type="number"
            step="0.01"
            value={annualRate}
            onChange={(e) => setAnnualRate(e.target.value)}
            placeholder="如 3.95"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>还款日</Label>
          <Input
            type="number"
            min="1"
            max="31"
            value={paymentDay}
            onChange={(e) => setPaymentDay(e.target.value)}
            placeholder="每月几号"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>开始日期</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>结束日期</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>关联还款账户</Label>
        <Select value={linkedAccountId} onValueChange={setLinkedAccountId}>
          <SelectTrigger>
            <SelectValue placeholder="选择还款账户" />
          </SelectTrigger>
          <SelectContent>
            {accounts?.map((acc) => (
              <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>取消</Button>
        <Button type="submit">{loan ? '更新' : '创建'}</Button>
      </div>
    </form>
  );
}

// 还款计划弹窗
function PaymentScheduleDialog({ loanId, loanName }: { loanId: string; loanName: string }) {
  const { data, isLoading } = usePaymentSchedule(loanId);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Calendar className="h-4 w-4 mr-1" />
          还款计划
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{loanName} - 还款计划</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <Skeleton className="h-64" />
        ) : data ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>总利息</p>
                <p className="font-bold text-destructive">{formatMoney(data.totalInterest)}</p>
              </div>
              <div>
                <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>总还款</p>
                <p className="font-bold">{formatMoney(data.totalPayment)}</p>
              </div>
              <div>
                <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>期数</p>
                <p className="font-bold">{data.schedule.length}期</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ fontSize: 'var(--font-size-small)' }}>
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">期数</th>
                    <th className="text-right p-2">月供</th>
                    <th className="text-right p-2">本金</th>
                    <th className="text-right p-2">利息</th>
                    <th className="text-right p-2">剩余本金</th>
                  </tr>
                </thead>
                <tbody>
                  {data.schedule.slice(0, 24).map((item) => (
                    <tr key={item.month} className="border-b">
                      <td className="p-2">{item.month}</td>
                      <td className="text-right p-2">{formatMoney(item.payment)}</td>
                      <td className="text-right p-2">{formatMoney(item.principal)}</td>
                      <td className="text-right p-2 text-destructive">{formatMoney(item.interest)}</td>
                      <td className="text-right p-2">{formatMoney(item.remaining)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// 提前还款模拟弹窗
function PrepaySimulateDialog({ loanId, loanName, remainingPrincipal }: { loanId: string; loanName: string; remainingPrincipal: number }) {
  const [prepayAmount, setPrepayAmount] = useState('');
  const [mode, setMode] = useState<'shorten_term' | 'reduce_payment'>('shorten_term');
  const [result, setResult] = useState<any>(null);

  const prepaySimulate = usePrepaySimulate();

  const handleSimulate = async () => {
    const res = await prepaySimulate.mutateAsync({
      id: loanId,
      prepayAmount: parseFloat(prepayAmount) || 0,
      mode,
    });
    setResult(res);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Calculator className="h-4 w-4 mr-1" />
          提前还款
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{loanName} - 提前还款模拟</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>提前还款金额</Label>
            <Input
              type="number"
              step="0.01"
              value={prepayAmount}
              onChange={(e) => setPrepayAmount(e.target.value)}
              placeholder={`最大 ${formatMoney(remainingPrincipal)}`}
            />
          </div>
          <div className="space-y-2">
            <Label>还款方式</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shorten_term">缩短年限，月供不变</SelectItem>
                <SelectItem value="reduce_payment">减少月供，期限不变</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSimulate} className="w-full">计算</Button>
          
          {result && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">节省利息</span>
                <span className="font-bold text-success">{formatMoney(result.afterPrepay.totalInterestSaved)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">新月供</span>
                <span className="font-bold">{formatMoney(result.afterPrepay.newMonthlyPayment)}</span>
              </div>
              {result.afterPrepay.monthsSaved && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">缩短期数</span>
                  <span className="font-bold">{result.afterPrepay.monthsSaved}期</span>
                </div>
              )}
              {result.afterPrepay.paymentReduction && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">月供减少</span>
                  <span className="font-bold">{formatMoney(result.afterPrepay.paymentReduction)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Loans() {
  const { data: loans, isLoading } = useLoans();
  const createMutation = useCreateLoan();
  const updateMutation = useUpdateLoan();
  const deleteMutation = useDeleteLoan();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<any>(null);

  const handleSubmit = (data: any) => {
    if (editingLoan) {
      updateMutation.mutate({ id: editingLoan.id, ...data }, {
        onSuccess: () => {
          setDialogOpen(false);
          setEditingLoan(null);
        },
      });
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          setDialogOpen(false);
        },
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个贷款吗？')) {
      deleteMutation.mutate(id);
    }
  };

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

  return (
    <MainLayout>
      <div style={{ gap: 'var(--spacing-xl)' }} className="flex flex-col">
        <FadeIn className="flex items-center justify-between">
          <div>
            <h1 className="font-bold" style={{ fontSize: 'var(--font-size-headline)' }}>
              贷款管理
            </h1>
            <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-body)', marginTop: 'var(--spacing-xs)' }}>
              管理房贷、车贷等各类贷款
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingLoan(null)}>
                <Plus className="h-4 w-4 mr-2" />
                新增贷款
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingLoan ? '编辑贷款' : '新增贷款'}</DialogTitle>
              </DialogHeader>
              <LoanForm
                loan={editingLoan}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setDialogOpen(false);
                  setEditingLoan(null);
                }}
              />
            </DialogContent>
          </Dialog>
        </FadeIn>

        {/* 贷款列表 */}
        <Stagger className="space-y-4">
          {loans?.map((loan) => {
            const typeConfig = loanTypeLabels[loan.loanType];
            const Icon = typeConfig?.icon || CreditCard;
            return (
              <FadeIn key={loan.id}>
                <Card>
                  <CardContent style={{ padding: 'var(--spacing-lg)' }}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                          <Icon className="h-6 w-6 text-destructive" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold" style={{ fontSize: 'var(--font-size-label)' }}>
                              {loan.name}
                            </h3>
                            <Badge variant="secondary">{typeConfig?.label}</Badge>
                          </div>
                          <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                            剩余本金 {formatMoney(loan.remainingPrincipal)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <PaymentScheduleDialog loanId={loan.id} loanName={loan.name} />
                        <PrepaySimulateDialog
                          loanId={loan.id}
                          loanName={loan.name}
                          remainingPrincipal={loan.remainingPrincipal}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingLoan(loan);
                            setDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(loan.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                      <div>
                        <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>月供</p>
                        <p className="font-semibold">{loan.monthlyPayment ? formatMoney(loan.monthlyPayment) : '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>年利率</p>
                        <p className="font-semibold">{(loan.annualRate * 100).toFixed(2)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>还款进度</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${loan.progress}%` }}
                            />
                          </div>
                          <span style={{ fontSize: 'var(--font-size-small)' }}>{loan.progress.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>还款日</p>
                        <p className="font-semibold">{loan.paymentDay ? `每月${loan.paymentDay}号` : '-'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>
            );
          })}
        </Stagger>

        {loans?.length === 0 && (
          <FadeIn>
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Home className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">暂无贷款记录</p>
              </CardContent>
            </Card>
          </FadeIn>
        )}
      </div>
    </MainLayout>
  );
}
