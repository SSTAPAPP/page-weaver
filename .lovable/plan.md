

# Implementation Plan

## Overview
This plan addresses four main issues:
1. Refund card uses when a card_deduct transaction is refunded
2. Fix the price_diff transaction error and merge it into main transaction
3. Redesign the member detail dialog layout to fix button overlap issues
4. Redesign the reports page metric indicators section

---

## 1. Card Refund Logic Enhancement

**Problem**: When a `card_deduct` transaction is refunded, the card uses are not being restored.

**Solution**: 
- Add a `refundCard` function to the store that increments the remaining count
- Store `cardId` information in the transaction's `subTransactions` for refund reference
- Update `TransactionRefundDialog` to call `refundCard` when refunding card_deduct transactions

### Files to Modify:
- `src/stores/useStore.ts` - Add `refundCard` function
- `src/types/index.ts` - Add `cardId` to subTransactions type
- `src/pages/Cashier.tsx` - Store cardId in subTransactions when using card
- `src/components/dialogs/TransactionRefundDialog.tsx` - Call refundCard on refund

---

## 2. Merge Price Diff Transaction & Fix Error

**Problem**: 
- Clicking on `price_diff` transaction causes white screen (missing in typeMap)
- Price diff creates separate transaction instead of being merged

**Solution**:
- Remove the separate `price_diff` transaction creation in Cashier.tsx
- Keep price_diff info only in `subTransactions` of the main transaction
- Add `price_diff` to the typeMap in TransactionRefundDialog
- Filter out `price_diff` type from the transaction list display (they only exist in subTransactions now)
- Handle refund logic to also void related price_diff records

### Files to Modify:
- `src/pages/Cashier.tsx` - Remove separate price_diff transaction creation
- `src/components/dialogs/TransactionRefundDialog.tsx` - Add price_diff to typeMap
- `src/pages/Transactions.tsx` - Filter price_diff from display or handle gracefully
- `src/stores/useStore.ts` - Update statistics to use subTransactions for revenue calculation

---

## 3. Member Detail Dialog UI Redesign

**Problem**: Edit/Delete buttons overlap the close X button in the dialog header.

**Solution**:
- Move action buttons from header to footer area
- Make the member info card more compact
- Use a cleaner layout with proper spacing

### Design Changes:
- Header: Title + Description only (let DialogContent handle the X button)
- Member card: Reduce padding, use horizontal layout
- Footer: Place Edit/Delete/Save/Cancel buttons at the bottom

### File to Modify:
- `src/components/dialogs/MemberDetailDialog.tsx`

---

## 4. Reports Metric Indicators Redesign

**Problem**: Current collapsible metric explanation section needs to be more professional and compact.

**Solution**:
- Use a horizontal card layout instead of vertical stack
- Add color-coded icons
- Make descriptions more concise
- Use tooltip for detailed examples

### Design Changes:
- Grid layout with 3 compact metric cards
- Each card shows: icon, title, brief description
- Hover to see detailed formula and example

### File to Modify:
- `src/pages/Reports.tsx`

---

## Technical Details

### Store Changes (useStore.ts)

```text
New function:
refundCard(memberId: string, cardId: string): void
  - Find the member and card
  - Increment remainingCount by 1
  
Update getTodayStats():
  - Revenue calculation should look at subTransactions with type 'price_diff'
  - Or keep separate price_diff transactions but handle them properly
```

### Transaction Type Updates (types/index.ts)

```text
Update subTransactions interface:
{
  type: 'balance' | 'card' | 'price_diff';
  amount: number;
  paymentMethod?: string;
  cardId?: string;  // Add this for card refund
}
```

### Cashier.tsx Changes

```text
1. Store cardId in subTransactions when using card:
   subTransactions.push({
     type: 'card',
     amount: item.service.price,
     cardId: item.card.id,  // Add this
   });

2. Remove the separate price_diff transaction creation (lines 176-185)
   - Keep price_diff only in subTransactions array
   - Main transaction's subTransactions will contain all payment details
```

### TransactionRefundDialog.tsx Changes

```text
1. Add price_diff to typeMap:
   price_diff: { label: "补差价", icon: ArrowDownCircle, color: "text-chart-1" }

2. Update handleRefund():
   - If transaction has subTransactions with type 'card', call refundCard for each
   - If subTransactions has 'balance', refund the balance amount
   
3. Update refund description to show proper refund details
```

### MemberDetailDialog.tsx Redesign

```text
New layout structure:
- DialogHeader: Title only (no buttons)
- DialogContent: ScrollArea with
  - Compact member info card (avatar + basic info inline)
  - Balance & Cards stats row
  - Tabs for cards/transactions
- DialogFooter: Action buttons (Edit/Delete or Save/Cancel)
```

### Reports.tsx Metric Section

```text
Replace current collapsible with:
- Horizontal grid of 3 metric cards
- Each card: colored icon + title + short description
- Tooltip on hover for detailed explanation
- Smaller overall footprint
```

---

## Implementation Order

1. **Store & Types** - Add refundCard function and update types
2. **Cashier.tsx** - Update to store cardId and remove separate price_diff transaction
3. **TransactionRefundDialog.tsx** - Fix typeMap and implement full refund logic
4. **Transactions.tsx** - Handle edge cases for legacy price_diff transactions
5. **MemberDetailDialog.tsx** - Redesign layout
6. **Reports.tsx** - Redesign metric indicators

---

## Expected Outcome

- Card refunds will properly restore remaining uses
- No more white screen when clicking transactions with price_diff
- Merged transaction records show all payment details in one entry
- Member detail dialog has proper button placement without overlap
- Reports page has cleaner, more professional metric explanations

