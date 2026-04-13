import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { FadeIn } from '@/components/MotionPrimitives';
import {
  useAutomationRules,
  useCreateAutomationRule,
  useUpdateAutomationRule,
  useDeleteAutomationRule,
  useToggleAutomationRule,
} from '@/hooks/use-automation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  Zap,
  Plus,
  Edit,
  Trash2,
  Tag,
  FolderOpen,
  Bell,
  AlertCircle,
  Store,
  ListTree,
  DollarSign,
  GitMerge,
} from 'lucide-react';
import type { AutomationRule } from '@/types';

type TriggerType = 'merchant' | 'category' | 'amount' | 'combination';
type ActionType = 'add_tag' | 'set_category' | 'send_notification' | 'mark_review';

const triggerTypeLabels: Record<TriggerType, { label: string; icon: React.ElementType }> = {
  merchant: { label: '商户匹配', icon: Store },
  category: { label: '分类匹配', icon: ListTree },
  amount: { label: '金额条件', icon: DollarSign },
  combination: { label: '组合条件', icon: GitMerge },
};

const actionTypeLabels: Record<ActionType, { label: string; icon: React.ElementType }> = {
  add_tag: { label: '添加标签', icon: Tag },
  set_category: { label: '设置分类', icon: FolderOpen },
  send_notification: { label: '发送通知', icon: Bell },
  mark_review: { label: '标记待审', icon: AlertCircle },
};

