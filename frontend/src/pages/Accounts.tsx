import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { FadeIn, Stagger } from '@/components/MotionPrimitives';
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount } from '@/hooks/use-accounts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
} from 'lucide-react';
import type { Account, AccountType } from '@/types';

// 信用账户类型
const CREDIT_ACCOUNT_TYPES: AccountType[] = ['CREDIT_CARD', 'HUABEI', 'BAITIAO', 'DOUYIN_PAY'];

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      type,
      balance: parseFloat(balance) || 0,
      remark,
      creditLimit: creditLimit ? parseFloat(creditLimit) : undefined,
      availableCredit: availableCredit ? parseFloat(availableCredit) : undefined,
      billingDate: billingDate ? parseInt(billingDate) : undefined,
      paymentDueDate: paymentDueDate ? parseInt(paymentDueDate) : undefined,
      unpostedBalance: unpostedBalance ? parseFloat(unpostedBalance) : 0,
    });
  };

  const showCreditFields = isCreditAccount(type);

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
                      </div>
                    ) : (
                      <div className="mt-4">
                        <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                          当前余额
                        </p>
                        <p className="font-bold" style={{ fontSize: 'var(--font-size-headline)' }}>
                          {formatMoney(account.balance)}
                        </p>
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
