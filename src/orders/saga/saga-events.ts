export type SagaEvent =
  | { type: 'BudgetGenerated'; orderId: string; total: number }
  | { type: 'BudgetFailed'; orderId: string; reason: string }
  | { type: 'BudgetApproved'; orderId: string }
  | { type: 'BudgetRejected'; orderId: string }
  | { type: 'PaymentConfirmed'; orderId: string; paymentId: string }
  | { type: 'PaymentFailed'; orderId: string; reason?: string }
  | { type: 'ExecutionQueued'; orderId: string }
  | { type: 'StockUnavailable'; orderId: string; paymentId: string }
  | { type: 'ExecutionFinished'; orderId: string };

export interface BudgetItem {
  kind: 'SERVICE' | 'PART';
  referenceId: string;
  quantity: number;
  unitPrice: number;
}

export interface BudgetRequest {
  items: BudgetItem[];
  total: number;
}

export const SagaCommands = {
  GENERATE_BUDGET: 'billing.GenerateBudget',
  CREATE_PAYMENT: 'billing.CreatePayment',
  REFUND_PAYMENT: 'billing.RefundPayment',
  RESERVE_AND_ENQUEUE: 'execution.ReserveAndEnqueue',
} as const;
