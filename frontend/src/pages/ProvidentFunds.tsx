import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { FadeIn, Stagger } from '@/components/MotionPrimitives';
import {
  useProvidentFunds, useCreateProvidentFund,
  useUpdateProvidentFund, useDeleteProvidentFund,
  useUpdatePFBalance,
} from '@/hooks/use-provident-fund';
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
  Building2,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Wallet,
  Landmark,
} from 'lucide-react';
import type { ProvidentFund } from '@/types';

function formatMoney(amount: number) {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// 主要城市列表
const majorCities = [
  '北京', '上海', '广州', '深圳', '杭州', '南京', '苏州', '成都', '武汉', '西安',
  '重庆', '天津', '长沙', '郑州', '东莞', '佛山', '青岛', '济南', '大连', '沈阳',
  '厦门', '福州', '合肥', '昆明', '哈尔滨', '长春', '石家庄', '南昌', '贵阳', '南宁',
  '海口', '太原', '兰州', '银川', '西宁', '乌鲁木齐', '呼和浩特', '拉萨', '其他',
];

// 城市公积金年利率映射（2024年基准利率）
const cityInterestRates: Record<string, number> = {
  '北京': 1.5,
  '上海': 1.5,
  '广州': 1.5,
  '深圳': 1.5,
  '杭州': 1.5,
  '南京': 1.5,
  '苏州': 1.5,
  '成都': 1.5,
  '武汉': 1.5,
  '西安': 1.5,
  '重庆': 1.5,
  '天津': 1.5,
  '长沙': 1.5,
  '郑州': 1.5,
  '东莞': 1.5,
  '佛山': 1.5,
  '青岛': 1.5,
  '济南': 1.5,
  '大连': 1.5,
  '沈阳': 1.5,
  '厦门': 1.5,
  '福州': 1.5,
  '合肥': 1.5,
  '昆明': 1.5,
  '哈尔滨': 1.5,
  '长春': 1.5,
  '石家庄': 1.5,
  '南昌': 1.5,
  '贵阳': 1.5,
  '南宁': 1.5,
  '海口': 1.5,
  '太原': 1.5,
  '兰州': 1.5,
  '银川': 1.5,
  '西宁': 1.5,
  '乌鲁木齐': 1.5,
  '呼和浩特': 1.5,
  '拉萨': 1.5,
  '其他': 1.5,
};

function PFForm({
  pf,
  onSubmit,
  onCancel,
}: {
  pf?: ProvidentFund;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(pf?.name || '');
  const [city, setCity] = useState(pf?.city || '');
  const [accountNumber, setAccountNumber] = useState(pf?.accountNumber || '');
  const [balance, setBalance] = useState(pf?.balance?.toString() || '');
  const [monthlyContribution, setMonthlyContribution] = useState(pf?.monthlyContribution?.toString() || '');
  const [interestRate, setInterestRate] = useState(pf?.interestRate ? (pf.interestRate * 100).toString() : '');
  const [remark, setRemark] = useState(pf?.remark || '');

  // 当城市变化时，自动填充年利率
  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    // 只有在用户没有手动修改过年利率时才自动填充
    if (!interestRate || interestRate === '' || pf?.interestRate === undefined) {
      setInterestRate(cityInterestRates[newCity]?.toString() || '1.5');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      city,
      accountNumber: accountNumber || undefined,
      balance: parseFloat(balance) || 0,
      monthlyContribution: parseFloat(monthlyContribution) || 0,
      // 双边缴存 = 个人 + 单位，自动计算（如果只填总额，则各占50%）
      personalContribution: monthlyContribution ? parseFloat(monthlyContribution) / 2 : undefined,
      employerContribution: monthlyContribution ? parseFloat(monthlyContribution) / 2 : undefined,
      interestRate: interestRate ? parseFloat(interestRate) / 100 : undefined,
      remark: remark || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>账户名称</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：北京公积金" required />
        </div>
        <div className="space-y-2">
          <Label>缴存城市</Label>
          <Select value={city} onValueChange={handleCityChange}>
            <SelectTrigger><SelectValue placeholder="选择城市" /></SelectTrigger>
            <SelectContent>
              {majorCities.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>公积金账号</Label>
        <Input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="公积金账号（可选）" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>当前余额</Label>
          <Input type="number" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0.00" required />
        </div>
        <div className="space-y-2">
          <Label>双边月缴存(元)</Label>
          <Input type="number" step="0.01" value={monthlyContribution} onChange={(e) => setMonthlyContribution(e.target.value)} placeholder="个人+单位合计金额" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>年利率(%)</Label>
          <div className="relative">
            <Input 
              type="number" 
              step="0.01" 
              value={interestRate} 
              onChange={(e) => setInterestRate(e.target.value)} 
              placeholder="1.5"
            />
            {city && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                {cityInterestRates[city] || 1.5}% 基准
              </span>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label>备注</Label>
          <Input value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="备注信息" />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>取消</Button>
        <Button type="submit">{pf ? '更新' : '创建'}</Button>
      </div>
    </form>
  );
}

export default function ProvidentFunds() {
  const { data: funds, isLoading } = useProvidentFunds();
  const createMutation = useCreateProvidentFund();
  const updateMutation = useUpdateProvidentFund();
  const deleteMutation = useDeleteProvidentFund();
  const updateBalanceMutation = useUpdatePFBalance();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPF, setEditingPF] = useState<ProvidentFund | null>(null);
  const [balanceDialog, setBalanceDialog] = useState<{ id: string; name: string; balance: number } | null>(null);
  const [newBalance, setNewBalance] = useState('');

  const handleSubmit = (data: any) => {
    if (editingPF) {
      updateMutation.mutate({ id: editingPF.id, ...data }, { onSuccess: () => { setDialogOpen(false); setEditingPF(null); } });
    } else {
      createMutation.mutate(data, { onSuccess: () => { setDialogOpen(false); } });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除该公积金账户吗？')) deleteMutation.mutate(id);
  };

  const handleUpdateBalance = () => {
    if (!balanceDialog) return;
    updateBalanceMutation.mutate({ id: balanceDialog.id, balance: parseFloat(newBalance) || 0 }, {
      onSuccess: () => { setBalanceDialog(null); setNewBalance(''); },
    });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-64" /></div>
      </MainLayout>
    );
  }

  const totalBalance = funds?.reduce((sum, f) => sum + f.balance, 0) || 0;
  const totalMonthly = funds?.reduce((sum, f) => sum + f.monthlyContribution, 0) || 0;
  const byCity = funds?.reduce((acc, f) => { acc[f.city] = (acc[f.city] || 0) + f.balance; return acc; }, {} as Record<string, number>) || {};

  return (
    <MainLayout>
      <div style={{ gap: 'var(--spacing-xl)' }} className="flex flex-col">
        <FadeIn className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-bold" style={{ fontSize: 'var(--font-size-headline)' }}>公积金账户</h1>
            <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-body)', marginTop: 'var(--spacing-xs)' }}>管理公积金缴存，纳入净资产统计</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingPF(null)}><Plus className="h-4 w-4 mr-2" />添加账户</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>{editingPF ? '编辑公积金账户' : '添加公积金账户'}</DialogTitle></DialogHeader>
                <PFForm pf={editingPF || undefined} onSubmit={handleSubmit} onCancel={() => { setDialogOpen(false); setEditingPF(null); }} />
              </DialogContent>
            </Dialog>
          </div>
        </FadeIn>

        {/* 汇总卡片 */}
        <FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent style={{ padding: 'var(--spacing-lg)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>总余额</p>
                  <Landmark className="h-4 w-4 text-primary" />
                </div>
                <p className="font-bold text-xl">{formatMoney(totalBalance)}</p>
                <p className="text-sm text-muted-foreground mt-1">{funds?.length || 0} 个账户</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent style={{ padding: 'var(--spacing-lg)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>月缴存总额</p>
                  <Wallet className="h-4 w-4 text-success" />
                </div>
                <p className="font-bold text-xl">{formatMoney(totalMonthly)}</p>
                <p className="text-sm text-muted-foreground mt-1">个人+单位合计</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent style={{ padding: 'var(--spacing-lg)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>按城市分布</p>
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  {Object.entries(byCity).slice(0, 3).map(([city, balance]) => (
                    <div key={city} className="flex justify-between text-sm">
                      <span>{city}</span>
                      <span className="font-medium">{formatMoney(balance)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </FadeIn>

        {/* 公积金账户列表 */}
        <FadeIn>
          <h2 className="font-semibold mb-3">账户列表</h2>
          {funds && funds.length > 0 ? (
            <Stagger className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {funds.map((pf) => (
                <FadeIn key={pf.id}>
                  <Card>
                    <CardContent style={{ padding: 'var(--spacing-lg)' }}>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Landmark className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{pf.name}</h3>
                              <Badge variant="outline">{pf.city}</Badge>
                              {pf.accountStatus !== 'ACTIVE' && <Badge variant="destructive">{pf.accountStatus}</Badge>}
                            </div>
                            {pf.accountNumber && <p className="text-sm text-muted-foreground">账号：{pf.accountNumber}</p>}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setBalanceDialog({ id: pf.id, name: pf.name, balance: pf.balance }); setNewBalance(pf.balance.toString()); }}>
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingPF(pf); setDialogOpen(true); }}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(pf.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                        <div>
                          <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>当前余额</p>
                          <p className="font-bold">{formatMoney(pf.balance)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>月缴存</p>
                          <p className="font-semibold">{formatMoney(pf.monthlyContribution)}</p>
                        </div>
                        {pf.personalContribution !== null && (
                          <div>
                            <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>个人</p>
                            <p className="font-semibold">{formatMoney(pf.personalContribution)}</p>
                          </div>
                        )}
                        {pf.employerContribution !== null && (
                          <div>
                            <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>单位</p>
                            <p className="font-semibold">{formatMoney(pf.employerContribution)}</p>
                          </div>
                        )}
                        {pf.interestRate !== null && (
                          <div>
                            <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>年利率</p>
                            <p className="font-semibold">{(pf.interestRate * 100).toFixed(2)}%</p>
                          </div>
                        )}
                        {pf.remark && (
                          <div className="col-span-2">
                            <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>备注</p>
                            <p className="text-sm">{pf.remark}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </FadeIn>
              ))}
            </Stagger>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Landmark className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">暂无公积金账户，点击上方按钮添加</p>
              </CardContent>
            </Card>
          )}
        </FadeIn>

        {/* 更新余额弹窗 */}
        <Dialog open={!!balanceDialog} onOpenChange={() => setBalanceDialog(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>更新余额</DialogTitle></DialogHeader>
            {balanceDialog && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">账户：{balanceDialog.name}</p>
                <div className="space-y-2">
                  <Label>当前余额</Label>
                  <Input type="number" step="0.01" value={newBalance} onChange={(e) => setNewBalance(e.target.value)} placeholder="0.00" />
                </div>
                <Button onClick={handleUpdateBalance} className="w-full" disabled={updateBalanceMutation.isPending}>
                  {updateBalanceMutation.isPending ? '更新中...' : '确认更新'}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
