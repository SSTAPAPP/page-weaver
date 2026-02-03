import { Member, Transaction, MemberCard } from "@/types";

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  type: 'balance_mismatch' | 'card_count_invalid' | 'duplicate_member' | 'orphan_card' | 'transaction_inconsistency';
  severity: 'error' | 'warning';
  description: string;
  memberId?: string;
  memberName?: string;
  details?: Record<string, unknown>;
}

export const dataValidator = {
  /**
   * Validate balance consistency between member balance and transaction history
   */
  validateBalances(members: Member[], transactions: Transaction[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const member of members) {
      // Calculate expected balance from transactions
      const memberTxs = transactions.filter(t => t.memberId === member.id && !t.voided);
      
      let calculatedBalance = 0;
      for (const tx of memberTxs) {
        if (tx.type === 'recharge') {
          calculatedBalance += tx.amount;
        } else if (tx.type === 'consume' && tx.paymentMethod === 'balance') {
          calculatedBalance -= tx.amount;
        } else if (tx.type === 'refund') {
          // Refunds from card deletion add to balance
          if (tx.description?.includes('退卡')) {
            calculatedBalance += tx.amount;
          }
        }
        // Handle subTransactions
        if (tx.subTransactions) {
          for (const sub of tx.subTransactions) {
            if (sub.type === 'balance') {
              calculatedBalance -= sub.amount;
            }
          }
        }
      }

      // Allow small rounding differences
      if (Math.abs(member.balance - calculatedBalance) > 0.01) {
        issues.push({
          type: 'balance_mismatch',
          severity: 'warning',
          description: `会员 ${member.name} 的余额不一致：当前余额 ¥${member.balance.toFixed(2)}，计算余额 ¥${calculatedBalance.toFixed(2)}`,
          memberId: member.id,
          memberName: member.name,
          details: {
            currentBalance: member.balance,
            calculatedBalance,
            difference: member.balance - calculatedBalance,
          },
        });
      }
    }

    return issues;
  },

  /**
   * Validate card usage against transactions
   */
  validateCardUsage(members: Member[], transactions: Transaction[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    for (const member of members) {
      for (const card of member.cards) {
        // Count card deductions from transactions
        const cardDeductions = transactions.filter(
          t => t.memberId === member.id && 
               !t.voided && 
               t.type === 'card_deduct'
        );

        // Also count from subTransactions
        let subTxCardDeductions = 0;
        transactions.forEach(tx => {
          if (tx.memberId === member.id && !tx.voided && tx.subTransactions) {
            tx.subTransactions.forEach(sub => {
              if (sub.type === 'card' && sub.cardId === card.id) {
                subTxCardDeductions++;
              }
            });
          }
        });

        // Validate remaining count is within bounds
        if (card.remainingCount < 0) {
          issues.push({
            type: 'card_count_invalid',
            severity: 'error',
            description: `会员 ${member.name} 的次卡 "${card.templateName}" 剩余次数为负数 (${card.remainingCount})`,
            memberId: member.id,
            memberName: member.name,
            details: { cardId: card.id, remainingCount: card.remainingCount },
          });
        }

        if (card.remainingCount > card.originalTotalCount) {
          issues.push({
            type: 'card_count_invalid',
            severity: 'error',
            description: `会员 ${member.name} 的次卡 "${card.templateName}" 剩余次数 (${card.remainingCount}) 超过原始总次数 (${card.originalTotalCount})`,
            memberId: member.id,
            memberName: member.name,
            details: { cardId: card.id, remainingCount: card.remainingCount, originalTotalCount: card.originalTotalCount },
          });
        }
      }
    }

    return issues;
  },

  /**
   * Check for duplicate members (same phone number)
   */
  findDuplicateMembers(members: Member[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const phoneMap = new Map<string, Member[]>();

    for (const member of members) {
      const existing = phoneMap.get(member.phone) || [];
      existing.push(member);
      phoneMap.set(member.phone, existing);
    }

    for (const [phone, duplicates] of phoneMap) {
      if (duplicates.length > 1) {
        issues.push({
          type: 'duplicate_member',
          severity: 'error',
          description: `发现重复手机号 ${phone}，涉及会员：${duplicates.map(m => m.name).join(', ')}`,
          details: { phone, memberIds: duplicates.map(m => m.id) },
        });
      }
    }

    return issues;
  },

  /**
   * Find orphan records
   */
  findOrphanRecords(members: Member[], transactions: Transaction[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const memberIds = new Set(members.map(m => m.id));

    // Find transactions for non-existent members (excluding walk-ins)
    for (const tx of transactions) {
      if (!tx.memberId.startsWith('walk-in') && !memberIds.has(tx.memberId)) {
        issues.push({
          type: 'transaction_inconsistency',
          severity: 'warning',
          description: `交易记录 ${tx.id} 引用了不存在的会员 ID: ${tx.memberId} (${tx.memberName})`,
          details: { transactionId: tx.id, memberId: tx.memberId },
        });
      }
    }

    return issues;
  },

  /**
   * Run all validations
   */
  validateAll(members: Member[], transactions: Transaction[]): ValidationResult {
    const issues: ValidationIssue[] = [
      ...this.validateBalances(members, transactions),
      ...this.validateCardUsage(members, transactions),
      ...this.findDuplicateMembers(members),
      ...this.findOrphanRecords(members, transactions),
    ];

    return {
      valid: issues.filter(i => i.severity === 'error').length === 0,
      issues,
    };
  },

  /**
   * Auto-fix balance mismatches by recalculating
   */
  recalculateBalance(member: Member, transactions: Transaction[]): number {
    const memberTxs = transactions.filter(t => t.memberId === member.id && !t.voided);
    
    let balance = 0;
    for (const tx of memberTxs) {
      if (tx.type === 'recharge') {
        balance += tx.amount;
      } else if (tx.type === 'consume' && tx.paymentMethod === 'balance') {
        balance -= tx.amount;
      } else if (tx.type === 'refund' && tx.description?.includes('退卡')) {
        balance += tx.amount;
      }
      if (tx.subTransactions) {
        for (const sub of tx.subTransactions) {
          if (sub.type === 'balance') {
            balance -= sub.amount;
          }
        }
      }
    }

    return Math.max(0, balance);
  },
};
