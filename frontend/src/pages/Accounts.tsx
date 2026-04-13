import { useState, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { FadeIn, Stagger } from '@/components/MotionPrimitives';
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount } from '@/hooks/use-accounts';
import { useNaturalAdd, useNaturalCreate, useAccountOptions } from '@/hooks/use-natural-add';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Wallet,
  Plus,
  Edit,
  Trash2,
  CreditCard,
  Banknote,
  Smartphone,
  BanknoteIcon,
  AlertCircle,
  Sparkles,
  Loader2,
  Check,
  Trash,
  ArrowUpDown,
  Calendar,
  X,
} from 'lucide-react';
import type { Account, AccountType } from '@/types';
import { toast } from 'sonner';

// 信用账户类型
const CREDIT_ACCOUNT_TYPES: AccountType[] = ['CREDIT_CARD', 'HUABEI', 'BAITIAO', 'DOUYIN_PAY'];

// 需要卡号的账户类型
const CARD_ACCOUNT_TYPES: AccountType[] = ['BANK', 'CREDIT_CARD'];

// 支付宝/微信账户类型
const THIRD_PARTY_ACCOUNT_TYPES: AccountType[] = ['ALIPAY', 'WECHAT'];

const accountTypeLabels: Record<AccountType, string> = {
  ALIPAY: '支付宝',
  WECHAT: '微信',
  BANK: '银行卡',
  CREDIT_CARD: '信用卡',
  CASH: '现金',
  HUABEI: '花呗',
  BAITIAO: '白条',
  DOUYIN_PAY: '抖音月付',
  OTHER: '其他',
};

const accountTypeIcons: Record<AccountType, React.ElementType> = {
  ALIPAY: Smartphone,
  WECHAT: Smartphone,
  BANK: Banknote,
  CREDIT_CARD: CreditCard,
  CASH: BanknoteIcon,
  HUABEI: CreditCard,
  BAITIAO: CreditCard,
  DOUYIN_PAY: CreditCard,
  OTHER: Wallet,
};

