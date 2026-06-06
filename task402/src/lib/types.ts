export type BountyStatus =
  | "draft"
  | "funding_required"
  | "open"
  | "claimed"
  | "running"
  | "submitted"
  | "verification_pending"
  | "accepted"
  | "rejected"
  | "expired"
  | "paid"
  | "refunded";

export type AgentRunStatus =
  | "pending"
  | "running"
  | "submitted"
  | "accepted"
  | "rejected"
  | "failed";

export type ToolCallStatus =
  | "payment_required"
  | "paid"
  | "succeeded"
  | "failed"
  | "blocked_by_policy";

export type SubmissionStatus = "pending" | "accepted" | "rejected";

export type SpendPolicy = {
  maxTotalSpendUsdc: number;
  maxPerRequestUsdc: number;
  allowedTools: string[];
  requireHumanApprovalAboveUsdc: number;
  manualApprovalRequired: boolean;
  minVerifierScore: number;
};

export type Bounty = {
  id: string;
  creatorId: string;
  creatorWallet?: string;
  title: string;
  description: string;
  category: string;
  deliverableFormat: string;
  verificationCriteria: string;
  budgetUsdc: string;
  maxToolSpendUsdc: string;
  deadline: string;
  allowedTools: string[];
  manualApprovalRequired: boolean;
  minVerifierScore: number;
  /** Networking: how the agent should reach the contacts it finds. */
  outreachMode?: "email" | "call" | "both" | "none";
  status: BountyStatus;
  escrowTxHash?: string;
  escrowOnChain?: boolean;
  /** Escrow → agent: reimbursement for the USDC the agent spent on x402 tools. */
  payoutTxHash?: string;
  payoutOnChain?: boolean;
  agentReimbursementUsdc?: string;
  /** Escrow → creator: unused budget returned (budget − toolSpend − platform fee). */
  refundTxHash?: string;
  refundOnChain?: boolean;
  creatorRefundUsdc?: string;
  /** Platform fee retained from escrow (a % of tool spend). */
  platformFeeUsdc?: string;
  createdAt: string;
  updatedAt: string;
};

export type ToolCall = {
  id: string;
  agentRunId: string;
  toolName: string;
  endpoint: string;
  priceUsdc: string;
  requestPayload?: unknown;
  responsePayload?: unknown;
  status: ToolCallStatus;
  paymentTxHash?: string;
  network?: string;
  createdAt: string;
};

export type AgentRun = {
  id: string;
  bountyId: string;
  agentWalletAddress?: string;
  status: AgentRunStatus;
  totalToolSpendUsdc: string;
  finalOutput?: string;
  verificationScore?: number;
  verificationNotes?: string;
  createdAt: string;
  updatedAt: string;
};

export type Submission = {
  id: string;
  bountyId: string;
  agentRunId: string;
  output: string;
  proofJson?: unknown;
  verificationScore?: number;
  verificationNotes?: string;
  status: SubmissionStatus;
  createdAt: string;
};

export type RunEventType =
  | "step"
  | "tool_call"
  | "payment"
  | "policy"
  | "output"
  | "verification"
  | "payout"
  | "status"
  | "error"
  | "done";

export type RunEvent = {
  id: string;
  runId: string;
  bountyId: string;
  type: RunEventType;
  message: string;
  data?: Record<string, unknown>;
  ts: string;
};
