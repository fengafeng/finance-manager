import { MainLayout } from '@/components/layout/MainLayout';
import { FadeIn } from '@/components/MotionPrimitives';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Database,
  Download,
  Upload,
  Trash2,
  Info,
  Shield,
} from 'lucide-react';

export default function SettingsPage() {
  return (
    <MainLayout>
      <div style={{ gap: 'var(--spacing-xl)' }} className="flex flex-col">
        {/* 页面标题 */}
        <FadeIn>
          <h1 className="font-bold" style={{ fontSize: 'var(--font-size-headline)' }}>
            系统设置
          </h1>
          <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-body)', marginTop: 'var(--spacing-xs)' }}>
            管理您的系统配置和数据
          </p>
        </FadeIn>

        {/* 数据管理 */}
        <FadeIn>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                数据管理
              </CardTitle>
              <CardDescription>
                导入、导出和管理您的财务数据
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium" style={{ fontSize: 'var(--font-size-label)' }}>
                    导出数据
                  </p>
                  <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                    将所有数据导出为 JSON 格式
                  </p>
                </div>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  导出
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium" style={{ fontSize: 'var(--font-size-label)' }}>
                    导入数据
                  </p>
                  <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                    从 JSON 文件导入数据
                  </p>
                </div>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  导入
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-destructive" style={{ fontSize: 'var(--font-size-label)' }}>
                    清空数据
                  </p>
                  <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                    删除所有数据（此操作不可恢复）
                  </p>
                </div>
                <Button variant="destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  清空
                </Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* 安全设置 */}
        <FadeIn>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                安全设置
              </CardTitle>
              <CardDescription>
                数据安全与隐私保护
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium" style={{ fontSize: 'var(--font-size-label)' }}>
                    数据加密
                  </p>
                  <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                    所有敏感数据已启用加密存储
                  </p>
                </div>
                <Badge variant="default">已启用</Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium" style={{ fontSize: 'var(--font-size-label)' }}>
                    本地存储
                  </p>
                  <p className="text-muted-foreground" style={{ fontSize: 'var(--font-size-small)' }}>
                    数据仅存储在本地，不会上传到云端
                  </p>
                </div>
                <Badge variant="default">已启用</Badge>
              </div>
            </CardContent>
          </Card>
        </FadeIn>

        {/* 关于 */}
        <FadeIn>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                关于
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground" style={{ fontSize: 'var(--font-size-label)' }}>版本</span>
                  <span style={{ fontSize: 'var(--font-size-label)' }}>1.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground" style={{ fontSize: 'var(--font-size-label)' }}>技术栈</span>
                  <span style={{ fontSize: 'var(--font-size-label)' }}>React + Express + PostgreSQL</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground" style={{ fontSize: 'var(--font-size-label)' }}>开发模式</span>
                  <span style={{ fontSize: 'var(--font-size-label)' }}>本地运行</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </MainLayout>
  );
}
