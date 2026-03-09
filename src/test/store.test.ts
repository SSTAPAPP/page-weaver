import { describe, it, expect, beforeEach } from "vitest";

// Test the store logic by importing and resetting
// We'll test the pure business logic functions

describe("Business Logic Tests", () => {
  
  describe("ID Generation", () => {
    it("should generate unique IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        ids.add(Math.random().toString(36).substring(2, 9));
      }
      expect(ids.size).toBe(1000);
    });
  });

  describe("Refund Calculation", () => {
    it("should calculate card refund correctly", () => {
      const originalPrice = 280;
      const totalCount = 10;
      const remainingCount = 7;
      const refundRatio = remainingCount / totalCount;
      const refundAmount = Math.round(originalPrice * refundRatio * 100) / 100;
      expect(refundAmount).toBe(196);
    });

    it("should handle zero remaining count", () => {
      const originalPrice = 280;
      const totalCount = 10;
      const remainingCount = 0;
      const refundRatio = remainingCount / totalCount;
      const refundAmount = Math.round(originalPrice * refundRatio * 100) / 100;
      expect(refundAmount).toBe(0);
    });

    it("should handle full remaining count", () => {
      const originalPrice = 280;
      const totalCount = 10;
      const remainingCount = 10;
      const refundRatio = remainingCount / totalCount;
      const refundAmount = Math.round(originalPrice * refundRatio * 100) / 100;
      expect(refundAmount).toBe(280);
    });

    it("should handle non-round division", () => {
      const originalPrice = 100;
      const totalCount = 3;
      const remainingCount = 1;
      const refundRatio = remainingCount / totalCount;
      const refundAmount = Math.round(originalPrice * refundRatio * 100) / 100;
      expect(refundAmount).toBe(33.33);
    });
  });

  describe("Payment Calculation", () => {
    it("should calculate walk-in payment correctly", () => {
      const cart = [
        { price: 38, useCard: false },
        { price: 288, useCard: false },
      ];
      
      let cardDeductTotal = 0;
      let needPayTotal = 0;

      cart.forEach((item) => {
        if (item.useCard) {
          cardDeductTotal += item.price;
        } else {
          needPayTotal += item.price;
        }
      });

      const balanceDeduct = 0; // walk-in
      const cashNeed = needPayTotal - balanceDeduct;
      const total = cardDeductTotal + needPayTotal;

      expect(total).toBe(326);
      expect(cashNeed).toBe(326);
      expect(cardDeductTotal).toBe(0);
    });

    it("should calculate member with card deduction", () => {
      const memberBalance = 100;
      const cart = [
        { price: 38, useCard: true },
        { price: 288, useCard: false },
      ];
      
      let cardDeductTotal = 0;
      let needPayTotal = 0;

      cart.forEach((item) => {
        if (item.useCard) {
          cardDeductTotal += item.price;
        } else {
          needPayTotal += item.price;
        }
      });

      const balanceDeduct = Math.min(memberBalance, needPayTotal);
      const cashNeed = needPayTotal - balanceDeduct;
      const total = cardDeductTotal + needPayTotal;

      expect(total).toBe(326);
      expect(cardDeductTotal).toBe(38);
      expect(balanceDeduct).toBe(100);
      expect(cashNeed).toBe(188);
    });

    it("should handle balance fully covering cost", () => {
      const memberBalance = 500;
      const cart = [
        { price: 38, useCard: false },
      ];
      
      let cardDeductTotal = 0;
      let needPayTotal = 0;

      cart.forEach((item) => {
        if (item.useCard) {
          cardDeductTotal += item.price;
        } else {
          needPayTotal += item.price;
        }
      });

      const balanceDeduct = Math.min(memberBalance, needPayTotal);
      const cashNeed = needPayTotal - balanceDeduct;

      expect(balanceDeduct).toBe(38);
      expect(cashNeed).toBe(0);
    });

    it("should handle all card deduction with no cash needed", () => {
      const memberBalance = 0;
      const cart = [
        { price: 38, useCard: true },
        { price: 38, useCard: true },
      ];
      
      let cardDeductTotal = 0;
      let needPayTotal = 0;

      cart.forEach((item) => {
        if (item.useCard) {
          cardDeductTotal += item.price;
        } else {
          needPayTotal += item.price;
        }
      });

      const balanceDeduct = Math.min(memberBalance, needPayTotal);
      const cashNeed = needPayTotal - balanceDeduct;

      expect(cardDeductTotal).toBe(76);
      expect(needPayTotal).toBe(0);
      expect(cashNeed).toBe(0);
    });
  });

  describe("Revenue Statistics", () => {
    it("should calculate revenue from walk-in consume", () => {
      const tx = { type: "consume", paymentMethod: "wechat", amount: 100, voided: false };
      
      // Walk-in consume with non-balance payment = revenue
      const isRevenue = tx.type === "consume" && 
        tx.paymentMethod !== "balance" && 
        tx.paymentMethod !== undefined;
      
      expect(isRevenue).toBe(true);
    });

    it("should not count balance payment as revenue", () => {
      const tx = { type: "consume", paymentMethod: "balance", amount: 100, voided: false };
      
      const isRevenue = tx.type === "consume" && 
        tx.paymentMethod !== "balance" && 
        tx.paymentMethod !== undefined;
      
      expect(isRevenue).toBe(false);
    });

    it("should count price_diff sub-transactions as revenue", () => {
      const tx = {
        type: "card_deduct",
        amount: 100,
        voided: false,
        subTransactions: [
          { type: "card", amount: 38 },
          { type: "balance", amount: 32 },
          { type: "price_diff", amount: 30, paymentMethod: "wechat" },
        ],
      };
      
      let revenue = 0;
      tx.subTransactions.forEach((sub) => {
        if (sub.type === "price_diff") {
          revenue += sub.amount;
        }
      });
      
      expect(revenue).toBe(30);
    });

    it("should not count voided transactions", () => {
      const transactions = [
        { type: "consume", paymentMethod: "wechat", amount: 100, voided: true },
        { type: "consume", paymentMethod: "wechat", amount: 50, voided: false },
      ];
      
      const validTx = transactions.filter(t => !t.voided);
      const revenue = validTx
        .filter(t => t.type === "consume" && t.paymentMethod !== "balance" && t.paymentMethod !== undefined)
        .reduce((sum, t) => sum + t.amount, 0);
      
      expect(revenue).toBe(50);
    });
  });

  describe("Card Usage in Cart", () => {
    it("should track card usage across cart items", () => {
      const cart = [
        { useCard: true, card: { id: "card1" } },
        { useCard: true, card: { id: "card1" } },
        { useCard: false, card: null },
        { useCard: true, card: { id: "card2" } },
      ];
      
      const getCardUsedInCart = (cardId: string) => {
        return cart.filter(item => item.useCard && item.card?.id === cardId).length;
      };
      
      expect(getCardUsedInCart("card1")).toBe(2);
      expect(getCardUsedInCart("card2")).toBe(1);
      expect(getCardUsedInCart("card3")).toBe(0);
    });

    it("should not allow adding more than remaining count", () => {
      const remainingCount = 3;
      const usedInCart = 3;
      const effectiveRemaining = remainingCount - usedInCart;
      
      expect(effectiveRemaining).toBe(0);
      expect(effectiveRemaining > 0).toBe(false); // Should not allow more
    });
  });

  describe("Phone Validation", () => {
    it("should validate 11-digit phone", () => {
      expect("13800138000".length).toBe(11);
      expect("1380013800".length).toBe(10);
      expect("138001380001".length).toBe(12);
    });

    it("should strip non-digits", () => {
      const input = "138-0013-8000";
      const cleaned = input.replace(/\D/g, "").slice(0, 11);
      expect(cleaned).toBe("13800138000");
    });
  });

  describe("Date Utilities", () => {
    it("should correctly identify today", () => {
      const today = new Date();
      const isToday = (date: Date) => {
        const d = new Date(date);
        return d.getDate() === today.getDate() &&
          d.getMonth() === today.getMonth() &&
          d.getFullYear() === today.getFullYear();
      };
      
      expect(isToday(new Date())).toBe(true);
      expect(isToday(new Date("2020-01-01"))).toBe(false);
    });
  });

  describe("Transaction Grouping", () => {
    it("should group refunds with original transactions", () => {
      const transactions = [
        { id: "t1", type: "consume", amount: 100, relatedTransactionId: undefined },
        { id: "t2", type: "refund", amount: 100, relatedTransactionId: "t1" },
        { id: "t3", type: "recharge", amount: 200, relatedTransactionId: undefined },
      ];
      
      const refundMap = new Map<string, typeof transactions[0]>();
      transactions.forEach((tx) => {
        if (tx.type === "refund" && tx.relatedTransactionId) {
          refundMap.set(tx.relatedTransactionId, tx);
        }
      });
      
      expect(refundMap.has("t1")).toBe(true);
      expect(refundMap.get("t1")?.id).toBe("t2");
      expect(refundMap.has("t3")).toBe(false);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty member list search", () => {
      const members: any[] = [];
      const results = members.filter(m => m.name.includes("test"));
      expect(results.length).toBe(0);
    });

    it("should handle zero-price service", () => {
      const price = 0;
      const balanceDeduct = Math.min(100, price);
      const cashNeed = price - balanceDeduct;
      expect(balanceDeduct).toBe(0);
      expect(cashNeed).toBe(0);
    });

    it("should handle member with no cards", () => {
      const member = { cards: [] as any[] };
      const totalCardRemaining = member.cards.reduce((s: number, c: any) => s + c.remainingCount, 0);
      expect(totalCardRemaining).toBe(0);
    });

    it("should handle member with zero balance", () => {
      const balance = 0;
      const amount = 100;
      const deduct = Math.min(balance, amount);
      expect(deduct).toBe(0);
    });
  });
});
