
# FFk - Final Delivery Implementation Plan

## Overview
This plan addresses 5 specific issues plus comprehensive improvements to deliver a production-ready barber shop management system.

---

## Issue 1: Member Detail Transaction Display Synchronization

**Problem**: Transaction records in member detail dialog don't match the visual style of the Transactions page (voided transactions should show strikethrough, gray badges, lower opacity).

**Solution**:
- Update `MemberDetailDialog.tsx` transaction list to include:
  - Type badges (color-coded by transaction type)
  - Strikethrough text for voided transactions
  - "已作废" red badge for voided records
  - Gray muted styling with reduced opacity (50%)
  - Colored amounts (+green for recharge/refund, -red for consumption)

**Files to Modify**:
- `src/components/dialogs/MemberDetailDialog.tsx`

---

## Issue 2: Admin Password for All Sensitive Operations

**Problem**: Some sensitive operations (delete service, delete card template, etc.) don't require admin password verification.

**Solution**:
- Wrap all delete operations with `AdminPasswordDialog`:
  - Delete service in Services.tsx
  - Delete card template in Services.tsx
  - Any future destructive operations

**Files to Modify**:
- `src/pages/Services.tsx` - Add AdminPasswordDialog for delete service and delete card template

---

## Issue 3: Member Deletion with Card Refund Workflow

**Problem**: Deleting a member should first calculate and show card refund details (prorated based on usage).

**Solution**:
Create a new `MemberDeleteWithRefundDialog` component that:
1. Calculates refund for each card:
   - Formula: `refundAmount = (remainingCount / totalCount) * originalPrice`
2. Shows itemized refund breakdown:
   - Card name, original price, total uses, used count, remaining count
   - Individual refund calculation formula
   - Total refund amount
3. Adds refund to member balance (or logs for cash refund)
4. Creates a refund transaction for each card
5. Proceeds to delete member after confirmation

**Files to Create**:
- `src/components/dialogs/MemberDeleteWithRefundDialog.tsx`

**Files to Modify**:
- `src/components/dialogs/MemberDetailDialog.tsx` - Use new dialog instead of AdminPasswordDialog for deletion
- `src/stores/useStore.ts` - Add function to get card template by ID

---

## Issue 4: Settings Page Redesign (Left-Right Split Layout)

**Problem**: Current settings page uses a simple grid layout. Need a professional left-sidebar navigation with right content area.

**Solution**:
Redesign Settings page with:
- Left sidebar: Collapsible category navigation (Store Info, Appearance, Security, Data)
- Right content: Dynamic content area based on selected category
- Manual save button for each section
- Local storage with browser localStorage (already implemented)

**Layout Structure**:
```text
+------------------+-----------------------------+
|  Settings Nav    |   Content Area              |
|  [Store Info]    |   (Based on selection)      |
|  [Appearance]    |                             |
|  [Security]      |                             |
|  [Data Export]   |                             |
+------------------+-----------------------------+
```

**Files to Modify**:
- `src/pages/Settings.tsx` - Complete redesign with left-right split

---

## Issue 5: Custom Favicon and App Name (FFk)

**Problem**: Need custom black "F" icon for favicon and logo, app name "FFk".

**Solution**:
1. Create SVG favicon with black "F" letter design
2. Update `index.html` title and meta tags to "FFk"
3. Update `AppSidebar.tsx` logo to display "F" icon and "FFk" text
4. Create new favicon as SVG file in public folder

**Files to Create**:
- `public/favicon.svg` - Black F letter icon

**Files to Modify**:
- `index.html` - Update title, og:title, and favicon link
- `src/components/layout/AppSidebar.tsx` - Update logo display

---

## Additional Improvements Identified

### A. Type Safety and Error Prevention
- Ensure all transaction type mappings are complete
- Add null checks for edge cases

### B. Visual Consistency
- Ensure all badges, colors, and spacing are consistent
- Verify hover/active states work correctly

### C. Data Validation
- Add form validation where missing
- Ensure error states display correctly

---

## Implementation Order

1. **Issue 5**: Favicon and branding (foundation change)
2. **Issue 4**: Settings redesign (major UI update)
3. **Issue 2**: Admin password for sensitive ops (security)
4. **Issue 3**: Member delete with refund workflow (complex logic)
5. **Issue 1**: Transaction display sync (visual polish)

---

## Technical Details

### Member Delete With Refund Calculation

```text
For each member card:
  template = getCardTemplateById(card.templateId)
  usedCount = template.totalCount - card.remainingCount
  refundRatio = card.remainingCount / template.totalCount
  refundAmount = template.price * refundRatio

Display format:
  Card: 洗剪吹10次卡
  Original: ¥280 | Total: 10次 | Used: 3次 | Remaining: 7次
  Refund: ¥280 × (7/10) = ¥196
```

### Settings Page Structure

```text
Categories:
1. 店铺信息 (shopInfo)
   - Store name, address, phone
   
2. 外观设置 (appearance)
   - Theme (light/dark/system)
   - Font size (5 levels)
   
3. 安全设置 (security)
   - Admin password change
   
4. 数据管理 (data)
   - Export members CSV
   - Export transactions (future)
   - Storage info
   - System info
```

### Favicon SVG Design

```text
Simple black "F" letter on transparent/white background
- Bold sans-serif font
- Rounded corners
- Modern professional look
```

---

## Verification Checklist

After implementation:
- [ ] All delete operations require admin password
- [ ] Member deletion shows card refund breakdown
- [ ] Transaction list in member detail matches Transactions page style
- [ ] Settings page has split layout with collapsible navigation
- [ ] Favicon displays "F" icon correctly
- [ ] App title shows "FFk" in browser tab
- [ ] Logo shows "F" icon with "FFk" text in sidebar
- [ ] All forms validate correctly
- [ ] No console errors or warnings
- [ ] Responsive layout works on mobile
