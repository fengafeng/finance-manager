import { useState, useRef, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { FadeIn, Stagger } from '@/components/MotionPrimitives';
import { useNaturalAdd, useNaturalCreate } from '@/hooks/use-natural-add';
import { useAccountOptions } from '@/hooks/use-natural-add';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sparkles,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  ChevronRight,
  Calendar,
  Wallet,
  ArrowUpDown,
} from 'lucide-react';

// 解析结果类型
interface ParsedItem {
  id: string;
  module: 'account' | 'transaction' | 'fund' | 'loan';
  type: string;
  amount?: number;
  category?: string;
  description?: string;
  date?: string;
  accountId?: string;
  direction?: string;
  counterparty?: string;
  confidence: number;
  rawText: string;
  selected: boolean;
}

export default function NaturalAdd() {
  const [input, setInput] = useState('');
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const naturalAddMutation = useNaturalAdd();
  const naturalCreateMutation = useNaturalCreate();
  const accountOptions = useAccountOptions();

  // 解析文本
  const handleParse = async () => {
    if (!input.trim()) return;

    setError(null);
    setCreateSuccess(false);

    try {
      const result = await naturalAddMutation.mutateAsync(input);

      if (result.module === '') {
        setError('无法识别输入内容，请尝试更详细的描述');
        return;
      }

      // 创建解析结果项
      const newItem: ParsedItem = {
        id: Date.now().toString(),
        module: result.module,
        type: result.parsed?.type || '',
        amount: result.parsed?.amount,
        category: result.parsed?.category,
        description: result.parsed?.description,
        date: result.parsed?.transactionDate || result.parsed?.date,
        accountId: '',
        direction: result.parsed?.direction,
        counterparty: result.parsed?.counterparty,
        confidence: result.confidence,
        rawText: result.rawText,
        selected: true,
      };

      setParsedItems([newItem, ...parsedItems]);
      setInput('');
    } catch (err: any) {
      setError(err.message || '解析失败，请重试');
    }
  };

  // 更新解析项
  const updateItem = (id: string, updates: Partial<ParsedItem>) => {
    setParsedItems(items =>
      items.map(item => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  // 删除解析项
  const deleteItem = (id: string) => {
    setParsedItems(items => items.filter(item => item.id !== id));
  };

  // 批量创建
  const handleCreate = async () => {
    const selectedItems = parsedItems.filter(item => item.selected);
    if (selectedItems.length === 0) {
      setError('请至少选择一条记录');
      return;
    }

    setError(null);
    let successCount = 0;

    try {
      for (const item of selectedItems) {
        const createData: any = {
          ...item,
          id: undefined, // 移除 id
        };

        await naturalCreateMutation.mutateAsync({
          module: item.module,
          data: createData,
        });
        successCount++;
      }

      // 清空已创建的项
      setParsedItems(items => items.filter(item => !item.selected));
      setCreateSuccess(true);
      setTimeout(() => setCreateSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || `创建失败（成功 ${successCount} 条）`);
    }
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    const allSelected = parsedItems.every(item => item.selected);
    setParsedItems(items =>
      items.map(item => ({ ...item, selected: !allSelected }))
    );
  };

  return (
    <MainLayout>
      <div style={{ gap: 'var(--spacing-lg)' }} className="flex flex-col">
        {/* 页面标题 */}
        <FadeIn>
          <h1 className="font-bold" style={{ fontSize: 'var(--font-size-headline)' }}>
            智能添加
          </h1>
          <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-body)', marginTop: 'var(--spacing-xs)' }}>
            用自然语言描述您的财务操作，AI 智能识别并批量添加
          </p>
        </FadeIn>

        {/* 输入区域 */}
        <FadeIn>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                输入财务信息
              </CardTitle>
              <CardDescription>
                支持一次性输入多条记录，例如：
                <br />
                "今天在超市买了50元菜，用微信支付"
                <br />
                "昨天发了3000工资，转到招商银行"
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="输入您的财务操作描述..."
                  className="min-h-[100px] resize-none"
                  disabled={naturalAddMutation.isPending}
                />
              </div>
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={() => setInput('')}
                  disabled={!input || naturalAddMutation.isPending}
                >
                  清空
                </Button>
                <Button
                  onClick={handleParse}
                  disabled={!input.trim() || naturalAddMutation.isPending}
                >
                  {naturalAddMutation.isPending ? (
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
            </CardContent>
          </Card>
        </FadeIn>

        {/* 错误提示 */}
        {error && (
          <FadeIn>
            <Card className="border-destructive">
              <CardContent className="flex items-center gap-2 p-4 text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </CardContent>
            </Card>
          </FadeIn>
        )}

        {/* 成功提示 */}
        {createSuccess && (
          <FadeIn>
            <Card className="border-green-500 bg-green-50 dark:bg-green-950">
              <CardContent className="flex items-center gap-2 p-4 text-green-600 dark:text-green-400">
                <Check className="h-4 w-4" />
                批量创建成功！
              </CardContent>
            </Card>
          </FadeIn>
        )}

        {/* 解析结果列表 */}
        {parsedItems.length > 0 && (
          <FadeIn>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle>解析结果</CardTitle>
                    <Badge variant="secondary">{parsedItems.length} 条</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleSelectAll}
                    >
                      {parsedItems.every(item => item.selected) ? '取消全选' : '全选'}
                    </Button>
                    <Button
                      onClick={handleCreate}
                      disabled={naturalCreateMutation.isPending || !parsedItems.some(item => item.selected)}
                    >
                      {naturalCreateMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          创建中...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          创建选中 ({parsedItems.filter(item => item.selected).length})
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Stagger className="space-y-3">
                  {parsedItems.map((item) => (
                    <FadeIn key={item.id}>
                      <Card className={item.selected ? 'border-primary' : 'border-muted'}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {/* 选择框 */}
                            <button
                              onClick={() => updateItem(item.id, { selected: !item.selected })}
                              className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                item.selected
                                  ? 'bg-primary border-primary'
                                  : 'border-muted-foreground hover:border-primary'
                              }`}
                            >
                              {item.selected && <Check className="h-3 w-3 text-primary-foreground" />}
                            </button>

                            {/* 内容 */}
                            <div className="flex-1 space-y-3">
                              {/* 模块和置信度 */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">
                                    {item.module === 'transaction' && '交易'}
                                    {item.module === 'account' && '账户'}
                                    {item.module === 'fund' && '基金'}
                                    {item.module === 'loan' && '借款'}
                                  </Badge>
                                  <Badge
                                    variant={item.confidence >= 0.8 ? 'default' : 'secondary'}
                                    style={{ fontSize: '11px' }}
                                  >
                                    置信度: {Math.round(item.confidence * 100)}%
                                  </Badge>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => deleteItem(item.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>

                              {/* 详细信息 */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {item.amount !== undefined && (
                                  <div className="flex items-center gap-2">
                                    <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium">
                                      ¥{item.amount.toFixed(2)}
                                    </span>
                                  </div>
                                )}
                                {item.type && (
                                  <div className="flex items-center gap-2">
                                    <Badge variant={item.type === 'EXPENSE' ? 'destructive' : 'default'}>
                                      {item.type === 'EXPENSE' ? '支出' : item.type === 'INCOME' ? '收入' : item.type}
                                    </Badge>
                                  </div>
                                )}
                                {item.category && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">
                                      {item.category}
                                    </span>
                                  </div>
                                )}
                                {item.date && (
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{item.date}</span>
                                  </div>
                                )}
                              </div>

                              {item.description && (
                                <p className="text-sm text-muted-foreground">
                                  {item.description}
                                </p>
                              )}

                              {/* 账户选择 */}
                              {item.module === 'transaction' && (
                                <div className="flex items-center gap-2">
                                  <Wallet className="h-4 w-4 text-muted-foreground" />
                                  <Select
                                    value={item.accountId}
                                    onValueChange={(value) => updateItem(item.id, { accountId: value })}
                                  >
                                    <SelectTrigger className="w-[200px]">
                                      <SelectValue placeholder="选择账户" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {accountOptions.map((acc: any) => (
                                        <SelectItem key={acc.id} value={acc.id}>
                                          {acc.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </FadeIn>
                  ))}
                </Stagger>
              </CardContent>
            </Card>
          </FadeIn>
        )}

        {/* 空状态 */}
        {parsedItems.length === 0 && (
          <FadeIn>
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  在上方输入您的财务操作，AI 将智能识别并添加到系统中
                </p>
              </CardContent>
            </Card>
          </FadeIn>
        )}
      </div>
    </MainLayout>
  );
}
