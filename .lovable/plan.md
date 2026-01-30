
# FFk - Final Delivery Implementation Plan

## Overview
This plan addresses 11 critical issues to deliver a production-ready barber shop management system with complete data integrity, security improvements, and UI optimizations.

---

## Issue 1: Member Detail Transaction Display - Consumption & Refund Grouping

**Problem**: Transaction records in member detail dialog don't group related consumption and refund records together like the main Transactions page does.

**Solution**:
- Implement the same `GroupedTransaction` logic from `Transactions.tsx` into `MemberDetailDialog.tsx`
- Display consumption and refund as a unified block with the refund appearing as a linked sub-record
- Style matches the main transaction list: voided records with strikethrough, "已作废" badge, 50% opacity

**Technical Changes**:
- Import grouping logic from store or reimplement in the component
- Render grouped transaction items with the linked refund visually attached

**Files to Modify**:
- `src/components/dialogs/MemberDetailDialog.tsx`

---

## Issue 2: Price Difference Tracking for Manual Refunds

**Problem**: When refunding transactions with `price_diff` sub-transactions, there's no clear tracking mechanism to remind users about the manual cash/payment refund.

**Solution**:
- Add a distinct visual indicator in the refund dialog showing that price_diff requires manual action
- Store a `manualRefundRequired` flag or display prominently in the refund transaction description
- Add a reminder section after successful refund showing exactly what needs to be manually refunded

**Technical Changes**:
- Update `TransactionRefundDialog.tsx` to show explicit manual refund tracking
- Update refund transaction description to include clear notation of manual refund requirement

**Files to Modify**:
- `src/components/dialogs/TransactionRefundDialog.tsx`

---

## Issue 3: Fix Cart Card Usage Counting Bug (Card Already Used in Cart)

**Problem**: When adding multiple services that use the same card, each shows the original remaining count instead of accounting for other cart items using that card.

**Example**:
- Card has 2 remaining uses
- Add service 1 → Shows "剩2次" ✓
- Add service 2 → Still shows "剩2次" ✗ (should show "剩1次" or prevent)

**Solution**:
- Track card usage across all cart items before displaying remaining count
- Calculate `effectiveRemainingCount = card.remainingCount - timesUsedInCart`
- Prevent adding if effectiveRemainingCount would go to 0 or below

**Technical Changes**:
```text
1. In addToCart function:
   - Count how many times this cardId is already used in cart
   - Only allow card usage if (card.remainingCount - cartUsageCount) > 0
   
2. In cart display:
   - Show effective remaining count: card.remainingCount - cartUsageCountForThisCard
```

**Files to Modify**:
- `src/pages/Cashier.tsx`

---

## Issue 4: Card Refund with Deleted Template (Price = 0 Bug)

**Problem**: If a card template is deleted, `MemberDeleteWithRefundDialog` calculates refund as `0` because `template?.price` is undefined.

**Solution**:
- Store the original price on the `MemberCard` itself when purchased
- Fallback to stored price if template is deleted
- Update `MemberCard` interface to include `originalPrice` and `originalTotalCount`

**Technical Changes**:
- Add `originalPrice: number` and `originalTotalCount: number` to `MemberCard` interface
- When creating a card in `addCardToMember`, store these values
- In `MemberDeleteWithRefundDialog`, use `card.originalPrice` as fallback

**Files to Modify**:
- `src/types/index.ts` - Add fields to MemberCard
- `src/stores/useStore.ts` - Store originalPrice/originalTotalCount when creating card
- `src/components/dialogs/MemberDeleteWithRefundDialog.tsx` - Use fallback values

---

## Issue 5: Search Result Limit Optimization

**Problem**: Search results are limited to 5 items. If the target member is at position 6+, they cannot be found.

**Solution**:
- Increase search result limit to 10 or remove limit entirely
- Add pagination or "show more" option if list gets too long
- Alternative: Keep limit but add a scroll container for results

**Technical Changes**:
- Remove `.slice(0, 5)` or increase to `.slice(0, 10)`
- Ensure the search result container has proper max-height with scrolling