function formatMoney(amount: number) {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// 判断是否为信用账户
function isCreditAccount(type: AccountType): boolean {
  return CREDIT_ACCOUNT_TYPES.includes(type);
}

// 判断是否需要卡号
function needsCardNumber(type: AccountType): boolean {
  return CARD_ACCOUNT_TYPES.includes(type);
}

// 判断是否为第三方支付账户（支付宝/微信）
function isThirdPartyAccount(type: AccountType): boolean {
  return THIRD_PARTY_ACCOUNT_TYPES.includes(type);
}

// 账户表单组件
function AccountForm({
  account,
  onSubmit,
  onCancel,
}: {
  account?: Account | null;
  onSubmit: (data: Partial<Account>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(account?.name || '');
  const [type, setType] = useState<AccountType>(account?.type || 'OTHER');
  const [balance, setBalance] = useState(account?.balance?.toString() || '0');
  const [remark, setRemark] = useState(account?.remark || '');
  // 信用账户扩展字段
  const [creditLimit, setCreditLimit] = useState(account?.creditLimit?.toString() || '');
  const [availableCredit, setAvailableCredit] = useState(account?.availableCredit?.toString() || '');
  const [billingDate, setBillingDate] = useState(account?.billingDate?.toString() || '');
  const [paymentDueDate, setPaymentDueDate] = useState(account?.paymentDueDate?.toString() || '');
  const [unpostedBalance, setUnpostedBalance] = useState(account?.unpostedBalance?.toString() || '0');
  const [cardNumber, setCardNumber] = useState(account?.cardNumber || '');
  // 第三方账号字段（支付宝/微信）
  const [thirdPartyAccount, setThirdPartyAccount] = useState(account?.thirdPartyAccount || '');
  const [thirdPartyNickname, setThirdPartyNickname] = useState(account?.thirdPartyNickname || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      type,
      balance: parseFloat(balance) || 0,
      remark,
      cardNumber: needsCardNumber(type) ? cardNumber : undefined,
      creditLimit: creditLimit ? parseFloat(creditLimit) : undefined,
      availableCredit: availableCredit ? parseFloat(availableCredit) : undefined,
      billingDate: billingDate ? parseInt(billingDate) : undefined,
      paymentDueDate: paymentDueDate ? parseInt(paymentDueDate) : undefined,
      unpostedBalance: unpostedBalance ? parseFloat(unpostedBalance) : 0,
      thirdPartyAccount: isThirdPartyAccount(type) ? thirdPartyAccount : undefined,
      thirdPartyNickname: isThirdPartyAccount(type) ? thirdPartyNickname : undefined,
    });
  };

  const showCreditFields = isCreditAccount(type);
  const showThirdPartyFields = isThirdPartyAccount(type);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">账户名称</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="请输入账户名称"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">账户类型</Label>
          <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
            <SelectTrigger>
              <SelectValue placeholder="选择账户类型" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(accountTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 卡号字段（银行卡/信用卡专属） */}
      {needsCardNumber(type) && (
        <div className="space-y-2">
          <Label htmlFor="cardNumber">卡号</Label>
          <Input
            id="cardNumber"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
            placeholder="输入银行卡号或尾号（如 6235）"
          />
        </div>
      )}

      {/* 信用账户扩展字段 */}
      {showCreditFields && (
        <div className="p-4 bg-muted/50 rounded-lg space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CreditCard className="h-4 w-4" />
            信用账户设置
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="creditLimit">信用额度</Label>
              <Input
                id="creditLimit"
                type="number"
                step="0.01"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                placeholder="如 10000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="availableCredit">可用额度</Label>
              <Input
                id="availableCredit"
                type="number"
                step="0.01"
                value={availableCredit}
                onChange={(e) => setAvailableCredit(e.target.value)}
                placeholder="自动计算"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="billingDate">出账日（1-31）</Label>
              <Input
                id="billingDate"
                type="number"
                min="1"
                max="31"
                value={billingDate}
                onChange={(e) => setBillingDate(e.target.value)}
                placeholder="如 5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentDueDate">还款日（1-31）</Label>
              <Input
                id="paymentDueDate"
                type="number"
                min="1"
                max="31"
                value={paymentDueDate}
                onChange={(e) => setPaymentDueDate(e.target.value)}
                placeholder="如 15"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="unpostedBalance">未出账金额</Label>
            <Input
              id="unpostedBalance"
              type="number"
              step="0.01"
              value={unpostedBalance}
              onChange={(e) => setUnpostedBalance(e.target.value)}
              placeholder="已消费但未出账的金额"
            />
          </div>
        </div>
      )}

      {/* 支付宝/微信扩展字段 */}
      {showThirdPartyFields && (
        <div className="p-4 bg-muted/50 rounded-lg space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Smartphone className="h-4 w-4" />
            {type === 'ALIPAY' ? '支付宝' : '微信支付'} 账户设置
          </div>
          <div className="space-y-2">
            <Label htmlFor="thirdPartyAccount">
              {type === 'ALIPAY' ? '支付宝账号' : '微信OpenID'}
            </Label>
            <Input
              id="thirdPartyAccount"
              value={thirdPartyAccount}
              onChange={(e) => setThirdPartyAccount(e.target.value)}
              placeholder={type === 'ALIPAY' ? '手机号/邮箱/昵称' : '微信OpenID（用于关联导入）'}
            />
            <p className="text-xs text-muted-foreground">
              {type === 'ALIPAY'
                ? '用于在导入账单时匹配您的账户'
                : '可在微信「支付优惠」页面查看您的OpenID'}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="thirdPartyNickname">昵称/备注</Label>
            <Input
              id="thirdPartyNickname"
              value={thirdPartyNickname}
              onChange={(e) => setThirdPartyNickname(e.target.value)}
              placeholder="可选，用于在导入配置中识别此账户"
            />
          </div>
        </div>
      )}

      {/* 通用字段 */}
      <div className="space-y-2">
        <Label htmlFor="balance">
          {showCreditFields ? '已用额度（余额）' : '账户余额'}
        </Label>
        <Input
          id="balance"
          type="number"
          step="0.01"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          placeholder="0.00"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="remark">备注</Label>
        <Input
          id="remark"
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
          placeholder="可选备注"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">{account ? '更新' : '创建'}</Button>
      </div>
    </form>
  );
}

// 解析结果项类型
interface ParsedItem {
  id: string;
  module: 'account' | 'transaction' | 'fund' | 'loan';
  type: string;
  amount?: number;
  category?: string;
  description?: string;
  date?: string;
  accountId?: string;
  direction?: string;
  counterparty?: string;
  confidence: number;
  rawText: string;
  selected: boolean;
}

