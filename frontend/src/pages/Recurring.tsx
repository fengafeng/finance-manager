import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { FadeIn } from '@/components/MotionPrimitives';
import {
  useRecurringBills,
  useRecurringSuggestions,
  useCreateRecurringBill,
  useUpdateRecurringBill,
  useDeleteRecurringBill,
} from '@/hooks/use-recurring';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Calendar,
  Plus,
  Edit,
  Trash2,
  Bell,
  Clock,
  Lightbulb,
  Check,
} from 'lucide-react';
import type { CycleType, RecurringBill } from '@/types';

const cycleTypeLabels: Record<CycleType, string> = {
  DAILY: '每日',
  WEEKLY: '每周',
  MONTHLY: '每月',
  YEARLY: '每年',
};

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('zh-CN');
}

// 账单表单组件
function BillForm({
  bill,
  onSubmit,
  onCancel,
}: {
  bill?: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(bill?.name || '');
  const [merchantPattern, setMerchantPattern] = useState(bill?.merchantPattern || '');
  const [amountPattern, setAmountPattern] = useState(bill?.amountPattern || '');
  const [cycleType, setCycleType] = useState<CycleType>(bill?.cycleType || 'MONTHLY');
  const [cycleDay, setCycleDay] = useState(bill?.cycleDay?.toString() || '');
  const [reminderDays, setReminderDays] = useState(bill?.reminderDays?.toString() || '3');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      merchantPattern,
      amountPattern,
      cycleType,
      cycleDay: cycleDay ? parseInt(cycleDay) : undefined,
      reminderDays: parseInt(reminderDays) || 3,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>账单名称</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="如：房租、Netflix订阅"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>周期类型</Label>
          <Select value={cycleType} onValueChange={(v) => setCycleType(v as CycleType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(cycleTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>周期日期</Label>
          <Input
            type="number"
            min="1"
            max="31"
            value={cycleDay}
            onChange={(e) => setCycleDay(e.target.value)}
            placeholder="每月几号"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>商户匹配</Label>
          <Input
            value={merchantPattern}
            onChange={(e) => setMerchantPattern(e.target.value)}
            placeholder="商户名称关键词"
          />
        </div>
        <div className="space-y-2">
          <Label>提前提醒天数</Label>
          <Input
            type="number"
            min="0"
            value={reminderDays}
            onChange={(e) => setReminderDays(e.target.value)}
            placeholder="3"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>金额描述</Label>
        <Input
          value={amountPattern}
          onChange={(e) => setAmountPattern(e.target.value)}
          placeholder="如：约 2000 元"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>取消</Button>
        <Button type="submit">{bill ? '更新' : '创建'}</Button>
      </div>
    </form>
  );
}

export default function Recurring() {
  const { data: bills, isLoading } = useRecurringBills();
  const { data: suggestions } = useRecurringSuggestions();
  const createMutation = useCreateRecurringBill();
  const updateMutation = useUpdateRecurringBill();
  const deleteMutation = useDeleteRecurringBill();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<RecurringBill | null>(null);

  const handleSubmit = (data: any) => {
    if (editingBill) {
      updateMutation.mutate({ id: editingBill.id, ...data }, {
        onSuccess: () => {
          setDialogOpen(false);
          setEditingBill(null);
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

  const handleConfirmSuggestion = (suggestion: any) => {
    createMutation.mutate({
      name: suggestion.name,
      merchantPattern: suggestion.merchantPattern,
      cycleType: suggestion.cycleType,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个定期账单吗？')) {
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

  // 分类：即将到期
  const upcomingBills = bills?.filter(b => b.isUpcoming) || [];

  return (
    <MainLayout>
      <div style={{ gap: 'var(--spacing-xl)' }} className="flex flex-col">
        <FadeIn className="flex items-center justify-between">
          <div>
            <h1 className="font-bold" style={{ fontSize: 'var(--font-size-headline)' }}>
              定期账单
            </h1>
            <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-body)', marginTop: 'var(--spacing-xs)' }}>
              智能识别周期性支出，到期自动提醒
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingBill(null); }}>
                <Plus className="h-4 w-4 mr-2" />
                新增账单
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingBill ? '编辑账单' : '新增账单'}</DialogTitle>
              </DialogHeader>
              <BillForm
                bill={editingBill}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setDialogOpen(false);
                  setEditingBill(null);
                }}
              />
            </DialogContent>
          </Dialog>
        </FadeIn>

        {/* 即将到期提醒 */}
        {upcomingBills.length > 0 && (
          <FadeIn>
            <Card className="border-warning/50 bg-warning/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-warning">
                  <Bell className="h-5 w-5" />
                  即将到期
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {upcomingBills.map((bill) => (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-background"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-warning" />
                        <div>
                          <p className="font-medium">{bill.name}</p>
                          <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                            {bill.daysUntilDue === 0 ? '今天到期' : `${bill.daysUntilDue}天后到期`}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">{cycleTypeLabels[bill.cycleType]}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        )}

        {/* 智能建议 */}
        {suggestions && suggestions.length > 0 && (
          <FadeIn>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  智能识别建议
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4" style={{ fontSize: 'var(--font-size-small)' }}>
                  系统检测到以下可能是周期性支出
                </p>
                <div className="space-y-2">
                  {suggestions.slice(0, 5).map((suggestion, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{suggestion.name}</p>
                          <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                            {suggestion.amountPattern} · {cycleTypeLabels[suggestion.cycleType as CycleType]} · {suggestion.occurrences}次
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleConfirmSuggestion(suggestion)}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        确认
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        )}

        {/* 账单列表 */}
        <FadeIn>
          <Card>
            <CardHeader>
              <CardTitle>所有定期账单</CardTitle>
            </CardHeader>
            <CardContent>
              {bills && bills.length > 0 ? (
                <div className="space-y-3">
                  {bills.map((bill) => (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          bill.isUpcoming ? 'bg-warning/10' : 'bg-muted'
                        }`}>
                          <Calendar className={`h-5 w-5 ${bill.isUpcoming ? 'text-warning' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{bill.name}</p>
                            {!bill.isActive && (
                              <Badge variant="secondary">已停用</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{cycleTypeLabels[bill.cycleType]}</Badge>
                            {bill.nextDueDate && (
                              <span className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                                下次：{formatDate(bill.nextDueDate)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setEditingBill(bill);
                            setDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(bill.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">暂无定期账单</p>
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </MainLayout>
  );
}
