import { FadeIn } from '@/components/MotionPrimitives';
import { Bell, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Header() {
  return (
    <FadeIn className="flex items-center justify-between h-14 px-6 bg-card border-b border-border">
      <div className="flex items-center gap-2">
        <h1 className="font-semibold" style={{ fontSize: 'var(--font-size-title)' }}>
          个人财务管理系统
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Bell className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <User className="h-4 w-4" />
        </Button>
      </div>
    </FadeIn>
  );
}