// 智能添加对话框组件
function NaturalAddDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const naturalAddMutation = useNaturalAdd();
  const naturalCreateMutation = useNaturalCreate();
  const accountOptions = useAccountOptions();

  // 解析文本
  const handleParse = async () => {
    if (!input.trim() || naturalAddMutation.isPending) return;

    try {
      const result = await naturalAddMutation.mutateAsync(input);

      if (result.module === '') {
        toast.error('无法识别输入内容，请尝试更详细的描述');
        return;
      }

      // 创建解析结果项
      const newItem: ParsedItem = {
        id: Date.now().toString(),
        module: result.module,
        type: result.parsed?.type || '',
        amount: result.parsed?.amount,
        category: result.parsed?.category,
        description: result.parsed?.description,
        date: result.parsed?.transactionDate || result.parsed?.date,
        accountId: result.parsed?.accountId || (result.accounts?.length > 0 ? result.accounts[0].id : ''),
        direction: result.parsed?.direction,
        counterparty: result.parsed?.counterparty,
        confidence: result.confidence,
        rawText: result.rawText,
        selected: true,
      };

      setParsedItems([newItem, ...parsedItems]);
      setInput('');
    } catch (err: any) {
      toast.error(err.message || '解析失败，请重试');
    }
  };

  // 更新解析项
  const updateItem = (id: string, updates: Partial<ParsedItem>) => {
    setParsedItems(items =>
      items.map(item => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  // 删除解析项
  const deleteItem = (id: string) => {
    setParsedItems(items => items.filter(item => item.id !== id));
  };

  // 批量创建
  const handleCreate = async () => {
    const selectedItems = parsedItems.filter(item => item.selected);
    if (selectedItems.length === 0) {
      toast.error('请至少选择一条记录');
      return;
    }

    let successCount = 0;
    try {
      for (const item of selectedItems) {
        const createData: any = {
          type: item.type,
          amount: item.amount,
          category: item.category,
          description: item.description,
          transactionDate: item.date,
          accountId: item.accountId,
          direction: item.direction,
          counterparty: item.counterparty,
        };

        await naturalCreateMutation.mutateAsync({
          module: item.module,
          data: createData,
        });
        successCount++;
      }

      toast.success(`成功创建 ${successCount} 条记录`);
      // 清空已创建的项
      setParsedItems(items => items.filter(item => !item.selected));
    } catch (err: any) {
      toast.error(err.message || `创建失败（成功 ${successCount} 条）`);
    }
  };

  // 全选/取消全选
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

  const moduleLabels: Record<string, string> = {
    account: '账户',
    transaction: '交易',
    fund: '投资',
    loan: '借款',
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
            智能添加
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 输入区域 */}
          <div className="space-y-2">
            <Label>输入财务操作描述（支持多条，以换行分隔）</Label>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`例如：\n今天在超市买了50元菜\n转了1000到招商银行\n买入500元基金`}
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
              按 Ctrl+Enter 快速解析
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

          {/* 解析结果列表 */}
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
                      {/* 选择框 */}
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

                      {/* 内容 */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{moduleLabels[item.module] || item.module}</Badge>
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

                        {/* 详细信息 */}
                        <div className="flex flex-wrap gap-3 text-sm">
                          {item.amount !== undefined && (
                            <span className="font-medium">¥{item.amount.toFixed(2)}</span>
                          )}
                          {item.type && (
                            <Badge variant={item.type === 'EXPENSE' ? 'destructive' : 'default'}>
                              {item.type === 'EXPENSE' ? '支出' : item.type === 'INCOME' ? '收入' : item.type}
                            </Badge>
                          )}
                          {item.category && <span className="text-muted-foreground">{item.category}</span>}
                          {item.date && (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="h-3 w-3" />{item.date}
                            </span>
                          )}
                        </div>

                        {item.description && (
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        )}

                        {/* 账户选择（仅交易需要） */}
                        {item.module === 'transaction' && (
                          <Select
                            value={item.accountId || ''}
                            onValueChange={(value) => updateItem(item.id, { accountId: value })}
                          >
                            <SelectTrigger className="w-[200px] h-8">
                              <SelectValue placeholder="选择账户" />
                            </SelectTrigger>
                            <SelectContent>
                              {accountOptions.map((acc: any) => (
                                <SelectItem key={acc.id} value={acc.id}>
                                  {acc.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
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

export default function Accounts() {
  const { data: accounts, isLoading } = useAccounts();
  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();
  const deleteMutation = useDeleteAccount();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const handleSubmit = (data: Partial<Account>) => {
    if (editingAccount) {
      updateMutation.mutate({ id: editingAccount.id, ...data }, {
        onSuccess: () => {
          setDialogOpen(false);
          setEditingAccount(null);
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
    if (confirm('确定要删除这个账户吗？')) {
      deleteMutation.mutate(id);
    }
  };

  // 计算信用账户使用率
  const getUsageRate = (account: Account) => {
    if (!isCreditAccount(account.type) || !account.creditLimit) return null;
    return Math.min(100, (Math.abs(account.balance) / account.creditLimit) * 100);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
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
              账户管理
            </h1>
            <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-body)', marginTop: 'var(--spacing-xs)' }}>
              管理您的各类账户资产和信用账户
            </p>
          </div>
          <div className="flex gap-2">
            <NaturalAddDialog
              trigger={
                <Button variant="outline">
                  <Sparkles className="h-4 w-4 mr-2" />
                  智能添加
                </Button>
              }
            />
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingAccount(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  新增账户
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingAccount ? '编辑账户' : '新增账户'}</DialogTitle>
                </DialogHeader>
                <AccountForm
                  account={editingAccount}
                  onSubmit={handleSubmit}
                  onCancel={() => {
                    setDialogOpen(false);
                    setEditingAccount(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </FadeIn>

        {/* 账户列表 */}
        <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts?.map((account) => {
            const Icon = accountTypeIcons[account.type];
            const usageRate = getUsageRate(account);
            return (
              <FadeIn key={account.id}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardContent style={{ padding: 'var(--spacing-lg)' }}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: account.color || 'var(--primary)' }}
                        >
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold" style={{ fontSize: 'var(--font-size-label)' }}>
                            {account.name}
                          </p>
                          <Badge variant="secondary" style={{ fontSize: 'var(--font-size-small)' }}>
                            {accountTypeLabels[account.type]}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingAccount(account);
                            setDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(account.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* 信用账户信息 */}
                    {isCreditAccount(account.type) ? (
                      <div className="mt-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                            已用额度
                          </span>
                          <span className="font-bold" style={{ fontSize: 'var(--font-size-label)' }}>
                            {formatMoney(Math.abs(account.balance))}
                          </span>
                        </div>
                        {account.creditLimit && (
                          <>
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                                信用额度
                              </span>
                              <span className="font-semibold">
                                {formatMoney(account.creditLimit)}
                              </span>
                            </div>
                            {usageRate !== null && (
                              <div>
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                                    使用率
                                  </span>
                                  <span className={`font-semibold ${usageRate > 80 ? 'text-destructive' : ''}`}>
                                    {usageRate.toFixed(1)}%
                                    {usageRate > 80 && <AlertCircle className="inline h-3 w-3 ml-1" />}
                                  </span>
                                </div>
                                <div className="h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className={`h-full transition-all ${usageRate > 80 ? 'bg-destructive' : usageRate > 50 ? 'bg-warning' : 'bg-success'}`}
                                    style={{ width: `${usageRate}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        {(account.billingDate || account.paymentDueDate) && (
                          <div className="flex gap-4 text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                            {account.billingDate && <span>出账日: {account.billingDate}号</span>}
                            {account.paymentDueDate && <span>还款日: {account.paymentDueDate}号</span>}
                          </div>
                        )}
                        {account.unpostedBalance && account.unpostedBalance > 0 && (
                          <div className="flex justify-between items-center p-2 bg-warning/10 rounded text-warning" style={{ fontSize: 'var(--font-size-small)' }}>
                            <span>未出账金额</span>
                            <span className="font-semibold">{formatMoney(account.unpostedBalance)}</span>
                          </div>
                        )}
                        {account.cardNumber && (
                          <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                            卡号尾号：{account.cardNumber}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="mt-4">
                        <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                          当前余额
                        </p>
                        <p className="font-bold" style={{ fontSize: 'var(--font-size-headline)' }}>
                          {formatMoney(account.balance)}
                        </p>
                        {account.cardNumber && (
                          <p className="text-muted-foreground mt-1" style={{ fontSize: 'var(--font-size-small)' }}>
                            卡号尾号：{account.cardNumber}
                          </p>
                        )}
                      </div>
                    )}

                    {account.remark && (
                      <p className="text-muted-foreground mt-2" style={{ fontSize: 'var(--font-size-small)' }}>
                        {account.remark}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </FadeIn>
            );
          })}
        </Stagger>

        {accounts?.length === 0 && (
          <FadeIn>
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">暂无账户，点击上方按钮添加</p>
              </CardContent>
            </Card>
          </FadeIn>
        )}
      </div>
    </MainLayout>
  );
}
