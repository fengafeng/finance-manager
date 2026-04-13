import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { FadeIn, Stagger } from '@/components/MotionPrimitives';
import {
  useImportConfigs,
  useImportConfigSummary,
  useImportableTypes,
  useCreateImportConfig,
  useUpdateImportConfig,
  useDeleteImportConfig,
} from '@/hooks/use-import-config';
import { useAccounts } from '@/hooks/use-accounts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  Settings,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  Smartphone,
  CreditCard,
  Building2,
  ToggleLeft,
  ToggleRight,
  Clock,
  Info,
  FileText,
} from 'lucide-react';
import type { ImportConfig, ImportConfigSourceType } from '@/types';

// 来源类型配置
const sourceTypeConfig: Record<ImportConfigSourceType, { label: string; icon: React.ReactNode; color: string }> = {
  IMPORT_ALIPAY: { label: '支付宝', icon: <Smartphone className="h-4 w-4" />, color: '#1677FF' },
  IMPORT_WECHAT: { label: '微信支付', icon: <Smartphone className="h-4 w-4" />, color: '#07C160' },
  IMPORT_BANK: { label: '银行', icon: <Building2 className="h-4 w-4" />, color: '#722ED1' },
};

// 导入配置表单
function ImportConfigForm({
  config,
  accounts,
  onSubmit,
  onCancel,
}: {
  config?: ImportConfig | null;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(config?.name || '');
  const [sourceType, setSourceType] = useState<ImportConfigSourceType>(config?.sourceType || 'IMPORT_ALIPAY');
  const [linkedAccountId, setLinkedAccountId] = useState(config?.linkedAccountId || '');
  const [thirdPartyAccount, setThirdPartyAccount] = useState(config?.thirdPartyAccount || '');
  const [nickname, setNickname] = useState(config?.nickname || '');
  const [defaultCategory, setDefaultCategory] = useState(config?.defaultCategory || '');
  const [autoTag, setAutoTag] = useState(config?.autoTag ?? false);
  const [skipInternal, setSkipInternal] = useState(config?.skipInternal ?? true);
  const [mergeSimilar, setMergeSimilar] = useState(config?.mergeSimilar ?? false);
  const [remark, setRemark] = useState(config?.remark || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      sourceType,
      linkedAccountId: linkedAccountId || null,
      thirdPartyAccount: thirdPartyAccount || null,
      nickname: nickname || null,
      defaultCategory: defaultCategory || null,
      autoTag,
      skipInternal,
      mergeSimilar,
      remark: remark || null,
    });
  };

  // 根据来源类型过滤可用账户
  const availableAccounts = accounts?.filter((acc) => {
    if (sourceType === 'IMPORT_ALIPAY') return acc.type === 'ALIPAY';
    if (sourceType === 'IMPORT_WECHAT') return acc.type === 'WECHAT';
    if (sourceType === 'IMPORT_BANK') return acc.type === 'BANK' || acc.type === 'CREDIT_CARD';
    return true;
  }) || [];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">配置名称</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="如：我的支付宝"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sourceType">账单来源</Label>
          <Select value={sourceType} onValueChange={(v) => setSourceType(v as ImportConfigSourceType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="IMPORT_ALIPAY">支付宝</SelectItem>
              <SelectItem value="IMPORT_WECHAT">微信支付</SelectItem>
              <SelectItem value="IMPORT_BANK">银行</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="linkedAccount">关联账户</Label>
          <Select value={linkedAccountId} onValueChange={setLinkedAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="选择系统账户" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">不关联</SelectItem>
              {availableAccounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            导入的交易将关联到所选账户
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="thirdPartyAccount">第三方账号</Label>
          <Input
            id="thirdPartyAccount"
            value={thirdPartyAccount}
            onChange={(e) => setThirdPartyAccount(e.target.value)}
            placeholder={sourceType === 'IMPORT_ALIPAY' ? '支付宝账号' : sourceType === 'IMPORT_WECHAT' ? '微信OpenID' : '银行卡号'}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nickname">昵称/备注</Label>
          <Input
            id="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="用于识别此配置"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultCategory">默认分类</Label>
          <Input
            id="defaultCategory"
            value={defaultCategory}
            onChange={(e) => setDefaultCategory(e.target.value)}
            placeholder="如：餐饮、交通"
          />
        </div>
      </div>

      {/* 导入选项 */}
      <div className="p-4 bg-muted/50 rounded-lg space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Settings className="h-4 w-4" />
          导入选项
        </div>
        <div className="grid grid-cols-3 gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <button
              type="button"
              onClick={() => setAutoTag(!autoTag)}
              className="text-primary"
            >
              {autoTag ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
            </button>
            <span className="text-sm">自动打标签</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <button
              type="button"
              onClick={() => setSkipInternal(!skipInternal)}
              className="text-primary"
            >
              {skipInternal ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
            </button>
            <span className="text-sm">跳过内部转账</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <button
              type="button"
              onClick={() => setMergeSimilar(!mergeSimilar)}
              className="text-primary"
            >
              {mergeSimilar ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
            </button>
            <span className="text-sm">合并相似交易</span>
          </label>
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
        <Button type="submit">{config ? '更新' : '创建'}</Button>
      </div>
    </form>
  );
}

// 导入配置卡片
function ImportConfigCard({
  config,
  onEdit,
  onDelete,
}: {
  config: ImportConfig & { sourceTypeLabel: string };
  onEdit: () => void;
  onDelete: () => void;
}) {
  const typeConfig = sourceTypeConfig[config.sourceType];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white"
              style={{ backgroundColor: typeConfig.color }}
            >
              {typeConfig.icon}
            </div>
            <div>
              <p className="font-medium">{config.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" style={{ fontSize: '11px' }}>
                  {config.sourceTypeLabel}
                </Badge>
                {!config.isActive && (
                  <Badge variant="outline" className="text-muted-foreground" style={{ fontSize: '11px' }}>
                    已停用
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          {config.linkedAccount && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">关联账户</span>
              <span>{config.linkedAccount.name}</span>
            </div>
          )}
          {config.thirdPartyAccount && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">第三方账号</span>
              <span className="font-mono text-xs">{config.thirdPartyAccount}</span>
            </div>
          )}
          {config.lastImportAt && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">最后导入</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(config.lastImportAt).toLocaleDateString('zh-CN')}
              </span>
            </div>
          )}
          {config.lastImportCount !== null && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">上次导入</span>
              <span>{config.lastImportCount} 条记录</span>
            </div>
          )}
        </div>

        {/* 导入选项标签 */}
        <div className="mt-3 flex flex-wrap gap-1">
          {config.autoTag && (
            <Badge variant="outline" className="text-xs">自动打标签</Badge>
          )}
          {config.skipInternal && (
            <Badge variant="outline" className="text-xs">跳过内部转账</Badge>
          )}
          {config.mergeSimilar && (
            <Badge variant="outline" className="text-xs">合并相似交易</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// 导入配置列表
function ImportConfigList() {
  const { data: configs, isLoading } = useImportConfigs();
  const createMutation = useCreateImportConfig();
  const updateMutation = useUpdateImportConfig();
  const deleteMutation = useDeleteImportConfig();
  const { data: accounts } = useAccounts();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ImportConfig | null>(null);

  const handleSubmit = (data: any) => {
    if (editingConfig) {
      updateMutation.mutate({ id: editingConfig.id, ...data }, {
        onSuccess: () => {
          setDialogOpen(false);
          setEditingConfig(null);
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
    if (confirm('确定要删除这个导入配置吗？')) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleActive = (config: ImportConfig & { sourceTypeLabel: string }) => {
    updateMutation.mutate({
      id: config.id,
      isActive: !config.isActive,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => { setEditingConfig(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            新建配置
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => { setEditingConfig(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          新建配置
        </Button>
      </div>

      {configs?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">暂无导入配置</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              创建第一个配置
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Stagger className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {configs?.map((config) => (
            <FadeIn key={config.id}>
              <ImportConfigCard
                config={config}
                onEdit={() => { setEditingConfig(config); setDialogOpen(true); }}
                onDelete={() => handleDelete(config.id)}
              />
            </FadeIn>
          ))}
        </Stagger>
      )}

      {/* 创建/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingConfig ? '编辑导入配置' : '新建导入配置'}</DialogTitle>
          </DialogHeader>
          <ImportConfigForm
            config={editingConfig}
            accounts={accounts}
            onSubmit={handleSubmit}
            onCancel={() => { setDialogOpen(false); setEditingConfig(null); }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 支持的导入类型列表
function ImportableTypesList() {
  const { data: types, isLoading } = useImportableTypes();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  return (
    <Stagger className="space-y-3">
      {types?.map((item) => (
        <FadeIn key={item.type}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{item.label}</p>
                    <div className="flex gap-1">
                      {item.supportedFormats.map((format) => (
                        <Badge key={format} variant="outline" style={{ fontSize: '10px' }}>
                          {format}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    示例：{item.example}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      ))}
    </Stagger>
  );
}

// 汇总卡片
function SummaryCards() {
  const { data: summary, isLoading } = useImportConfigSummary();

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const summaryItems = [
    {
      label: '支付宝',
      count: summary?.alipay.configCount || 0,
      lastImport: summary?.alipay.lastImportAt,
      color: '#1677FF',
      icon: <Smartphone className="h-5 w-5" />,
    },
    {
      label: '微信支付',
      count: summary?.wechat.configCount || 0,
      lastImport: summary?.wechat.lastImportAt,
      color: '#07C160',
      icon: <Smartphone className="h-5 w-5" />,
    },
    {
      label: '银行',
      count: summary?.bank.configCount || 0,
      lastImport: summary?.bank.lastImportAt,
      color: '#722ED1',
      icon: <Building2 className="h-5 w-5" />,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {summaryItems.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white"
                style={{ backgroundColor: item.color }}
              >
                {item.icon}
              </div>
              <div>
                <p className="text-2xl font-bold">{item.count}</p>
                <p className="text-sm text-muted-foreground">{item.label} 配置</p>
              </div>
            </div>
            {item.lastImport && (
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                最后导入：{new Date(item.lastImport).toLocaleDateString('zh-CN')}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// 主页面
export default function ImportConfig() {
  return (
    <MainLayout>
      <div style={{ gap: 'var(--spacing-xl)' }} className="flex flex-col">
        {/* 页面标题 */}
        <FadeIn>
          <h1 className="font-bold" style={{ fontSize: 'var(--font-size-headline)' }}>
            导入配置
          </h1>
          <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-body)', marginTop: 'var(--spacing-xs)' }}>
            配置支付宝、微信和银行账户的导入规则，方便批量导入账单
          </p>
        </FadeIn>

        {/* 汇总卡片 */}
        <FadeIn>
          <SummaryCards />
        </FadeIn>

        {/* 标签页 */}
        <Tabs defaultValue="configs" className="flex-1">
          <TabsList className="mb-4">
            <TabsTrigger value="configs">
              <Settings className="h-4 w-4 mr-2" />
              导入配置
            </TabsTrigger>
            <TabsTrigger value="types">
              <FileText className="h-4 w-4 mr-2" />
              支持的导入类型
            </TabsTrigger>
          </TabsList>

          <TabsContent value="configs">
            <ImportConfigList />
          </TabsContent>

          <TabsContent value="types">
            <Card>
              <CardHeader>
                <CardTitle>支持的导入类型</CardTitle>
                <CardDescription>
                  系统支持导入多种格式的账单和统计信息，您可以根据需要选择相应的导入方式
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ImportableTypesList />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
