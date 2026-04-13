import { useState, useRef, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { FadeIn, Stagger } from '@/components/MotionPrimitives';
import {
  useImportUpload,
  useImportPreview,
  useImportConfirm,
  CleanedTransaction,
  UploadResult,
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
  Loader2,
  X,
  RefreshCw,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

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

// ============================================================
// 步骤 1：上传文件
// ============================================================

function StepUpload({
  onUploaded,
}: {
  onUploaded: (sessionId: string, accountId: string) => void;
}) {
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
      toast.error('请选择要上传的账单文件');
      return;
    }
    if (!accountId) {
      toast.error('请先选择要导入到的账户');
      return;
    }

    try {
      const result = await uploadMutation.mutateAsync({
        file: selectedFile,
        accountId,
      });
      const sessionId = result.data?.sessionId || result.sessionId;
      if (sessionId) {
        onUploaded(sessionId, accountId);
        toast.success('账单解析成功');
      }
    } catch (err: any) {
      toast.error(err?.message || '上传失败');
    }
  };

  const isLoading = uploadMutation.isPending;

  return (
    <div className="space-y-6">
      {/* 提示信息 */}
      <FadeIn>
        <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>支持格式：</strong>支付宝 CSV 文件、微信支付 Excel 文件
          </p>
          <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
            <strong>自动清洗：</strong>退款记录、账户间转账将被标记，可在预览中查看
          </p>
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
                {acc.name} ({acc.type === 'ALIPAY' ? '支付宝' : acc.type === 'WECHAT' ? '微信' : '其他'})
              </option>
            ))}
          </select>
        </div>
      </FadeIn>

      {/* 文件拖放区 */}
      <FadeIn>
        <div
          className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
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
            accept=".csv,.xlsx,.xls"
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
                className="ml-4 p-1 hover:bg-muted rounded"
                onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="font-medium">拖拽账单文件到此处</p>
              <p className="text-sm text-muted-foreground mt-1">支持 CSV、Excel 格式</p>
            </>
          )}
        </div>
      </FadeIn>

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
  accountId,
  onBack,
  onConfirmed,
}: {
  sessionId: string;
  accountId: string;
  onBack: () => void;
  onConfirmed: (result: any) => void;
}) {
  const [importCleaned, setImportCleaned] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const { data, isLoading, error } = useImportPreview(sessionId);
  const confirmMutation = useImportConfirm();

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

  const result = data.data || data;
  const transactions: CleanedTransaction[] = result.transactions || [];
  const stats = result.stats || { total: 0, income: 0, expense: 0, cleanedByRefund: 0, cleanedByTransfer: 0, cleanedByDeposit: 0 };

  // 分离正常记录和清洗记录
  const normalTransactions = transactions.filter(t => !t.cleanType);
  const cleanedTransactions = transactions.filter(t => t.cleanType);
  const displayTransactions = showAll ? transactions : normalTransactions.slice(0, 30);

  const handleConfirm = async () => {
    try {
      const result = await confirmMutation.mutateAsync({
        sessionId,
        accountId,
        importCleaned,
      });
      const res = result.data || result;
      onConfirmed(res);
    } catch (err: any) {
      toast.error(err?.message || '导入失败');
    }
  };

  return (
    <div className="space-y-4">
      {/* 统计卡片 */}
      <FadeIn>
        <div className="grid grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">总记录</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-emerald-500">
                {stats.income.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">收入</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-red-500">
                {stats.expense.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">支出</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 dark:bg-amber-950/30">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-amber-600">
                {stats.cleanedByRefund + stats.cleanedByTransfer + stats.cleanedByDeposit}
              </p>
              <p className="text-xs text-muted-foreground">已清洗</p>
            </CardContent>
          </Card>
        </div>
      </FadeIn>

      {/* 清洗统计 */}
      {(stats.cleanedByRefund > 0 || stats.cleanedByTransfer > 0 || stats.cleanedByDeposit > 0) && (
        <FadeIn>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">自动清洗记录</p>
            <div className="flex gap-4 text-xs">
              {stats.cleanedByRefund > 0 && (
                <span className="text-amber-700 dark:text-amber-300">
                  退款: {stats.cleanedByRefund} 笔
                </span>
              )}
              {stats.cleanedByTransfer > 0 && (
                <span className="text-amber-700 dark:text-amber-300">
                  内部转账: {stats.cleanedByTransfer} 笔
                </span>
              )}
              {stats.cleanedByDeposit > 0 && (
                <span className="text-amber-700 dark:text-amber-300">
                  充值提现: {stats.cleanedByDeposit} 笔
                </span>
              )}
            </div>
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={importCleaned}
                onChange={(e) => setImportCleaned(e.target.checked)}
                className="rounded"
              />
              <span className="text-xs">同时导入清洗记录（用于统计）</span>
            </label>
          </div>
        </FadeIn>
      )}

      {/* 交易列表 */}
      <FadeIn>
        <p className="text-sm text-muted-foreground mb-2">
          预览前 {Math.min(30, normalTransactions.length)} 条记录（点击展开查看全部）
        </p>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {displayTransactions.map((tx: CleanedTransaction, idx: number) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              {/* 日期 */}
              <div className="w-20 shrink-0">
                <p className="text-xs">{formatDate(tx.date)}</p>
              </div>

              {/* 商家/描述 */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{tx.merchant || '-'}</p>
                {tx.description && (
                  <p className="text-xs text-muted-foreground truncate">{tx.description}</p>
                )}
              </div>

              {/* 分类 */}
              <div className="w-20 shrink-0">
                <Badge variant="outline" className="text-xs">
                  {tx.category || '其他'}
                </Badge>
              </div>

              {/* 金额 */}
              <div className={`w-24 text-right shrink-0 ${
                tx.type === 'INCOME' ? 'text-emerald-500' : 'text-red-500'
              }`}>
                <p className="font-medium text-sm">
                  {tx.type === 'INCOME' ? '+' : '-'}
                  {formatMoney(tx.amount)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {normalTransactions.length > 30 && !showAll && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2"
            onClick={() => setShowAll(true)}
          >
            <ChevronDown className="h-4 w-4 mr-2" />
            查看全部 {normalTransactions.length} 条记录
          </Button>
        )}
      </FadeIn>

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
              确认导入 {normalTransactions.length} 条记录
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

function StepComplete({
  result,
  onDone,
  onImportMore,
}: {
  result: any;
  onDone: () => void;
  onImportMore: () => void;
}) {
  const res = result.data || result;

  return (
    <div className="text-center py-8 space-y-4">
      <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
        <Check className="h-8 w-8 text-emerald-600" />
      </div>
      <div>
        <h2 className="text-xl font-bold">导入完成</h2>
        <p className="text-muted-foreground mt-2">
          成功导入 <span className="font-bold text-emerald-600">{res.importedCount}</span> 条记录
          {res.skippedCount > 0 && (
            <span className="text-muted-foreground">，跳过 {res.skippedCount} 条清洗记录</span>
          )}
        </p>
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
// 主页面
// ============================================================

type Step = 'upload' | 'preview' | 'complete';

export default function Import() {
  const [step, setStep] = useState<Step>('upload');
  const [sessionId, setSessionId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [importResult, setImportResult] = useState<any>(null);

  const handleUploaded = (id: string, accId: string) => {
    setSessionId(id);
    setAccountId(accId);
    setStep('preview');
  };

  const handleBack = () => {
    setStep('upload');
    setSessionId('');
    setAccountId('');
  };

  const handleConfirmed = (result: any) => {
    setImportResult(result);
    setStep('complete');
  };

  const handleDone = () => {
    setStep('upload');
    setSessionId('');
    setAccountId('');
    setImportResult(null);
  };

  const handleImportMore = () => {
    setStep('upload');
    setSessionId('');
    setAccountId('');
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
            导入支付宝、微信账单，自动清洗数据（剔除退款、内部转账）
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

        {/* 内容卡片 */}
        <FadeIn>
          <Card>
            <CardContent className="p-6">
              {step === 'upload' && (
                <StepUpload onUploaded={handleUploaded} />
              )}
              {step === 'preview' && sessionId && accountId && (
                <StepPreview
                  sessionId={sessionId}
                  accountId={accountId}
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
        </FadeIn>
      </div>
    </MainLayout>
  );
}
