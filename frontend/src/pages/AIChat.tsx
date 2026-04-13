import { useState, useRef, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { FadeIn } from '@/components/MotionPrimitives';
import { useAIChat, useQuickQuery } from '@/hooks/use-ai-chat';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Bot,
  Send,
  User,
  Sparkles,
  Wallet,
  TrendingUp,
  Landmark,
  PieChart,
  PiggyBank,
  Receipt,
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const quickActions = [
  { type: 'balance', label: '账户余额', icon: Wallet },
  { type: 'month_summary', label: '本月收支', icon: Receipt },
  { type: 'fund_status', label: '基金持仓', icon: TrendingUp },
  { type: 'loan_status', label: '贷款情况', icon: Landmark },
  { type: 'savings_rate', label: '储蓄率', icon: PiggyBank },
  { type: 'expense_analysis', label: '消费分析', icon: PieChart },
];

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatMutation = useAIChat();
  const quickQueryMutation = useQuickQuery();

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 发送消息
  const handleSend = async () => {
    if (!input.trim() || chatMutation.isPending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    try {
      // 准备历史消息
      const history = messages.slice(-10).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const result = await chatMutation.mutateAsync({
        message: userMessage.content,
        history,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，我遇到了一些问题，请稍后再试。',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  // 快捷查询
  const handleQuickQuery = async (type: string) => {
    if (quickQueryMutation.isPending) return;

    const action = quickActions.find((a) => a.type === type);
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: action?.label || '查询',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      const result = await quickQueryMutation.mutateAsync(type);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，查询失败，请稍后再试。',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  // 按Enter发送
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <MainLayout>
      <div style={{ gap: 'var(--spacing-lg)' }} className="flex flex-col h-[calc(100vh-4rem)]">
        <FadeIn className="flex items-center justify-between">
          <div>
            <h1 className="font-bold" style={{ fontSize: 'var(--font-size-headline)' }}>
              AI财务助手
            </h1>
            <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-body)', marginTop: 'var(--spacing-xs)' }}>
              智能对话，随时解答您的财务问题
            </p>
          </div>
        </FadeIn>

        {/* 快捷操作 */}
        {messages.length === 0 && (
          <FadeIn>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  快捷查询
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {quickActions.map((action) => (
                    <Button
                      key={action.type}
                      variant="outline"
                      className="flex flex-col items-center gap-2 h-auto py-4"
                      onClick={() => handleQuickQuery(action.type)}
                      disabled={quickQueryMutation.isPending}
                    >
                      <action.icon className="h-5 w-5" />
                      <span style={{ fontSize: 'var(--font-size-small)' }}>{action.label}</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        )}

        {/* 对话区域 */}
        <FadeIn className="flex-1 overflow-hidden">
          <Card className="h-full flex flex-col">
            <CardContent className="flex-1 overflow-y-auto p-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Bot className="h-16 w-16 mb-4 opacity-50" />
                  <p className="text-lg mb-2">您好，我是您的AI财务助手</p>
                  <p style={{ fontSize: 'var(--font-size-small)' }}>
                    您可以问我任何关于财务的问题，或使用上方的快捷查询
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="whitespace-pre-wrap" style={{ fontSize: 'var(--font-size-body)' }}>
                          {msg.content}
                        </p>
                      </div>
                      {msg.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                  {(chatMutation.isPending || quickQueryMutation.isPending) && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div className="bg-muted rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-3 w-3 rounded-full animate-bounce" />
                          <Skeleton className="h-3 w-3 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <Skeleton className="h-3 w-3 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </CardContent>
            
            {/* 输入区域 */}
            <div className="border-t p-4">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入您的财务问题..."
                  disabled={chatMutation.isPending || quickQueryMutation.isPending}
                  className="flex-1"
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || chatMutation.isPending || quickQueryMutation.isPending}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </FadeIn>
      </div>
    </MainLayout>
  );
}
