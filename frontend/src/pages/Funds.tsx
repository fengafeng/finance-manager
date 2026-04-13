import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { FadeIn, Stagger } from '@/components/MotionPrimitives';
import { useFunds, useFundSummary, useCreateFund, useUpdateFund, useDeleteFund } from '@/hooks/use-funds';
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
  Plus,
  Edit,
  Trash2,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import type { Fund, FundType, InvestmentPlatform } from '@/types';
import { NaturalAddDialog } from '@/components/NaturalAddDialog';

const fundTypeLabels: Record<FundType, string> = {
  STOCK: '股票型基金',
  BOND: '债券型基金',
  MIXED: '混合型基金',
  MONEY: '货币型基金',
  QDII: 'QDII基金',
  INDEX: '指数型基金',
  WEALTH_MANAGEMENT: '理财产品',
  STOCK_PRODUCT: '股票',
  PENSION: '养老险',
  ANNUITY: '年金险',
  UNIVERSAL: '万能险',
  INSURANCE_CASH: '保险(现金价值)',
  OTHER: '其他',
};

const platformLabels: Record<InvestmentPlatform, string> = {
  ALIPAY: '支付宝',
  WECHAT: '微信理财',
  TENCENT: '腾讯理财通',
  JD_FINANCE: '京东金融',
  BAIDU_WALLET: '百度钱包',
  BANK_APP: '银行APP',
  FUND_COMPANY: '基金公司',
  STOCK_BROKER: '券商',
  OTHER: '其他',
};

