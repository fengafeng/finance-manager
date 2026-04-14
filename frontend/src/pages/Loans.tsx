import { useState, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { FadeIn, Stagger } from '@/components/MotionPrimitives';
import { useLoans, useCreateLoan, useUpdateLoan, useDeleteLoan, usePaymentSchedule, usePrepaySimulate } from '@/hooks/use-loans';
import { useAccounts } from '@/hooks/use-accounts';
import { useNaturalAdd, useNaturalCreate } from '@/hooks/use-natural-add';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
  Sparkles,
  ArrowDownCircle,
  ArrowUpCircle,
  Users,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import type { LoanType, LoanDirection, LoanStatus } from '@/types';
import { toast } from 'sonner';


const loanTypeLabels: Record<LoanType, { label: string; icon: React.ElementType; category: 'traditional' | 'credit' }> = {
  MORTGAGE: { label: '房贷', icon: Home, category: 'traditional' },
  CAR_LOAN: { label: '车贷', icon: Car, category: 'traditional' },
  CREDIT_CARD: { label: '信用卡', icon: CreditCard, category: 'credit' },
  HUABEI: { label: '花呗', icon: CreditCard, category: 'credit' },
  BAITIAO: { label: '白条', icon: CreditCard, category: 'credit' },
  DOUYIN_PAY: { label: '抖音月付', icon: CreditCard, category: 'credit' },
  PERSONAL_LOAN: { label: '个人借款', icon: Users, category: 'traditional' },
  OTHER: { label: '其他', icon: CreditCard, category: 'traditional' },
};

const statusColors: Record<LoanStatus, string> = {
  PENDING: 'bg-blue-100 text-blue-700',
  OVERDUE: 'bg-red-100 text-red-700',
  SETTLED: 'bg-green-100 text-green-700',
};

// 信用账户类型（用于智能添加）
const CREDIT_LOAN_TYPES: LoanType[] = ['CREDIT_CARD', 'HUABEI', 'BAITIAO', 'DOUYIN_PAY'];

// 银行还款日自动计算规则
// 出账日后的固定天数
const BANK_REPAYMENT_RULES: Record<string, number> = {
  // 工商银行：出账日后25天
  '工商银行': 25,
  '工行': 25,
  // 建设银行：还款日固定为每月5日（需手动设置）
  '建设银行': 0, // 需要手动设置
  '建行': 0,
  // 中国银行：出账日后20天
  '中国银行': 20,
  '中行': 20,
  // 农业银行：出账日后17天
  '农业银行': 17,
  '农行': 17,
  // 招商银行：出账日后18天
  '招商银行': 18,
  '招行': 18,
  // 交通银行：出账日后24天
  '交通银行': 24,
  '交行': 24,
  // 兴业银行：出账日后18天
  '兴业银行': 18,
  // 中信银行：出账日后18天
  '中信银行': 18,
  '中信': 18,
  // 民生银行：出账日后19天
  '民生银行': 19,
  '民生': 19,
  // 浦发银行：出账日后18天
  '浦发银行': 18,
  '浦发': 18,
  // 广发银行：出账日后18天
  '广发银行': 18,
  '广发': 18,
  // 平安银行：出账日后18天
  '平安银行': 18,
  '平安': 18,
  // 光大银行：出账日后19天
  '光大银行': 19,
  '光大': 19,
  // 华夏银行：出账日后18天
  '华夏银行': 18,
  '华夏': 18,
  // 花呗：出账日后8-9天（每月8/9日）
  '花呗': 8,
  // 白条：出账日后10天
  '白条': 10,
  // 抖音月付：出账日后15天
  '抖音月付': 15,
  // 默认：出账日后15天
  '默认': 15,
};

// 根据出账日计算还款日
function calculatePaymentDueDate(billingDate: number, bankName?: string): number | null {
  if (!billingDate) return null;
  
  // 如果有银行名称，查找规则
  if (bankName) {
    let daysAfter = BANK_REPAYMENT_RULES['默认'];
    for (const [bank, days] of Object.entries(BANK_REPAYMENT_RULES)) {
      if (bankName.includes(bank) && days !== 0) {
        daysAfter = days;
        break;
      }
    }
    
    // 计算还款日
    if (daysAfter === 0) {
      return null; // 需要手动设置
    }
    let dueDate = billingDate + daysAfter;
    if (dueDate > 31) dueDate -= 31; // 跨月
    return dueDate;
  }
  
  // 默认：出账日后15天
  let dueDate = billingDate + 15;
  if (dueDate > 31) dueDate -= 31;
  return dueDate;
}

// 贷款专用智能添加对话框（只添加信用卡/花呗等信用账户）
function LoanNaturalAddDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [parsedItems, setParsedItems] = useState<any[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const naturalAddMutation = useNaturalAdd();
  const naturalCreateMutation = useNaturalCreate();

  // 解析文本（只过滤贷款相关内容）
  const handleParse = async () => {
    if (!input.trim() || naturalAddMutation.isPending) return;

    try {
      const result = await naturalAddMutation.mutateAsync(input);

      if (!result.items || result.items.length === 0) {
        toast.error('无法识别输入内容，请尝试更详细的描述');
        return;
      }

      // 只过滤 loan 模块且为信用账户类型的记录
      const loanItems = result.items
        .filter((item: any) => {
          if (item.module !== 'loan') return false;
          const loanType = item.parsed?.loanType || item.parsed?.type;
          return CREDIT_LOAN_TYPES.includes(loanType);
        })
        .map((item: any, index: number) => ({
          id: `${Date.now()}-${index}`,
          module: 'loan',
          name: item.parsed?.name || item.rawText,
          loanType: item.parsed?.loanType || item.parsed?.type || 'CREDIT_CARD',
          principal: item.parsed?.principal || item.parsed?.creditLimit,
          remainingPrincipal: item.parsed?.remainingPrincipal || item.parsed?.amount,
          annualRate: item.parsed?.annualRate || 0,
          billingDate: item.parsed?.billingDate,
          paymentDueDate: item.parsed?.paymentDueDate,
          confidence: item.confidence,
          rawText: item.rawText,
          selected: true,
        }));

      if (loanItems.length === 0) {
        toast.error('未识别到信用卡/花呗等信用账户，请尝试描述如"花呗额度5000"或"信用卡额度20000"');
        return;
      }

      setParsedItems([...loanItems, ...parsedItems]);
      setInput('');
      toast.success(`成功识别 ${loanItems.length} 条信用账户`);
    } catch (err: any) {
      toast.error(err.message || '解析失败，请重试');
    }
  };

  const updateItem = (id: string, updates: Partial<any>) => {
    setParsedItems(items =>
      items.map(item => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const deleteItem = (id: string) => {
    setParsedItems(items => items.filter(item => item.id !== id));
  };

  const handleCreate = async () => {
    const selectedItems = parsedItems.filter(item => item.selected);
    if (selectedItems.length === 0) {
      toast.error('请至少选择一条记录');
      return;
    }

    let successCount = 0;
    try {
      for (const item of selectedItems) {
        await naturalCreateMutation.mutateAsync({
          module: 'loan',
          data: {
            name: item.name,
            loanType: item.loanType,
            principal: item.principal || 0,
            remainingPrincipal: item.remainingPrincipal || item.principal || 0,
            annualRate: item.annualRate || 0,
            billingDate: item.billingDate,
            paymentDueDate: item.paymentDueDate,
            status: 'PENDING',
          },
        });
        successCount++;
      }

      toast.success(`成功创建 ${successCount} 条信用账户`);
      handleClose();
    } catch (err: any) {
      toast.error(err.message || `创建失败（成功 ${successCount} 条）`);
    }
  };

  const toggleSelectAll = () => {
    const allSelected = parsedItems.every(item => item.selected);
    setParsedItems(items =>
      items.map(item => ({ ...item, selected: !allSelected }))
    );
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setInput('');
      setParsedItems([]);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && (
        <DialogTrigger asChild onClick={() => setOpen(true)}>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            智能添加信用账户
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>输入信用账户描述（支持多条，以换行分隔）</Label>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`例如：\n花呗额度5000元\n信用卡额度20000元\n白条额度3000元\n抖音月付额度1000`}
              className="min-h-[100px] resize-none"
              disabled={naturalAddMutation.isPending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleParse();
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              按 Ctrl+Enter 快速解析 · 只识别信用卡/花呗/白条/抖音月付
            </p>
          </div>

          <Button
            onClick={handleParse}
            disabled={!input.trim() || naturalAddMutation.isPending}
            className="w-full"
          >
            {naturalAddMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                解析中...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                智能解析
              </>
            )}
          </Button>

          {parsedItems.length > 0 && (
            <div className="border rounded-lg p-4 space-y-3 max-h-[400px] overflow-y-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">解析结果</span>
                  <Badge variant="secondary">{parsedItems.length} 条</Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                    {parsedItems.every(item => item.selected) ? '取消全选' : '全选'}
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleCreate}
                    disabled={naturalCreateMutation.isPending || !parsedItems.some(item => item.selected)}
                  >
                    {naturalCreateMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        创建中...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        创建 ({parsedItems.filter(item => item.selected).length})
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <Stagger className="space-y-2">
                {parsedItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border ${item.selected ? 'border-primary bg-primary/5' : 'border-muted'}`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => updateItem(item.id, { selected: !item.selected })}
                        className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          item.selected
                            ? 'bg-primary border-primary'
                            : 'border-muted-foreground hover:border-primary'
                        }`}
                      >
                        {item.selected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </button>

                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">信用账户</Badge>
                            <Badge variant={item.confidence >= 0.8 ? 'default' : 'secondary'} style={{ fontSize: '11px' }}>
                              置信度: {Math.round(item.confidence * 100)}%
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() => deleteItem(item.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="flex flex-wrap gap-3 text-sm">
                          <span className="font-medium">{item.name || loanTypeLabels[item.loanType as LoanType]?.label || '未命名'}</span>
                          {item.principal !== undefined && (
                            <span className="font-medium">额度 ¥{item.principal.toFixed(2)}</span>
                          )}
                          {item.loanType && (
                            <Badge variant="secondary">{loanTypeLabels[item.loanType as LoanType]?.label || item.loanType}</Badge>
                          )}
                        </div>

                        {/* 可编辑字段 */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">额度</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.principal || ''}
                              onChange={(e) => updateItem(item.id, { principal: parseFloat(e.target.value) || 0 })}
                              className="h-8"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">年利率(%)</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.annualRate || ''}
                              onChange={(e) => updateItem(item.id, { annualRate: parseFloat(e.target.value) || 0 })}
                              placeholder="如 18"
                              className="h-8"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </Stagger>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatMoney(amount: number) {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  const [startDate, setStartDate] = useState(loan?.startDate ? (loan.startDate.split('T')[0] || '') : '');
  const [endDate, setEndDate] = useState(loan?.endDate ? (loan.endDate.split('T')[0] || '') : '');
  const [paymentDay, setPaymentDay] = useState(loan?.paymentDay?.toString() || '');
  const [linkedAccountId, setLinkedAccountId] = useState(loan?.linkedAccountId || '');
  const [direction, setDirection] = useState<LoanDirection | ''>(loan?.direction || '');
  const [counterparty, setCounterparty] = useState(loan?.counterparty || '');
  const [loanDate, setLoanDate] = useState(loan?.loanDate ? (loan.loanDate.split('T')[0] || '') : '');
  const [dueDate, setDueDate] = useState(loan?.dueDate ? (loan.dueDate.split('T')[0] || '') : '');
  const [status, setStatus] = useState<LoanStatus>(loan?.status || 'PENDING');
  const [remark, setRemark] = useState(loan?.remark || '');
  
  // 信用卡特有字段
  const [creditLimit, setCreditLimit] = useState(loan?.creditLimit?.toString() || '');
  const [billingDate, setBillingDate] = useState(loan?.billingDate?.toString() || '');
  const [paymentDueDate, setPaymentDueDate] = useState(loan?.paymentDueDate?.toString() || '');
  const [unpostedBalance, setUnpostedBalance] = useState(loan?.unpostedBalance?.toString() || '');
  const [installmentInfo, setInstallmentInfo] = useState(loan?.installmentInfo || '');

  // 分期明细：每期不同金额（花呗/白条等专用）
  // 格式: [{month: "4月", amount: 1355.29, dueDate: "4月20日"}, ...]
  type InstallmentItem = { month: string; amount: string; dueDate: string };
  const parseInstallments = (): InstallmentItem[] => {
    if (!loan?.installmentInfo) return [];
    try {
      const parsed = JSON.parse(loan.installmentInfo);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return [];
  };
  const [installmentItems, setInstallmentItems] = useState<InstallmentItem[]>(parseInstallments());
  const [showInstallmentEditor, setShowInstallmentEditor] = useState(installmentItems.length > 0);

  const addInstallmentItem = () => {
    setInstallmentItems(prev => [...prev, { month: '', amount: '', dueDate: '' }]);
  };

  const updateInstallmentItem = (idx: number, field: keyof InstallmentItem, value: string) => {
    setInstallmentItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const removeInstallmentItem = (idx: number) => {
    setInstallmentItems(prev => prev.filter((_, i) => i !== idx));
  };

  const isPersonalLoan = loanType === 'PERSONAL_LOAN';
  const isCreditLoan = CREDIT_LOAN_TYPES.includes(loanType);

  // 当出账日变化时，自动计算还款日
  const handleBillingDateChange = (value: string) => {
    setBillingDate(value);
    // 如果还款日为空，根据出账日自动计算
    if (!paymentDueDate && value) {
      const calculatedDueDate = calculatePaymentDueDate(parseInt(value), name);
      if (calculatedDueDate) {
        setPaymentDueDate(calculatedDueDate.toString());
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      loanType,
      principal: parseFloat(principal) || 0,
      remainingPrincipal: parseFloat(remainingPrincipal) || parseFloat(principal) || 0,
      annualRate: (parseFloat(annualRate) || 0) / 100,
      startDate,
      endDate: endDate || null,
      paymentDay: paymentDay ? parseInt(paymentDay) : undefined,
      linkedAccountId: linkedAccountId || undefined,
      direction: direction || undefined,
      counterparty: counterparty || undefined,
      loanDate: loanDate || undefined,
      dueDate: dueDate || undefined,
      status: status || 'PENDING',
      remark: remark || undefined,
      // 信用卡特有字段
      creditLimit: isCreditLoan ? (parseFloat(creditLimit) || 0) : undefined,
      billingDate: isCreditLoan ? (billingDate ? parseInt(billingDate) : undefined) : undefined,
      paymentDueDate: isCreditLoan ? (paymentDueDate ? parseInt(paymentDueDate) : undefined) : undefined,
      unpostedBalance: isCreditLoan ? (parseFloat(unpostedBalance) || 0) : undefined,
      // 分期信息：优先使用结构化的分期明细
      installmentInfo: isCreditLoan ? (
        installmentItems.length > 0
          ? JSON.stringify(installmentItems.filter(it => it.month || it.amount))
          : (installmentInfo || undefined)
      ) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>名称</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={isCreditLoan ? "如：招行信用卡" : "如：房贷"} required />
        </div>
        <div className="space-y-2">
          <Label>类型</Label>
          <Select value={loanType} onValueChange={(v) => setLoanType(v as LoanType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(loanTypeLabels).map(([value, { label }]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 信用卡特有字段 */}
      {isCreditLoan && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>信用额度</Label>
              <Input type="number" step="0.01" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} placeholder="如 20000" />
            </div>
            <div className="space-y-2">
              <Label>待还金额</Label>
              <Input type="number" step="0.01" value={remainingPrincipal} onChange={(e) => setRemainingPrincipal(e.target.value)} placeholder="当前应还" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>出账日（每月）</Label>
              <Input type="number" min="1" max="31" value={billingDate} onChange={(e) => handleBillingDateChange(e.target.value)} placeholder="如 5" />
              <p className="text-xs text-muted-foreground">输入出账日后，还款日将自动计算</p>
            </div>
            <div className="space-y-2">
              <Label>还款日（每月）</Label>
              <Input type="number" min="1" max="31" value={paymentDueDate} onChange={(e) => setPaymentDueDate(e.target.value)} placeholder="如 23" />
              {billingDate && !paymentDueDate && (
                <p className="text-xs text-muted-foreground">
                  自动计算：每月{calculatePaymentDueDate(parseInt(billingDate), name) || '需手动设置'}日
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>未出账金额</Label>
              <Input type="number" step="0.01" value={unpostedBalance} onChange={(e) => setUnpostedBalance(e.target.value)} placeholder="已消费未出账" />
            </div>
          </div>
          {/* 分期还款明细（花呗/白条等每期金额可能不同） */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>分期还款明细</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowInstallmentEditor(v => !v)}
              >
                {showInstallmentEditor ? '收起' : '展开'}
              </Button>
            </div>
            {showInstallmentEditor && (
              <div className="space-y-2 border rounded-md p-3 bg-muted/30">
                <p className="text-xs text-muted-foreground">支持每期不同金额（如花呗 4 月含其他消费、后续各期固定）</p>
                {installmentItems.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input
                      value={item.month}
                      onChange={(e) => updateInstallmentItem(idx, 'month', e.target.value)}
                      placeholder="月份，如：4月"
                      className="h-8 w-24"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={item.amount}
                      onChange={(e) => updateInstallmentItem(idx, 'amount', e.target.value)}
                      placeholder="待还金额"
                      className="h-8 flex-1"
                    />
                    <Input
                      value={item.dueDate}
                      onChange={(e) => updateInstallmentItem(idx, 'dueDate', e.target.value)}
                      placeholder="还款日，如：4月20日"
                      className="h-8 w-32"
                    />
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeInstallmentItem(idx)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addInstallmentItem} className="w-full">
                  <Plus className="h-3 w-3 mr-1" />
                  添加一期
                </Button>
              </div>
            )}
            {!showInstallmentEditor && (
              <div className="space-y-1">
                <Input
                  value={installmentInfo}
                  onChange={(e) => setInstallmentInfo(e.target.value)}
                  placeholder="如：12期/已还6期（简单备注）"
                />
                <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => setShowInstallmentEditor(true)}>
                  切换为每期明细输入
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {isPersonalLoan && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>借款方向</Label>
            <Select value={direction} onValueChange={(v) => setDirection(v as LoanDirection)}>
              <SelectTrigger><SelectValue placeholder="选择方向" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="OUTGOING">我借别人的（应付）</SelectItem>
                <SelectItem value="INCOMING">别人借我的（应收）</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>对方姓名</Label>
            <Input value={counterparty} onChange={(e) => setCounterparty(e.target.value)} placeholder="对方姓名" />
          </div>
        </div>
      )}

      {!isCreditLoan && !isPersonalLoan && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>金额</Label>
              <Input type="number" step="0.01" value={principal} onChange={(e) => setPrincipal(e.target.value)} placeholder="0.00" required />
            </div>
            <div className="space-y-2">
              <Label>剩余本金</Label>
              <Input type="number" step="0.01" value={remainingPrincipal} onChange={(e) => setRemainingPrincipal(e.target.value)} placeholder="默认等于金额" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>年化利率(%)</Label>
              <Input type="number" step="0.01" value={annualRate} onChange={(e) => setAnnualRate(e.target.value)} placeholder="如 3.95" />
            </div>
            <div className="space-y-2">
              <Label>每月还款日</Label>
              <Input type="number" min="1" max="31" value={paymentDay} onChange={(e) => setPaymentDay(e.target.value)} placeholder="1-31" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>开始日期</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>结束日期</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </>
      )}

      {isPersonalLoan && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>金额</Label>
            <Input type="number" step="0.01" value={principal} onChange={(e) => setPrincipal(e.target.value)} placeholder="0.00" required />
          </div>
          <div className="space-y-2">
            <Label>年化利率(%)</Label>
            <Input type="number" step="0.01" value={annualRate} onChange={(e) => setAnnualRate(e.target.value)} placeholder="如 3.95" />
          </div>
        </div>
      )}

      {isPersonalLoan && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{isPersonalLoan ? '借款日期' : '开始日期'}</Label>
            <Input type="date" value={isPersonalLoan ? loanDate : startDate}
              onChange={(e) => { isPersonalLoan ? setLoanDate(e.target.value) : setStartDate(e.target.value); }} />
          </div>
          <div className="space-y-2">
            <Label>应还日期</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
      )}

      {isPersonalLoan && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>状态</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as LoanStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">待还</SelectItem>
                <SelectItem value="OVERDUE">逾期</SelectItem>
                <SelectItem value="SETTLED">已结清</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>备注</Label>
            <Input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="备注信息" />
          </div>
        </div>
      )}

      {!isPersonalLoan && !isCreditLoan && (
        <div className="space-y-2">
          <Label>关联还款账户</Label>
          <Select value={linkedAccountId} onValueChange={setLinkedAccountId}>
            <SelectTrigger><SelectValue placeholder="选择还款账户" /></SelectTrigger>
            <SelectContent>
              {accounts?.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

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
        <Button variant="ghost" size="sm"><Calendar className="h-4 w-4 mr-1" />还款计划</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{loanName} - 还款计划</DialogTitle></DialogHeader>
        {isLoading ? <Skeleton className="h-64" /> : data ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div><p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>总利息</p><p className="font-bold text-destructive">{formatMoney(data.totalInterest)}</p></div>
              <div><p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>总还款</p><p className="font-bold">{formatMoney(data.totalPayment)}</p></div>
              <div><p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>期数</p><p className="font-bold">{data.schedule.length}期</p></div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full" style={{ fontSize: 'var(--font-size-small)' }}>
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">期数</th><th className="text-right p-2">月供</th><th className="text-right p-2">本金</th><th className="text-right p-2">利息</th><th className="text-right p-2">剩余本金</th>
                  </tr>
                </thead>
                <tbody>
                  {data.schedule.slice(0, 24).map((item) => (
                    <tr key={item.month} className="border-b">
                      <td className="p-2">{item.month}</td><td className="text-right p-2">{formatMoney(item.payment)}</td><td className="text-right p-2">{formatMoney(item.principal)}</td><td className="text-right p-2 text-destructive">{formatMoney(item.interest)}</td><td className="text-right p-2">{formatMoney(item.remaining)}</td>
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
    const res = await prepaySimulate.mutateAsync({ id: loanId, prepayAmount: parseFloat(prepayAmount) || 0, mode });
    setResult(res);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm"><Calculator className="h-4 w-4 mr-1" />提前还款</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{loanName} - 提前还款模拟</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>提前还款金额</Label>
            <Input type="number" step="0.01" value={prepayAmount} onChange={(e) => setPrepayAmount(e.target.value)} placeholder={`最大 ${formatMoney(remainingPrincipal)}`} />
          </div>
          <div className="space-y-2">
            <Label>还款方式</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="shorten_term">缩短年限，月供不变</SelectItem>
                <SelectItem value="reduce_payment">减少月供，期限不变</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleSimulate} className="w-full">计算</Button>
          {result && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <div className="flex justify-between"><span className="text-muted-foreground">节省利息</span><span className="font-bold text-success">{formatMoney(result.afterPrepay.totalInterestSaved)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">新月供</span><span className="font-bold">{formatMoney(result.afterPrepay.newMonthlyPayment)}</span></div>
              {result.afterPrepay.monthsSaved && <div className="flex justify-between"><span className="text-muted-foreground">缩短期数</span><span className="font-bold">{result.afterPrepay.monthsSaved}期</span></div>}
              {result.afterPrepay.paymentReduction && <div className="flex justify-between"><span className="text-muted-foreground">月供减少</span><span className="font-bold">{formatMoney(result.afterPrepay.paymentReduction)}</span></div>}
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
  const [activeTab, setActiveTab] = useState<'all' | 'credit' | 'traditional' | 'loans'>('all');

  // 分离各类贷款
  const creditLoans = loans?.filter(l => loanTypeLabels[l.loanType]?.category === 'credit') || [];
  const traditionalLoans = loans?.filter(l => loanTypeLabels[l.loanType]?.category === 'traditional' && l.loanType !== 'PERSONAL_LOAN') || [];
  const personalLoans = loans?.filter(l => l.loanType === 'PERSONAL_LOAN') || [];
  const incomingLoans = personalLoans.filter(l => l.direction === 'INCOMING');
  const outgoingLoans = personalLoans.filter(l => l.direction === 'OUTGOING');

  const handleSubmit = (data: any) => {
    if (editingLoan) {
      updateMutation.mutate({ id: editingLoan.id, ...data }, { onSuccess: () => { setDialogOpen(false); setEditingLoan(null); } });
    } else {
      createMutation.mutate(data, { onSuccess: () => { setDialogOpen(false); } });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这条记录吗？')) deleteMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-64" /></div>
      </MainLayout>
    );
  }

  const showCredit = activeTab === 'all' || activeTab === 'credit';
  const showTraditional = activeTab === 'all' || activeTab === 'traditional';
  const showLoans = activeTab === 'all' || activeTab === 'loans';

  const statusLabel: Record<string, string> = { PENDING: '待还', OVERDUE: '逾期', SETTLED: '已结清' };

  return (
    <MainLayout>
      <div style={{ gap: 'var(--spacing-xl)' }} className="flex flex-col">
        <FadeIn className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-bold" style={{ fontSize: 'var(--font-size-headline)' }}>贷款管理</h1>
            <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-body)', marginTop: 'var(--spacing-xs)' }}>信用账户 · 传统贷款 · 借款管理</p>
          </div>
          <div className="flex gap-2">
            <LoanNaturalAddDialog
              trigger={
                <Button variant="outline">
                  <Sparkles className="h-4 w-4 mr-2" />
                  智能添加
                </Button>
              }
            />
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingLoan(null)}><Plus className="h-4 w-4 mr-2" />新增</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>{editingLoan ? '编辑' : '新增贷款'}</DialogTitle></DialogHeader>
                <LoanForm loan={editingLoan} onSubmit={handleSubmit} onCancel={() => { setDialogOpen(false); setEditingLoan(null); }} />
              </DialogContent>
            </Dialog>
          </div>
        </FadeIn>

        <FadeIn>
          <div className="flex gap-2 flex-wrap">
            {[{ key: 'all', label: '全部' }, { key: 'credit', label: '信用账户' }, { key: 'traditional', label: '传统贷款' }, { key: 'loans', label: '借款管理' }].map(tab => (
              <Button key={tab.key} variant={activeTab === tab.key ? 'default' : 'outline'} size="sm" onClick={() => setActiveTab(tab.key as any)}>{tab.label}</Button>
            ))}
          </div>
        </FadeIn>

        {/* 借款管理 */}
        {showLoans && (incomingLoans.length > 0 || outgoingLoans.length > 0) && (
          <div>
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Users className="h-5 w-5" />借款管理</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-success mb-3 flex items-center gap-1"><ArrowUpCircle className="h-4 w-4" /> 借出（别人欠我）</h3>
                <Stagger className="space-y-3">
                  {incomingLoans.map((loan) => (
                    <FadeIn key={loan.id}>
                      <Card className="border-green-200">
                        <CardContent style={{ padding: 'var(--spacing-md)' }}>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold">{loan.name}</h4>
                                {loan.status && <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[loan.status]}`}>{statusLabel[loan.status]}</span>}
                              </div>
                              {loan.counterparty && <p className="text-sm text-muted-foreground">对方：{loan.counterparty}</p>}
                              {loan.loanDate && <p className="text-sm text-muted-foreground">借款日期：{loan.loanDate}</p>}
                              {loan.dueDate && <p className="text-sm text-warning">应还日期：{loan.dueDate}</p>}
                              {loan.remark && <p className="text-sm text-muted-foreground mt-1">{loan.remark}</p>}
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-success">{formatMoney(loan.remainingPrincipal)}</p>
                              <div className="flex gap-1 mt-2">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingLoan(loan); setDialogOpen(true); }}><Edit className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(loan.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </FadeIn>
                  ))}
                </Stagger>
              </div>
              <div>
                <h3 className="text-sm font-medium text-destructive mb-3 flex items-center gap-1"><ArrowDownCircle className="h-4 w-4" /> 借入（我欠别人）</h3>
                <Stagger className="space-y-3">
                  {outgoingLoans.map((loan) => (
                    <FadeIn key={loan.id}>
                      <Card className="border-red-200">
                        <CardContent style={{ padding: 'var(--spacing-md)' }}>
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold">{loan.name}</h4>
                                {loan.status && <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[loan.status]}`}>{statusLabel[loan.status]}</span>}
                              </div>
                              {loan.counterparty && <p className="text-sm text-muted-foreground">对方：{loan.counterparty}</p>}
                              {loan.loanDate && <p className="text-sm text-muted-foreground">借款日期：{loan.loanDate}</p>}
                              {loan.dueDate && <p className="text-sm text-warning">应还日期：{loan.dueDate}</p>}
                              {loan.remark && <p className="text-sm text-muted-foreground mt-1">{loan.remark}</p>}
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-destructive">{formatMoney(loan.remainingPrincipal)}</p>
                              <div className="flex gap-1 mt-2">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingLoan(loan); setDialogOpen(true); }}><Edit className="h-3.5 w-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(loan.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </FadeIn>
                  ))}
                </Stagger>
              </div>
            </div>
          </div>
        )}

        {/* 信用账户 */}
        {showCredit && creditLoans.length > 0 && (
          <div>
            <h2 className="font-semibold mb-3 flex items-center gap-2"><CreditCard className="h-5 w-5" />信用账户</h2>
            <Stagger className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {creditLoans.map((loan) => {
                const typeConfig = loanTypeLabels[loan.loanType];
                const Icon = typeConfig?.icon || CreditCard;
                return (
                  <FadeIn key={loan.id}>
                    <Card className="border-destructive/20">
                      <CardContent style={{ padding: 'var(--spacing-lg)' }}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center"><Icon className="h-6 w-6 text-destructive" /></div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold" style={{ fontSize: 'var(--font-size-label)' }}>{loan.name}</h3>
                                <Badge variant="secondary">{typeConfig?.label}</Badge>
                              </div>
                              <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>已用 {formatMoney(loan.remainingPrincipal)}</p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingLoan(loan); setDialogOpen(true); }}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(loan.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
                          {loan.creditLimit && (
                            <><div><p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>信用额度</p><p className="font-semibold">{formatMoney(loan.creditLimit)}</p></div>
                            <div><p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>可用额度</p><p className={`font-semibold ${(loan.availableCredit ?? 0) < (loan.creditLimit ?? 0) * 0.2 ? 'text-destructive' : 'text-success'}`}>{formatMoney(loan.availableCredit ?? (loan.creditLimit - loan.remainingPrincipal))}</p></div></>
                          )}
                          <div>
                            <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>使用率</p>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-destructive" style={{ width: `${loan.creditLimit ? Math.min(100, (loan.remainingPrincipal / loan.creditLimit) * 100) : 0}%` }} /></div>
                              <span style={{ fontSize: 'var(--font-size-small)' }}>{loan.creditLimit ? ((loan.remainingPrincipal / loan.creditLimit) * 100).toFixed(1) : 0}%</span>
                            </div>
                          </div>
                          {loan.billingDate && <div><p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>出账日</p><p className="font-semibold">每月{loan.billingDate}号</p></div>}
                          {loan.paymentDueDate && <div><p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>还款日</p><p className="font-semibold">每月{loan.paymentDueDate}号</p></div>}
                          {loan.unpostedBalance && loan.unpostedBalance > 0 && <div><p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>未出账</p><p className="font-semibold text-warning">{formatMoney(loan.unpostedBalance)}</p></div>}
                        </div>
                        {/* 分期明细展示 */}
                        {loan.installmentInfo && (() => {
                          try {
                            const items = JSON.parse(loan.installmentInfo);
                            if (Array.isArray(items) && items.length > 0) {
                              return (
                                <div className="mt-3 pt-3 border-t">
                                  <p className="text-xs text-muted-foreground mb-2">分期还款明细</p>
                                  <div className="grid grid-cols-2 gap-1">
                                    {items.map((it: any, idx: number) => (
                                      <div key={idx} className="flex items-center justify-between text-xs bg-muted/40 rounded px-2 py-1">
                                        <span className="text-muted-foreground">{it.month}</span>
                                        <span className="font-medium text-destructive">{it.amount ? `¥${parseFloat(it.amount).toFixed(2)}` : '-'}</span>
                                        {it.dueDate && <span className="text-muted-foreground text-[10px]">{it.dueDate}</span>}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            }
                          } catch {}
                          // 纯文本分期信息
                          return <p className="mt-2 text-xs text-muted-foreground">{loan.installmentInfo}</p>;
                        })()}
                        </div>
                      </CardContent>
                    </Card>
                  </FadeIn>
                );
              })}
            </Stagger>
          </div>
        )}

        {/* 传统贷款 */}
        {showTraditional && traditionalLoans.length > 0 && (
          <div>
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Home className="h-5 w-5" />传统贷款</h2>
            <Stagger className="space-y-4">
              {traditionalLoans.map((loan) => {
                const typeConfig = loanTypeLabels[loan.loanType];
                const Icon = typeConfig?.icon || CreditCard;
                return (
                  <FadeIn key={loan.id}>
                    <Card>
                      <CardContent style={{ padding: 'var(--spacing-lg)' }}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center"><Icon className="h-6 w-6 text-destructive" /></div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold" style={{ fontSize: 'var(--font-size-label)' }}>{loan.name}</h3>
                                <Badge variant="secondary">{typeConfig?.label}</Badge>
                              </div>
                              <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>剩余 {formatMoney(loan.remainingPrincipal)}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {loan.endDate && <><PaymentScheduleDialog loanId={loan.id} loanName={loan.name} /><PrepaySimulateDialog loanId={loan.id} loanName={loan.name} remainingPrincipal={loan.remainingPrincipal} /></>}
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingLoan(loan); setDialogOpen(true); }}><Edit className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(loan.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                          <div><p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>月供</p><p className="font-semibold">{loan.monthlyPayment ? formatMoney(loan.monthlyPayment) : '-'}</p></div>
                          <div><p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>年利率</p><p className="font-semibold">{(loan.annualRate * 100).toFixed(2)}%</p></div>
                          <div>
                            <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>还款进度</p>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary" style={{ width: `${loan.progress}%` }} /></div>
                              <span style={{ fontSize: 'var(--font-size-small)' }}>{loan.progress.toFixed(1)}%</span>
                            </div>
                          </div>
                          <div><p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>还款日</p><p className="font-semibold">{loan.paymentDay ? `每月${loan.paymentDay}号` : '-'}</p></div>
                        </div>
                      </CardContent>
                    </Card>
                  </FadeIn>
                );
              })}
            </Stagger>
          </div>
        )}

        {loans?.length === 0 && (
          <FadeIn>
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Home className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">暂无贷款记录，点击上方按钮添加</p>
              </CardContent>
            </Card>
          </FadeIn>
        )}
      </div>
    </MainLayout>
  );
}
