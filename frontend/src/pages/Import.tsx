import { useState, useRef, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { FadeIn, Stagger } from '@/components/MotionPrimitives';
import {
  useImportUpload,
  useImportPreview,
  useImportConfirm,
  useImportHistory,
  downloadTemplate,
  ParsedTransaction,
  ImportSourceType,
} from '@/hooks/use-import';
import { useAccounts } from '@/hooks/use-accounts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Upload,
  FileSpreadsheet,
  Check,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Download,
  History,
  Loader2,
  X,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

// ============================================================
// 辅助函数
// ============================================================

function formatMoney(amount: number) {
  return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

const sourceTypeLabels: Record<ImportSourceType, { label: string; icon: string; desc: string }> = {
  ALIPAY: { label: '支付宝', icon: '💰', desc: '导出「明细记录」CSV 文件' },
  WECHAT: { label: '微信支付', icon: '💬', desc: '导出「交易记录」CSV 文件' },
  BANK: { label: '银行账单', icon: '🏦', desc: '导出银行流水 CSV 文件' },
  OTHER: { label: '其他', icon: '📄', desc: '导入其他格式的账单文件' },
};

const categoryOptions = [
  '餐饮', '交通', '购物', '娱乐', '居住', '通讯', '医疗', '教育', '工资', '奖金',
  '投资收益', '转账', '还款', '投资', '其他',
];

// 商家自动分类建议
const merchantCategoryMap: Record<string, string> = {
  '工资': '工资', '薪资': '工资',
  '奖金': '奖金', '年终奖': '奖金',
  '利息': '投资收益', '理财': '投资收益',
  '餐饮': '餐饮', '美食': '餐饮', '超市': '餐饮', '便利店': '餐饮',
  '饿了么': '餐饮', '美团': '餐饮', '肯德基': '餐饮', '麦当劳': '餐饮',
  '地铁': '交通', '公交': '交通', '打车': '交通', '滴滴': '交通', '停车': '交通',
  '淘宝': '购物', '天猫': '购物', '京东': '购物', '拼多多': '购物',
  '电影': '娱乐', '游戏': '娱乐', 'KTV': '娱乐',
  '房租': '居住', '物业': '居住', '水电': '居住',
  '话费': '通讯', '流量': '通讯',
  '医院': '医疗', '药店': '医疗',
  '学费': '教育', '培训': '教育', '课程': '教育',
};

function autoSuggestCategory(merchant: string): string {
  if (!merchant) return '其他';
  for (const [key, category] of Object.entries(merchantCategoryMap)) {
    if (merchant.includes(key)) return category;
  }
  return '其他';
}

// ============================================================
// 步骤 1：上传文件
// ============================================================

function StepUpload({
  onUploaded,
}: {
  onUploaded: (sessionId: string, info: any) => void;
}) {
  const [sourceType, setSourceType] = useState<ImportSourceType>('ALIPAY');
  const [accountId, setAccountId] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: accounts } = useAccounts();
  const uploadMutation = useImportUpload();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) setSelectedFile(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('请选择要上传的账单文件');
      return;
    }
    if (!accountId) {
      alert('请先选择要导入到的账户');
      return;
    }
    try {
      const result = await uploadMutation.mutateAsync({
        file: selectedFile,
        sourceType,
        accountId,
      });
      // API 返回格式: { success: true, data: { sessionId, ... } }
      const sessionId = result.data?.sessionId || result.sessionId;
      onUploaded(sessionId, result);
    } catch (err) {
      // 错误由 mutation 处理
    }
  };

  const isLoading = uploadMutation.isPending;
  const error = uploadMutation.error;

  return (
    <div className="space-y-6">
      {/* 来源选择 */}
      <FadeIn>
        <div className="space-y-3">
          <Label>账单来源</Label>
          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(sourceTypeLabels) as ImportSourceType[]).map((type) => {
              const info = sourceTypeLabels[type];
              return (
                <button
                  key={type}
                  onClick={() => setSourceType(type)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    sourceType === type
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="text-2xl mb-1">{info.icon}</div>
                  <div className="font-medium">{info.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{info.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      </FadeIn>

      {/* 账户选择 */}
      <FadeIn>
        <div className="space-y-2">
          <Label>导入到账户</Label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="">请选择账户</option>
            {accounts?.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>
          {!accounts?.length && (
            <p className="text-xs text-muted-foreground">
              请先在「账户管理」中添加对应类型的账户
            </p>
          )}
        </div>
      </FadeIn>

      {/* 文件拖放区 */}
      <FadeIn>
        <div
          className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-all ${
            isDragging
              ? 'border-primary bg-primary/5'
              : selectedFile
              ? 'border-primary/50 bg-muted/50'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={handleFileChange}
          />

          {selectedFile ? (
            <div className="flex items-center justify-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
              <div className="text-left">
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                className="ml-auto p-1 hover:bg-muted rounded"
                onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="font-medium">拖拽 CSV 文件到此处</p>
              <p className="text-sm text-muted-foreground mt-1">或点击选择文件</p>
            </>
          )}
        </div>
      </FadeIn>

      {/* 下载模板 */}
      <FadeIn className="flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => downloadTemplate(sourceType)}
        >
          <Download className="h-4 w-4 mr-2" />
          下载 {sourceTypeLabels[sourceType].label} 导入模板
        </Button>
      </FadeIn>

      {/* 错误提示 */}
      {error && (
        <FadeIn className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{String(uploadMutation.error)}</span>
        </FadeIn>
      )}

      {/* 上传按钮 */}
      <FadeIn>
        <Button
          className="w-full"
          size="lg"
          disabled={!selectedFile || !accountId || isLoading}
          onClick={handleUpload}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              解析中...
            </>
          ) : (
            <>
              上传并解析
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </FadeIn>
    </div>
  );
}

// ============================================================
// 步骤 2：预览确认
// ============================================================

function StepPreview({
  sessionId,
  onBack,
  onConfirmed,
}: {
  sessionId: string;
  onBack: () => void;
  onConfirmed: (result: any) => void;
}) {
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const { data, isLoading, error } = useImportPreview(sessionId);
  const confirmMutation = useImportConfirm();
  const [categoryOverrides, setCategoryOverrides] = useState<Record<number, string>>({});
  const [showAll, setShowAll] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
        <Skeleton className="h-12" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
        <p className="text-destructive">加载失败</p>
        <Button variant="outline" className="mt-4" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回重新上传
        </Button>
      </div>
    );
  }

  const transactions = data.transactions || [];
  const displayTransactions = showAll ? transactions : transactions.slice(0, 50);

  const handleConfirm = async () => {
    // 构建分类映射（只包含用户修改过的）
    const mapping: Record<string, string> = {};
    for (const [idx, cat] of Object.entries(categoryOverrides)) {
      const tx = transactions[parseInt(idx)];
      if (tx) mapping[tx.merchant] = cat;
    }

    try {
      const result = await confirmMutation.mutateAsync({
        sessionId,
        accountId: data.accountId,
        categoryMapping: mapping,
        skipDuplicates,
      });
      onConfirmed(result);
    } catch (err) {
      // 错误由 mutation 处理
    }
  };

  const confirmError = confirmMutation.error;

  return (
    <div className="space-y-4">
      {/* 统计卡片 */}
      <FadeIn>
        <div className="grid grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{data.totalCount}</p>
              <p className="text-xs text-muted-foreground">总记录</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-success">
                {transactions.filter((t: ParsedTransaction) => t.type === 'INCOME').length}
              </p>
              <p className="text-xs text-muted-foreground">收入</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-destructive">
                {transactions.filter((t: ParsedTransaction) => t.type === 'EXPENSE').length}
              </p>
              <p className="text-xs text-muted-foreground">支出</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-warning">
                {transactions.filter((t: ParsedTransaction) => t.status === 'refund').length}
              </p>
              <p className="text-xs text-muted-foreground">退款</p>
            </CardContent>
          </Card>
        </div>
      </FadeIn>

      {/* 时间范围 */}
      <FadeIn>
        <p className="text-sm text-muted-foreground text-center">
          账单时间范围：{transactions.length > 0 ? `${transactions[transactions.length - 1]?.date || '-'} ~ ${transactions[0]?.date || '-'}` : '-'}
        </p>
      </FadeIn>

      {/* 交易列表 */}
      <FadeIn>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {displayTransactions.map((tx: ParsedTransaction, idx: number) => {
            const suggestedCategory = autoSuggestCategory(tx.merchant);
            const selectedCategory = categoryOverrides[idx] ?? suggestedCategory;

            return (
              <div
                key={idx}
                className={`flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors ${
                  tx.status === 'refund' ? 'border border-warning/30' : ''
                }`}
              >
                {/* 日期 */}
                <div className="w-20 shrink-0">
                  <p className="text-xs">{formatDate(tx.date)}</p>
                </div>

                {/* 商家/描述 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{tx.merchant || tx.description || '-'}</p>
                  {tx.merchant && tx.description && tx.merchant !== tx.description && (
                    <p className="text-xs text-muted-foreground truncate">{tx.description}</p>
                  )}
                </div>

                {/* 分类选择 */}
                <div className="w-24 shrink-0">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setCategoryOverrides({ ...categoryOverrides, [idx]: e.target.value })}
                    className="w-full h-7 px-1 text-xs rounded border border-input bg-background"
                  >
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* 金额 */}
                <div className={`w-24 text-right shrink-0 ${
                  tx.type === 'INCOME' ? 'text-success' : 'text-destructive'
                }`}>
                  <p className="font-medium text-sm">
                    {tx.type === 'INCOME' ? '+' : '-'}
                    {formatMoney(tx.amount)}
                  </p>
                </div>

                {/* 标签 */}
                <div className="w-16 shrink-0">
                  {tx.status === 'refund' && (
                    <Badge variant="outline" className="text-warning border-warning text-xs">
                      退款
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {transactions.length > 50 && !showAll && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setShowAll(true)}
          >
            <ChevronDown className="h-4 w-4 mr-2" />
            查看全部 {transactions.length} 条记录
          </Button>
        )}
      </FadeIn>

      {/* 去重选项 */}
      <FadeIn>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={skipDuplicates}
            onChange={(e) => setSkipDuplicates(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">跳过与现有记录重复的交易</span>
        </label>
      </FadeIn>

      {/* 错误 */}
      {confirmError && (
        <FadeIn className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{String(confirmMutation.error)}</span>
        </FadeIn>
      )}

      {/* 操作按钮 */}
      <FadeIn className="flex gap-3">
        <Button variant="outline" onClick={onBack} disabled={confirmMutation.isPending}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          重新选择
        </Button>
        <Button
          className="flex-1"
          onClick={handleConfirm}
          disabled={confirmMutation.isPending}
        >
          {confirmMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              导入中...
            </>
          ) : (
            <>
              确认导入 {transactions.length} 条记录
              <Check className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </FadeIn>
    </div>
  );
}

// ============================================================
// 步骤 3：完成
// ============================================================

function StepComplete({ result, onDone, onImportMore }: { result: any; onDone: () => void; onImportMore: () => void }) {
  return (
    <div className="text-center py-8 space-y-4">
      <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
        <Check className="h-8 w-8 text-success" />
      </div>
      <div>
        <h2 className="text-xl font-bold">导入完成</h2>
        <p className="text-muted-foreground mt-2">
          成功导入 <span className="font-bold text-success">{result.successCount}</span> 条记录
          {result.skipCount > 0 && (
            <span className="text-muted-foreground">，跳过 {result.skipCount} 条重复记录</span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-6 max-w-md mx-auto">
        <div className="p-4 rounded-lg bg-muted/50">
          <p className="text-2xl font-bold">{result.totalCount}</p>
          <p className="text-xs text-muted-foreground">总记录</p>
        </div>
        <div className="p-4 rounded-lg bg-success/10">
          <p className="text-2xl font-bold text-success">{result.successCount}</p>
          <p className="text-xs text-muted-foreground">已导入</p>
        </div>
        <div className="p-4 rounded-lg bg-warning/10">
          <p className="text-2xl font-bold text-warning">{result.skipCount}</p>
          <p className="text-xs text-muted-foreground">已跳过</p>
        </div>
      </div>

      <div className="flex gap-3 justify-center mt-6">
        <Button variant="outline" onClick={onImportMore}>
          <RefreshCw className="h-4 w-4 mr-2" />
          继续导入
        </Button>
        <Button onClick={onDone}>
          <Check className="h-4 w-4 mr-2" />
          完成
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// 导入历史
// ============================================================

function ImportHistory() {
  const { data: records, isLoading } = useImportHistory();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  if (!records?.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>暂无导入记录</p>
      </div>
    );
  }

  return (
    <Stagger className="space-y-3">
      {records.map((record) => (
        <FadeIn key={record.id}>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {record.sourceType === 'IMPORT_ALIPAY' ? '💰' :
                     record.sourceType === 'IMPORT_WECHAT' ? '💬' : '🏦'}
                  </div>
                  <div>
                    <p className="font-medium">{record.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(record.createdAt).toLocaleString('zh-CN')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={record.status === 'COMPLETED' ? 'default' : 'destructive'}>
                    {record.status === 'COMPLETED' ? '完成' : '失败'}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    成功 {record.successCount} / 总计 {record.totalCount}
                  </p>
                </div>
              </div>
              {record.errorMessage && (
                <p className="text-xs text-destructive mt-2">{record.errorMessage}</p>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      ))}
    </Stagger>
  );
}

// ============================================================
// 主页面
// ============================================================

type Step = 'upload' | 'preview' | 'complete';

export default function Import() {
  const [step, setStep] = useState<Step>('upload');
  const [sessionId, setSessionId] = useState('');
  const [uploadInfo, setUploadInfo] = useState<any>(null);
  const [importResult, setImportResult] = useState<any>(null);

  const handleUploaded = (id: string, info: any) => {
    setSessionId(id);
    setUploadInfo(info);
    setStep('preview');
  };

  const handleBack = () => {
    setStep('upload');
    setSessionId('');
    setUploadInfo(null);
  };

  const handleConfirmed = (result: any) => {
    setImportResult(result);
    setStep('complete');
  };

  const handleDone = () => {
    setStep('upload');
    setSessionId('');
    setUploadInfo(null);
    setImportResult(null);
  };

  const handleImportMore = () => {
    setStep('upload');
    setSessionId('');
    setUploadInfo(null);
    setImportResult(null);
  };

  return (
    <MainLayout>
      <div style={{ gap: 'var(--spacing-xl)' }} className="flex flex-col">
        {/* 页面标题 */}
        <FadeIn>
          <h1 className="font-bold" style={{ fontSize: 'var(--font-size-headline)' }}>
            账单导入
          </h1>
          <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-body)', marginTop: 'var(--spacing-xs)' }}>
            导入支付宝、微信或银行账单，自动解析交易记录
          </p>
        </FadeIn>

        {/* 步骤指示器 */}
        {step !== 'complete' && (
          <FadeIn>
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className={`flex items-center gap-2 ${step === 'upload' ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step === 'upload' ? 'bg-primary text-primary-foreground' : 'bg-primary/20'
                }`}>
                  {step === 'preview' || step === 'complete' ? <Check className="h-4 w-4" /> : '1'}
                </div>
                <span className="text-sm font-medium">上传文件</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className={`flex items-center gap-2 ${step === 'preview' ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step === 'preview' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  2
                </div>
                <span className="text-sm font-medium">预览确认</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className={`flex items-center gap-2 ${step === 'complete' ? 'text-primary' : 'text-muted-foreground'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step === 'complete' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                }`}>
                  3
                </div>
                <span className="text-sm font-medium">完成</span>
              </div>
            </div>
          </FadeIn>
        )}

        {/* 标签页切换 */}
        <Tabs defaultValue="import" className="flex-1">
          <TabsList className="mb-4">
            <TabsTrigger value="import">导入账单</TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              导入历史
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import">
            <Card>
              <CardContent className="p-6">
                {step === 'upload' && (
                  <StepUpload onUploaded={handleUploaded} />
                )}
                {step === 'preview' && sessionId && (
                  <StepPreview
                    sessionId={sessionId}
                    onBack={handleBack}
                    onConfirmed={handleConfirmed}
                  />
                )}
                {step === 'complete' && importResult && (
                  <StepComplete
                    result={importResult}
                    onDone={handleDone}
                    onImportMore={handleImportMore}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardContent className="p-6">
                <ImportHistory />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
