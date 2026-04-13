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
} from 'lucide-react';
import type { Account, AccountType } from '@/types';

const accountTypeLabels: Record<AccountType, string> = {
  ALIPAY: '支付宝',
  WECHAT: '微信',
  BANK: '银行卡',
  CREDIT_CARD: '信用卡',
  CASH: '现金',
  OTHER: '其他',
};

const accountTypeIcons: Record<AccountType, React.ElementType> = {
  ALIPAY: Smartphone,
  WECHAT: Smartphone,
  BANK: Banknote,
  CREDIT_CARD: CreditCard,
  CASH: BanknoteIcon,
  OTHER: Wallet,
};

function formatMoney(amount: number) {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      type,
      balance: parseFloat(balance) || 0,
      remark,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
      <div className="space-y-2">
        <Label htmlFor="balance">余额</Label>
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
              管理您的各类账户资产
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingAccount(null)}>
                <Plus className="h-4 w-4 mr-2" />
                新增账户
              </Button>
            </DialogTrigger>
            <DialogContent>
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
                    <div className="mt-4">
                      <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                        当前余额
                      </p>
                      <p className="font-bold" style={{ fontSize: 'var(--font-size-headline)' }}>
                        {formatMoney(account.balance)}
                      </p>
                    </div>
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