**Files to Modify**:
- `src/pages/Cashier.tsx` - Line 57
- `src/components/dialogs/QuickRechargeDialog.tsx` - Similar search logic
- `src/components/dialogs/NewAppointmentDialog.tsx` - If applicable

---

## Issue 6: Unified Search Placeholder & Optimized Search Dropdown Display

**Problem**: 
1. Different search placeholders across pages
2. Search results stack infinitely, taking up too much screen space

**Solution**:
- Standardize all search placeholders to: "输入姓名或手机号搜索"
- Add `max-h-[200px] overflow-auto` to all search result containers
- Ensure results don't overflow page boundaries

**Technical Changes**:
- Update placeholder text in all search inputs
- Add scroll container styling to search dropdowns

**Files to Modify**:
- `src/pages/Cashier.tsx`
- `src/pages/Members.tsx`
- `src/pages/Transactions.tsx`
- `src/components/dialogs/QuickRechargeDialog.tsx`
- `src/components/dialogs/NewAppointmentDialog.tsx`

---

## Issue 7: Window/Container Overflow Optimization

**Problem**: Some content/containers overflow their boundaries on smaller screens or with many items.

**Solution**:
- Add `overflow-hidden` or `overflow-auto` to parent containers
- Ensure all dialogs have `max-h-[85vh]` and proper ScrollArea
- Add `min-w-0` to flex children to prevent text overflow
- Check all Card components for proper overflow handling

**Technical Changes**:
- Review and fix overflow in all page layouts
- Ensure all dialogs are properly bounded
- Add truncate classes where needed

**Files to Modify**:
- Various pages and dialog components
- Focus on: Dashboard, Transactions, Members, all dialogs

---

## Issue 8: Transaction Pagination Enhancement

**Problem**: Transaction list has `MAX_PAGES = 5` (40 records total). Long-term use will make older transactions inaccessible.

**Solution**:
- Remove the `MAX_PAGES` limit or increase significantly
- Implement proper pagination with page number input for jumping
- Show total count and current range (e.g., "显示 1-8 / 共 156 条")

**Technical Changes**:
- Remove or modify `MAX_PAGES = 5` constraint
- Allow pagination to show all pages or implement "jump to page" feature
- Update UI to show total count and range

**Files to Modify**:
- `src/pages/Transactions.tsx`

---

## Issue 9: Walk-in Customer ID Improvement

**Problem**: All walk-in customers use hardcoded `memberId: "walk-in"`, making it impossible to differentiate or track individual walk-in visits.

**Solution**:
- Generate unique IDs for each walk-in transaction: `walk-in-{timestamp}-{random}`
- Keep `memberName: "散客"` for display purposes
- This allows future analytics on walk-in transactions

**Technical Changes**:
```text
Replace:
  memberId: "walk-in"
With:
  memberId: `walk-in-${Date.now()}-${generateId()}`
```

**Files to Modify**:
- `src/pages/Cashier.tsx` - Lines 230, 239

---

## Issue 10: Admin Password Security Enhancement

**Problem**: Admin password is stored in plain text in localStorage via Zustand persist.

**Solution**:
- Hash the password before storing (using a simple client-side hash)
- Use SHA-256 or similar via Web Crypto API
- Compare hashed values during verification

**Technical Changes**:
- Add password hashing utility function
- Hash password when setting via `setAdminPassword`
- Hash input when verifying in all password dialogs
- Migrate existing plain password on first comparison

**Note**: True security requires server-side handling, but client-side hashing is better than plaintext.

**Files to Create/Modify**:
- `src/lib/crypto.ts` (new) - Hash utility functions
- `src/stores/useStore.ts` - Use hashed password storage
- `src/components/dialogs/AdminPasswordDialog.tsx` - Hash before compare
- `src/pages/Settings.tsx` - Hash when changing password
- All other dialogs with password verification

---

## Issue 11: Phone Uniqueness Validation & Better ID Generation