function formatMoney(amount: number) {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercent(value: number) {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function FundForm({
  fund,
  onSubmit,
  onCancel,
}: {
  fund?: Fund | null;
  onSubmit: (data: Partial<Fund>) => void;
  onCancel: () => void;
}) {
  const [code, setCode] = useState(fund?.code || '');
  const [name, setName] = useState(fund?.name || '');
  const [type, setType] = useState<FundType>(fund?.type || 'MIXED');
  const [platform, setPlatform] = useState<InvestmentPlatform>(fund?.platform || 'OTHER');
  const [cost, setCost] = useState(fund?.cost?.toString() || '0');
  const [currentValue, setCurrentValue] = useState(fund?.currentValue?.toString() || '0');
  const [remark, setRemark] = useState(fund?.remark || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const costVal = parseFloat(cost) || 0;
    const currentVal = parseFloat(currentValue) || 0;
    // 收益 = 当前市值 - 成本
    const profit = currentVal - costVal;
    // 收益率 = 收益 / 成本 * 100
    const profitRate = costVal > 0 ? (profit / costVal) * 100 : 0;

    onSubmit({
      code,
      name,
      type,
      platform,
      cost: costVal,
      currentValue: currentVal,
      profit: profit,
      profitRate: profitRate,
      remark,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="platform">投资平台</Label>
          <Select value={platform} onValueChange={(v) => setPlatform(v as InvestmentPlatform)}>
            <SelectTrigger>
              <SelectValue placeholder="选择平台" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(platformLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">产品类型</Label>
          <Select value={type} onValueChange={(v) => setType(v as FundType)}>
            <SelectTrigger>
              <SelectValue placeholder="选择类型" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(fundTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">产品名称</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="请输入产品名称"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="code">产品代码/持仓编号</Label>
        <Input
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="基金代码、股票代码或自定义编号"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="cost">投资成本</Label>
          <Input
            id="cost"
            type="number"
            step="0.01"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="买入时的总成本"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="currentValue">当前市值</Label>
          <Input
            id="currentValue"
            type="number"
            step="0.01"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            placeholder="当前总价值"
          />
        </div>
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
        <Button type="submit">{fund ? '更新' : '创建'}</Button>
      </div>
    </form>
  );
}

export default function Funds() {
  const { data: funds, isLoading } = useFunds();
  const { data: summary } = useFundSummary();
  const createMutation = useCreateFund();
  const updateMutation = useUpdateFund();
  const deleteMutation = useDeleteFund();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFund, setEditingFund] = useState<Fund | null>(null);
  const [filterType, setFilterType] = useState<FundType | 'ALL'>('ALL');
  const [filterPlatform, setFilterPlatform] = useState<InvestmentPlatform | 'ALL'>('ALL');

  // 过滤后的产品列表
  const filteredFunds = funds?.filter(f => {
    if (filterType !== 'ALL' && f.type !== filterType) return false;
    if (filterPlatform !== 'ALL' && f.platform !== filterPlatform) return false;
    return true;
  }) || [];

  // 按平台分组汇总
  const platformSummary = summary?.byPlatform || {};

  const handleSubmit = (data: Partial<Fund>) => {
    // 收益 = 当前市值 - 成本
    const profit = (data.currentValue || 0) - (data.cost || 0);
    // 收益率 = 收益 / 成本 * 100
    const profitRate = (data.cost || 0) > 0 ? (profit / (data.cost || 0)) * 100 : 0;

    const fundData = {
      ...data,
      profit,
      profitRate,
    };

    if (editingFund) {
      updateMutation.mutate({ id: editingFund.id, ...fundData }, {
        onSuccess: () => {
          setDialogOpen(false);
          setEditingFund(null);
        },
      });
    } else {
      createMutation.mutate(fundData, {
        onSuccess: () => {
          setDialogOpen(false);
        },
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个产品吗？')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div style={{ gap: 'var(--spacing-xl)' }} className="flex flex-col">
        {/* 页面标题 */}
        <FadeIn className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-bold" style={{ fontSize: 'var(--font-size-headline)' }}>
              投资管理
            </h1>
            <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-body)', marginTop: 'var(--spacing-xs)' }}>
              管理基金、理财产品、股票等各类投资
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
                <Button onClick={() => setEditingFund(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  新增产品
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingFund ? '编辑产品' : '新增投资产品'}</DialogTitle>
                </DialogHeader>
                <FundForm
                  fund={editingFund}
                  onSubmit={handleSubmit}
                  onCancel={() => {
                    setDialogOpen(false);
                    setEditingFund(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </FadeIn>

        {/* 汇总卡片 */}
        <FadeIn>
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
            <CardContent style={{ padding: 'var(--spacing-xl)' }}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-label)' }}>
                    总市值
                  </p>
                  <p className="font-bold" style={{ fontSize: 'var(--font-size-headline)' }}>
                    {formatMoney(summary?.totalValue || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-label)' }}>
                    总成本
                  </p>
                  <p className="font-bold" style={{ fontSize: 'var(--font-size-headline)' }}>
                    {formatMoney(summary?.totalCost || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-label)' }}>
                    总收益
                  </p>
                  <p
                    className={`font-bold ${summary && summary.totalProfit >= 0 ? 'text-success' : 'text-destructive'}`}
                    style={{ fontSize: 'var(--font-size-headline)' }}
                  >
                    {summary && summary.totalProfit >= 0 ? '+' : ''}{formatMoney(summary?.totalProfit || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-label)' }}>
                    收益率
                  </p>
                  <p
                    className={`font-bold ${summary && summary.profitRate >= 0 ? 'text-success' : 'text-destructive'}`}
                    style={{ fontSize: 'var(--font-size-headline)' }}
                  >
                    {formatPercent(summary?.profitRate || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* 按平台分组汇总 */}
        {Object.keys(platformSummary).length > 0 && (
          <FadeIn>
            <Card>
              <CardContent style={{ padding: 'var(--spacing-lg)' }}>
                <h2 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  各平台汇总
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(platformSummary).map(([platform, data]) => (
                    <div key={platform} className="p-3 bg-muted/50 rounded-lg">
                      <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                        {platformLabels[platform as InvestmentPlatform] || platform}
                      </p>
                      <p className="font-bold">{formatMoney(data.value)}</p>
                      <p className={`text-xs ${data.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatPercent(data.value > 0 ? (data.profit / (data.value - data.profit)) * 100 : 0)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        )}

        {/* 筛选器 */}
        <FadeIn className="flex gap-4 flex-wrap">
          <Select value={filterPlatform} onValueChange={(v) => setFilterPlatform(v as any)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="全部平台" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">全部平台</SelectItem>
              {Object.entries(platformLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="全部类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">全部类型</SelectItem>
              {Object.entries(fundTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filteredFunds.length > 0 && (
            <span className="text-muted-foreground self-center text-sm">
              共 {filteredFunds.length} 个产品
            </span>
          )}
        </FadeIn>

        {/* 产品列表 */}
        <Stagger className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFunds.map((fund) => (
            <FadeIn key={fund.id}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent style={{ padding: 'var(--spacing-lg)' }}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" style={{ fontSize: 'var(--font-size-small)' }}>
                          {platformLabels[fund.platform] || fund.platform}
                        </Badge>
                        <p className="font-semibold" style={{ fontSize: 'var(--font-size-label)' }}>
                          {fund.name}
                        </p>
                      </div>
                      <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                        {fund.code}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingFund(fund);
                          setDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(fund.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                        当前市值
                      </p>
                      <p className="font-semibold" style={{ fontSize: 'var(--font-size-label)' }}>
                        {formatMoney(fund.currentValue)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                        成本
                      </p>
                      <p className="font-semibold" style={{ fontSize: 'var(--font-size-small)' }}>
                        {formatMoney(fund.cost)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                        收益率
                      </p>
                      <div className="flex items-center gap-1">
                        {fund.profit >= 0 ? (
                          <ArrowUpRight className="h-4 w-4 text-success" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-destructive" />
                        )}
                        <p
                          className={`font-semibold ${fund.profit >= 0 ? 'text-success' : 'text-destructive'}`}
                          style={{ fontSize: 'var(--font-size-label)' }}
                        >
                          {formatPercent(fund.profitRate)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          ))}
        </Stagger>

        {filteredFunds.length === 0 && funds?.length === 0 && (
          <FadeIn>
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">暂无投资产品，点击上方按钮添加</p>
              </CardContent>
            </Card>
          </FadeIn>
        )}

        {filteredFunds.length === 0 && funds && funds.length > 0 && (
          <FadeIn>
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <p className="text-muted-foreground">没有符合筛选条件的产品</p>
                <Button variant="link" onClick={() => { setFilterType('ALL'); setFilterPlatform('ALL'); }}>
                  清除筛选
                </Button>
              </CardContent>
            </Card>
          </FadeIn>
        )}
      </div>
    </MainLayout>
  );
}
