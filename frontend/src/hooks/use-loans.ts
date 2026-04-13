import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { Loan, PrepaySimulation, PaymentScheduleItem, LoanType, LoanDirection, LoanStatus } from '@/types';

interface CreateLoanData {
  name: string;
  loanType: LoanType;
  principal: number;
  remainingPrincipal?: number;
  annualRate: number;
  startDate: string;
  endDate?: string | null;
  paymentDay?: number;
  monthlyPayment?: number;
  linkedAccountId?: string;
  autoTrackRepayment?: boolean;
  // 借款扩展
  direction?: LoanDirection;
  counterparty?: string;
  loanDate?: string;
  dueDate?: string;
  status?: LoanStatus;
  remark?: string;
}

interface UpdateLoanData {
  id: string;
  name?: string;
  remainingPrincipal?: number;
  annualRate?: number;
  monthlyPayment?: number;
  linkedAccountId?: string | null;
  autoTrackRepayment?: boolean;
  // 借款扩展
  direction?: LoanDirection | null;
  counterparty?: string | null;
  loanDate?: string | null;
  dueDate?: string | null;
  status?: LoanStatus;
  remark?: string | null;
}

// 获取贷款列表
export function useLoans() {
  return useQuery({
    queryKey: ['loans'],
    queryFn: async () => {
      const { data } = await apiClient.post<{ success: boolean; data: Loan[] }>('/loans/list');
      return data.data;
    },
  });
}

// 获取贷款详情
export function useLoan(id: string) {
  return useQuery({
    queryKey: ['loans', id],
    queryFn: async () => {
      const { data } = await apiClient.post<{ success: boolean; data: Loan }>('/loans/get', { id });
      return data.data;
    },
    enabled: !!id,
  });
}

// 创建贷款
export function useCreateLoan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (loanData: CreateLoanData) => {
      const { data } = await apiClient.post<{ success: boolean; data: Loan }>('/loans/create', loanData);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
  });
}

// 更新贷款
export function useUpdateLoan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (loanData: UpdateLoanData) => {
      const { data } = await apiClient.post<{ success: boolean; data: Loan }>('/loans/update', loanData);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
  });
}

// 删除贷款
export function useDeleteLoan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.post('/loans/delete', { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
  });
}

// 获取还款计划
export function usePaymentSchedule(id: string) {
  return useQuery({
    queryKey: ['loans', id, 'schedule'],
    queryFn: async () => {
      const { data } = await apiClient.post<{
        success: boolean;
        data: {
          loan: Loan;
          schedule: PaymentScheduleItem[];
          totalInterest: number;
          totalPayment: number;
        };
      }>('/loans/payment-schedule', { id });
      return data.data;
    },
    enabled: !!id,
  });
}

// 提前还款模拟
export function usePrepaySimulate() {
  return useMutation({
    mutationFn: async (params: { id: string; prepayAmount: number; mode: 'shorten_term' | 'reduce_payment' }) => {
      const { data } = await apiClient.post<{ success: boolean; data: PrepaySimulation }>(
        '/loans/prepay-simulate',
        params
      );
      return data.data;
    },
  });
}