**Problem**: 
1. Editing a member's phone doesn't check for uniqueness (could create duplicates)
2. `generateId()` uses simple random which has collision risk

**Solution**:
- Add phone uniqueness check in `updateMember` validation (except for the current member)
- Improve ID generation to use timestamp + random for lower collision risk

**Technical Changes**:
```text
1. Phone validation:
   - In MemberDetailDialog handleSaveEdit, check if new phone exists for other members
   
2. Better ID generation:
   const generateId = () => {
     const timestamp = Date.now().toString(36);
     const random = Math.random().toString(36).substring(2, 7);
     return `${timestamp}-${random}`;
   };
```

**Files to Modify**:
- `src/stores/useStore.ts` - Improve generateId
- `src/components/dialogs/MemberDetailDialog.tsx` - Add phone uniqueness check

---

## Additional Discovered Issues

### A. Member Detail Pagination
- Transaction list in member detail should have pagination or "load more" instead of fixed 20 items

### B. Validation Consistency
- Ensure all forms have consistent validation and error states

### C. Loading States
- Verify all async operations have proper loading indicators

---

## Implementation Order

1. **Issue 9**: Walk-in ID improvement (simple, foundation)
2. **Issue 11**: ID generation + phone validation (security + data integrity)
3. **Issue 10**: Password hashing (security)
4. **Issue 4**: Card template deletion handling (data integrity)
5. **Issue 3**: Cart card counting fix (critical bug)
6. **Issue 5 & 6**: Search improvements (UX)
7. **Issue 7**: Overflow optimization (UI polish)
8. **Issue 8**: Transaction pagination (UX)
9. **Issue 2**: Price diff tracking (feature enhancement)
10. **Issue 1**: Member transaction grouping (visual consistency)

---

## Technical Details

### Password Hashing Implementation

```text
// src/lib/crypto.ts
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'ffk-salt-2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

### Cart Card Usage Tracking

```text
const getCardUsageInCart = (cardId: string) => {
  return cart.filter(item => item.useCard && item.card?.id === cardId).length;
};

// When displaying:
const effectiveRemaining = card.remainingCount - getCardUsageInCart(card.id);
```

### Improved ID Generator

```text
const generateId = () => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 7);
  return `${timestamp}-${random}`;
};
```

---

## Files Summary

### Files to Create:
- `src/lib/crypto.ts` - Password hashing utilities

### Files to Modify:
- `src/types/index.ts` - Add originalPrice/originalTotalCount to MemberCard
- `src/stores/useStore.ts` - ID generation, card creation with originalPrice, password hashing
- `src/pages/Cashier.tsx` - Cart card counting, walk-in ID, search improvements
- `src/pages/Transactions.tsx` - Remove pagination limit
- `src/pages/Members.tsx` - Search placeholder
- `src/components/dialogs/MemberDetailDialog.tsx` - Transaction grouping, phone validation
- `src/components/dialogs/MemberDeleteWithRefundDialog.tsx` - Use fallback originalPrice
- `src/components/dialogs/TransactionRefundDialog.tsx` - Price diff tracking
- `src/components/dialogs/AdminPasswordDialog.tsx` - Password hashing
- `src/components/dialogs/QuickRechargeDialog.tsx` - Search optimization
- `src/components/dialogs/NewAppointmentDialog.tsx` - Search optimization
- `src/pages/Settings.tsx` - Password hashing

---

## Verification Checklist

After implementation, verify:
- [ ] Member phone uniqueness is enforced on edit
- [ ] Card remaining count in cart reflects actual available uses
- [ ] Deleted card templates don't cause ¥0 refund calculations
- [ ] Search finds members beyond position 5
- [ ] All search placeholders are unified
- [ ] Search dropdowns don't overflow
- [ ] Transaction pagination shows all records
- [ ] Walk-in transactions have unique IDs
- [ ] Password is hashed in localStorage
- [ ] Price diff refunds show clear manual refund tracking
- [ ] Member transaction list groups consumption with refund
- [ ] No container overflow issues
- [ ] All forms have proper validation
- [ ] No console errors
