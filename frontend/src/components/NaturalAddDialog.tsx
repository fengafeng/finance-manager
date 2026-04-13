import { useState } from 'react';
import { useNaturalAdd, useNaturalCreate } from '@/hooks/use-natural-add';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import { Sparkles, Loader2, Check, AlertCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface NaturalAddDialogProps {
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function NaturalAddDialog({ trigger, defaultOpen = false, onOpenChange }: NaturalAddDialogProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [inputText, setInputText] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  const parseMutation = useNaturalAdd();
  const createMutation = useNaturalCreate();

  const [parsedResult, setParsedResult] = useState<any>(null);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
    if (!newOpen) {
      // 重置
      setTimeout(() => {
        setInputText('');
        setParsedResult(null);
        setSelectedAccountId('');
      }, 200);
    }
  };

  const handleParse = async () => {
    if (!inputText.trim()) return;
    const result = await parseMutation.mutateAsync(inputText);
    setParsedResult(result);

    // 如果是交易且有账户列表但没有自动匹配，先选第一个
    if (
      result.module === 'transaction' &&
      result.accounts?.length > 0 &&
      !result.parsed.accountId
    ) {
      setSelectedAccountId(result.accounts[0].id);
    }
  };

  const handleConfirm = async () => {
    if (!parsedResult) return;

    const dataToCreate = {
      ...parsedResult.parsed,
      // 交易需要指定账户
      ...(parsedResult.module === 'transaction' && selectedAccountId
        ? { accountId: selectedAccountId }
        : {}),
    };

    await createMutation.mutateAsync({
      module: parsedResult.module,
      data: dataToCreate,
    });

    // 成功后关闭并重置
    handleOpenChange(false);
  };

  const moduleLabels: Record<string, string> = {
    account: '📋 账户',
    transaction: '💰 交易',
    fund: '📊 投资',
    loan: '🏦 贷款',
  };

  const isLoading = parseMutation.isPending || createMutation.isPending;

  return (
    <>
      {trigger && (
        <span onClick={() => handleOpenChange(true)}>{trigger}</span>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              自然语言添加
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 输入区 */}
            {!parsedResult ? (
              <>
                <div className="space-y-2">
                  <Label>描述你要添加的内容</Label>
                  <Textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="例如：
• 添加一张工商银行卡，尾号6235
• 记录一笔500元的餐饮消费，今天
• 买入1000份中欧医疗基金
• 添加花呗，额度10000"
                    rows={4}
                    className="resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        handleParse();
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    按 Ctrl+Enter 快速解析
                  </p>
                </div>

                {parseMutation.error && (
                  <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    {String(parseMutation.error)}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button onClick={handleParse} disabled={!inputText.trim() || isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        解析中...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        智能解析
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <>
                {/* 解析结果确认区 */}
                <div className="space-y-3">
                  {/* 解析状态 */}
                  <div className="flex items-center gap-2 text-sm">
                    {parsedResult.ambiguous ? (
                      <AlertCircle className="h-4 w-4 text-warning" />
                    ) : (
                      <Check className="h-4 w-4 text-success" />
                    )}
                    <span className="text-muted-foreground">
                      识别为 {moduleLabels[parsedResult.module] || parsedResult.module}
                      {parsedResult.ambiguous && (
                        <span className="text-warning ml-1">（信息不完整，请确认）</span>
                      )}
                    </span>
                  </div>

                  {/* 解析出的信息 */}
                  <div className="p-3 bg-muted/50 rounded-lg space-y-1.5 text-sm">
                    {parsedResult.message.split('\n').map((line, i) => (
                      <p key={i} className={line.startsWith('📋') || line.startsWith('💰') || line.startsWith('📊') || line.startsWith('🏦') ? 'font-semibold' : ''}>
                        {line}
                      </p>
                    ))}
                  </div>

                  {/* 账户选择（仅交易需要） */}
                  {parsedResult.module === 'transaction' && parsedResult.accounts?.length > 0 && (
                    <div className="space-y-2">
                      <Label>选择账户</Label>
                      <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                        <SelectTrigger>
                          <SelectValue placeholder="选择账户" />
                        </SelectTrigger>
                        <SelectContent>
                          {parsedResult.accounts.map((acc: any) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {parsedResult.ambiguous && (
                    <div className="p-2 bg-warning/10 text-warning text-xs rounded">
                      ⚠️ 置信度较低，部分信息可能不准确，请核对后确认
                    </div>
                  )}
                </div>

                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setParsedResult(null)}
                    disabled={isLoading}
                  >
                    重新输入
                  </Button>
                  <Button onClick={handleConfirm} disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        创建中...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        确认创建
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
