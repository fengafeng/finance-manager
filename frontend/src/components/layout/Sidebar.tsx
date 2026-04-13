import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { FadeIn } from '@/components/MotionPrimitives';
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  TrendingUp,
  PieChart,
  Settings,
  Menu,
  X,
  Activity,
  Heart,
  Landmark,
  CalendarClock,
  Bot,
  PiggyBank,
  Building2,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: '数据看板' },
  { path: '/net-worth', icon: Activity, label: '资产全景' },
  { path: '/health', icon: Heart, label: '财务健康' },
  { path: '/accounts', icon: Wallet, label: '账户管理' },
  { path: '/transactions', icon: Receipt, label: '交易流水' },
  { path: '/import', icon: Upload, label: '账单导入' },
  { path: '/funds', icon: TrendingUp, label: '投资管理' },
  { path: '/loans', icon: Landmark, label: '贷款管理' },
  { path: '/budgets', icon: PiggyBank, label: '月度预算' },
  { path: '/provident-funds', icon: Building2, label: '公积金账户' },
  { path: '/recurring', icon: CalendarClock, label: '定期账单' },
  { path: '/ai-chat', icon: Bot, label: 'AI助手' },
  { path: '/reports', icon: PieChart, label: '报表分析' },
  { path: '/settings', icon: Settings, label: '系统设置' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <FadeIn
      className={cn(
        'flex flex-col bg-card border-r border-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-border">
        {!collapsed && (
          <span className="font-semibold" style={{ fontSize: 'var(--font-size-title)' }}>
            财务管家
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8"
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span style={{ fontSize: 'var(--font-size-label)' }}>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </FadeIn>
  );
}