// 规则表单组件
function RuleForm({
  rule,
  onSubmit,
  onCancel,
}: {
  rule?: AutomationRule;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(rule?.name || '');
  const [triggerType, setTriggerType] = useState<TriggerType>(rule?.triggerType || 'merchant');
  const [triggerConfig, setTriggerConfig] = useState<Record<string, any>>(
    rule?.triggerConfig || {}
  );
  const [actionType, setActionType] = useState<ActionType>(rule?.actionType || 'add_tag');
  const [actionConfig, setActionConfig] = useState<Record<string, any>>(
    rule?.actionConfig || {}
  );
  const [priority, setPriority] = useState(rule?.priority?.toString() || '0');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      triggerType,
      triggerConfig,
      actionType,
      actionConfig,
      priority: parseInt(priority) || 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>规则名称</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="如：外卖自动分类"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>触发类型</Label>
          <Select value={triggerType} onValueChange={(v) => setTriggerType(v as TriggerType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(triggerTypeLabels).map(([value, { label }]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>优先级</Label>
          <Input
            type="number"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            placeholder="数字越大优先级越高"
          />
        </div>
      </div>

      {/* 触发配置 */}
      <div className="space-y-2">
        <Label>触发条件配置</Label>
        {triggerType === 'merchant' && (
          <div className="space-y-2">
            <Input
              value={triggerConfig.pattern || ''}
              onChange={(e) => setTriggerConfig({ ...triggerConfig, pattern: e.target.value })}
              placeholder="商户名称关键词，支持逗号分隔多个"
            />
            <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
              交易商户包含该关键词时触发
            </p>
          </div>
        )}
        {triggerType === 'category' && (
          <div className="space-y-2">
            <Input
              value={triggerConfig.categoryId || ''}
              onChange={(e) => setTriggerConfig({ ...triggerConfig, categoryId: e.target.value })}
              placeholder="分类ID"
            />
            <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
              交易分类匹配时触发
            </p>
          </div>
        )}
        {triggerType === 'amount' && (
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              value={triggerConfig.minAmount || ''}
              onChange={(e) => setTriggerConfig({ ...triggerConfig, minAmount: e.target.value })}
              placeholder="最小金额"
            />
            <Input
              type="number"
              value={triggerConfig.maxAmount || ''}
              onChange={(e) => setTriggerConfig({ ...triggerConfig, maxAmount: e.target.value })}
              placeholder="最大金额"
            />
          </div>
        )}
        {triggerType === 'combination' && (
          <div className="space-y-2">
            <Input
              value={triggerConfig.conditions || ''}
              onChange={(e) => setTriggerConfig({ ...triggerConfig, conditions: e.target.value })}
              placeholder="JSON格式的组合条件"
            />
            <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
              支持多个条件的 AND/OR 组合
            </p>
          </div>
        )}
      </div>

      {/* 动作配置 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>执行动作</Label>
          <Select value={actionType} onValueChange={(v) => setActionType(v as ActionType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(actionTypeLabels).map(([value, { label }]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>动作参数</Label>
          {actionType === 'add_tag' && (
            <Input
              value={actionConfig.tag || ''}
              onChange={(e) => setActionConfig({ ...actionConfig, tag: e.target.value })}
              placeholder="标签名称"
            />
          )}
          {actionType === 'set_category' && (
            <Input
              value={actionConfig.categoryId || ''}
              onChange={(e) => setActionConfig({ ...actionConfig, categoryId: e.target.value })}
              placeholder="目标分类ID"
            />
          )}
          {actionType === 'send_notification' && (
            <Input
              value={actionConfig.message || ''}
              onChange={(e) => setActionConfig({ ...actionConfig, message: e.target.value })}
              placeholder="通知消息"
            />
          )}
          {actionType === 'mark_review' && (
            <Input
              value={actionConfig.reason || ''}
              onChange={(e) => setActionConfig({ ...actionConfig, reason: e.target.value })}
              placeholder="标记原因"
            />
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>取消</Button>
        <Button type="submit">{rule ? '更新' : '创建'}</Button>
      </div>
    </form>
  );
}

export default function Automation() {
  const { data: rules, isLoading } = useAutomationRules();
  const createMutation = useCreateAutomationRule();
  const updateMutation = useUpdateAutomationRule();
  const deleteMutation = useDeleteAutomationRule();
  const toggleMutation = useToggleAutomationRule();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);

  const handleSubmit = (data: any) => {
    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, ...data }, {
        onSuccess: () => {
          setDialogOpen(false);
          setEditingRule(null);
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
    if (confirm('确定要删除这条规则吗？')) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggle = (id: string) => {
    toggleMutation.mutate(id);
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
              自动化规则
            </h1>
            <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-body)', marginTop: 'var(--spacing-xs)' }}>
              智能处理交易，自动分类打标签
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingRule(null)}>
                <Plus className="h-4 w-4 mr-2" />
                新增规则
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingRule ? '编辑规则' : '新增规则'}</DialogTitle>
              </DialogHeader>
              <RuleForm
                rule={editingRule || undefined}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setDialogOpen(false);
                  setEditingRule(null);
                }}
              />
            </DialogContent>
          </Dialog>
        </FadeIn>

        {/* 规则列表 */}
        <FadeIn>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                规则列表
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rules && rules.length > 0 ? (
                <div className="space-y-3">
                  {rules.map((rule) => {
                    const triggerConfig = triggerTypeLabels[rule.triggerType];
                    const actionConfig = actionTypeLabels[rule.actionType];
                    const TriggerIcon = triggerConfig?.icon || Zap;
                    const ActionIcon = actionConfig?.icon || Tag;

                    return (
                      <div
                        key={rule.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            rule.isActive ? 'bg-primary/10' : 'bg-muted'
                          }`}>
                            <Zap className={`h-5 w-5 ${rule.isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{rule.name}</p>
                              {!rule.isActive && (
                                <Badge variant="secondary">已禁用</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <div className="flex items-center gap-1">
                                <TriggerIcon className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                                  {triggerConfig?.label}
                                </span>
                              </div>
                              <span className="text-muted-foreground">→</span>
                              <div className="flex items-center gap-1">
                                <ActionIcon className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                                  {actionConfig?.label}
                                </span>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                优先级 {rule.priority}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={rule.isActive}
                            onCheckedChange={() => handleToggle(rule.id)}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              setEditingRule(rule);
                              setDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleDelete(rule.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <Zap className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">暂无自动化规则</p>
                </div>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </MainLayout>
  );
}
