import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { FadeIn, Stagger } from '@/components/MotionPrimitives';
import { useTransactions, useCreateTransaction, useDeleteTransaction } from '@/hooks/use-transactions';
import { useAccounts } from '@/hooks/use-accounts';
import { useAllCategories, useInitDefaultCategories } from '@/hooks/use-categories';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Receipt,
  Plus,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCcw,
  Search,
  Filter,
  Sparkles,
} from 'lucide-react';
import type { Transaction, TransactionType } from '@/types';
import { NaturalAddDialog } from '@/components/NaturalAddDialog';

const transactionTypeLabels: Record<TransactionType, { label: string; color: string }> = {
  INCOME: { label: '收入', color: 'text-success' },
  EXPENSE: { label: '支出', color: 'text-destructive' },
  TRANSFER: { label: '转账', color: 'text-primary' },
  REFUND: { label: '退款', color: 'text-warning' },
};

function formatMoney(amount: number) {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function TransactionForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: Partial<Transaction>) => void;
  onCancel: () => void;
}) {
  const { data: accounts } = useAccounts();
  const { data: categories } = useAllCategories();

  const [accountId, setAccountId] = useState('');
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [merchant, setMerchant] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      accountId,
      type,
      amount: parseFloat(amount) || 0,
      category,
      merchant,
      description,
    });
  };

  const filteredCategories = categories?.filter((c) => c.type === type) || [];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>交易类型</Label>
        <Tabs value={type} onValueChange={(v) => setType(v as TransactionType)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="EXPENSE">支出</TabsTrigger>
            <TabsTrigger value="INCOME">收入</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="space-y-2">
        <Label htmlFor="account">账户</Label>
        <Select value={accountId} onValueChange={setAccountId} required>
          <SelectTrigger>
            <SelectValue placeholder="选择账户" />
          </SelectTrigger>
          <SelectContent>
            {accounts?.map((acc) => (
              <SelectItem key={acc.id} value={acc.id}>
                {acc.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="amount">金额</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">分类</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue placeholder="选择分类" />
          </SelectTrigger>
          <SelectContent>
            {filteredCategories.map((cat) => (
              <SelectItem key={cat.id} value={cat.name}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="merchant">商家/来源</Label>
        <Input
          id="merchant"
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          placeholder="可选"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">备注</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="可选"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">创建</Button>
      </div>
    </form>
  );
}

export default function Transactions() {
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: transactions, isLoading } = useTransactions({ page, pageSize: 20 });
  const createMutation = useCreateTransaction();
  const deleteMutation = useDeleteTransaction();
  const initCategoriesMutation = useInitDefaultCategories();

  const handleSubmit = (data: Partial<Transaction>) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        setDialogOpen(false);
      },
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这条交易记录吗？')) {
      deleteMutation.mutate(id);
    }
  };

  // 初始化默认分类
  const handleInitCategories = () => {
    initCategoriesMutation.mutate();
  };

  const filteredTransactions = transactions?.items.filter((t) =>
    searchTerm
      ? t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.merchant?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category?.toLowerCase().includes(searchTerm.toLowerCase())
      : true
  );

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
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
              交易流水
            </h1>
            <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-body)', marginTop: 'var(--spacing-xs)' }}>
              记录和管理您的收支明细
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleInitCategories}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              初始化分类
            </Button>
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
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  新增交易
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>新增交易</DialogTitle>
                </DialogHeader>
                <TransactionForm onSubmit={handleSubmit} onCancel={() => setDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </FadeIn>

        {/* 搜索和筛选 */}
        <FadeIn>
          <Card>
            <CardContent style={{ padding: 'var(--spacing-md)' }}>
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索交易记录..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  筛选
                </Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* 交易列表 */}
        <Stagger className="space-y-2">
          {filteredTransactions?.map((transaction) => {
            const typeInfo = transactionTypeLabels[transaction.type];
            return (
              <FadeIn key={transaction.id}>
                <Card className="hover:shadow-sm transition-shadow">
                  <CardContent style={{ padding: 'var(--spacing-md)' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            transaction.type === 'INCOME' || transaction.type === 'REFUND'
                              ? 'bg-success/10'
                              : 'bg-destructive/10'
                          }`}
                        >
                          {transaction.type === 'INCOME' || transaction.type === 'REFUND' ? (
                            <ArrowUpRight className="h-5 w-5 text-success" />
                          ) : (
                            <ArrowDownRight className="h-5 w-5 text-destructive" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium" style={{ fontSize: 'var(--font-size-label)' }}>
                              {transaction.description || transaction.merchant || '无描述'}
                            </p>
                            <Badge variant="secondary" style={{ fontSize: 'var(--font-size-small)' }}>
                              {transaction.category || '未分类'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                              {transaction.account?.name}
                            </span>
                            <span className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                              ·
                            </span>
                            <span className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                              {formatDate(transaction.transactionDate)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p
                          className={`font-bold ${typeInfo.color}`}
                          style={{ fontSize: 'var(--font-size-label)' }}
                        >
                          {transaction.type === 'INCOME' || transaction.type === 'REFUND' ? '+' : '-'}
                          {formatMoney(transaction.amount)}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(transaction.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </FadeIn>
            );
          })}
        </Stagger>

        {filteredTransactions?.length === 0 && (
          <FadeIn>
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">暂无交易记录</p>
              </CardContent>
            </Card>
          </FadeIn>
        )}

        {/* 分页 */}
        {transactions && transactions.totalPages > 1 && (
          <FadeIn className="flex justify-center gap-2">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              上一页
            </Button>
            <span className="flex items-center px-4">
              {page} / {transactions.totalPages}
            </span>
            <Button
              variant="outline"
              disabled={page >= transactions.totalPages}
              onClick={() => setPage(page + 1)}
            >
              下一页
            </Button>
          </FadeIn>
        )}
      </div>
    </MainLayout>
  );
}
