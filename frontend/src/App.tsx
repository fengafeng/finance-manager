import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route } from 'react-router-dom';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatedRoutes } from "@/components/AnimatedRoutes";
import { PageTransition } from "@/components/PageTransition";
import Dashboard from "./pages/Dashboard";
import Accounts from "./pages/Accounts";
import Transactions from "./pages/Transactions";
import Funds from "./pages/Funds";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NetWorth from "./pages/NetWorth";
import Health from "./pages/Health";
import Loans from "./pages/Loans";
import Recurring from "./pages/Recurring";
import Automation from "./pages/Automation";
import AIChat from "./pages/AIChat";
import NotFound from "./pages/NotFound";

/**
 * Configure TanStack Query client with optimized defaults
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data considered fresh for 1 minute
      staleTime: 60 * 1000,
      // Cache data for 5 minutes
      gcTime: 5 * 60 * 1000,
      // Retry failed requests once
      retry: 1,
      // Don't refetch on window focus by default
      refetchOnWindowFocus: false,
      // Don't refetch on reconnect by default
      refetchOnReconnect: false,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <AnimatedRoutes>
            <Route path="/" data-genie-title="数据看板" data-genie-key="Dashboard" element={<PageTransition transition="fade"><Dashboard /></PageTransition>} />
            <Route path="/accounts" data-genie-title="账户管理" data-genie-key="Accounts" element={<PageTransition transition="slide-up"><Accounts /></PageTransition>} />
            <Route path="/transactions" data-genie-title="交易流水" data-genie-key="Transactions" element={<PageTransition transition="slide-up"><Transactions /></PageTransition>} />
            <Route path="/funds" data-genie-title="基金持仓" data-genie-key="Funds" element={<PageTransition transition="slide-up"><Funds /></PageTransition>} />
            <Route path="/reports" data-genie-title="报表分析" data-genie-key="Reports" element={<PageTransition transition="slide-up"><Reports /></PageTransition>} />
            <Route path="/net-worth" data-genie-title="资产全景" data-genie-key="NetWorth" element={<PageTransition transition="slide-up"><NetWorth /></PageTransition>} />
            <Route path="/health" data-genie-title="财务健康" data-genie-key="Health" element={<PageTransition transition="slide-up"><Health /></PageTransition>} />
            <Route path="/loans" data-genie-title="贷款管理" data-genie-key="Loans" element={<PageTransition transition="slide-up"><Loans /></PageTransition>} />
            <Route path="/recurring" data-genie-title="定期账单" data-genie-key="Recurring" element={<PageTransition transition="slide-up"><Recurring /></PageTransition>} />
            <Route path="/automation" data-genie-title="自动化规则" data-genie-key="Automation" element={<PageTransition transition="slide-up"><Automation /></PageTransition>} />
            <Route path="/ai-chat" data-genie-title="AI助手" data-genie-key="AIChat" element={<PageTransition transition="slide-up"><AIChat /></PageTransition>} />
            <Route path="/settings" data-genie-title="系统设置" data-genie-key="Settings" element={<PageTransition transition="fade"><Settings /></PageTransition>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" data-genie-key="NotFound" data-genie-title="Not Found" element={<PageTransition transition="fade"><NotFound /></PageTransition>} />
          </AnimatedRoutes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App
