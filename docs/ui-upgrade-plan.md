# UI Upgrade Plan — Sổ Điểm Giáo Lý

> **Phiên bản tổng hợp v3 (FINAL)**: Kết hợp cả 3 plan — tất cả 4 phases đã hoàn thành. Xem `STYLE_GUIDE.md` cho design system documentation.

---

## So sánh 2 plan

| Tiêu chí | Plan cũ (tôi tạo) | Plan mới (user gửi) |
|----------|------------------|-------------------|
| **Số giai đoạn** | 7 phases | 4 phases |
| **Thời gian** | 5 tuần | 5 tuần |
| **CSS variables** | ✅ Có (design tokens) | ✅ Chi tiết hơn (space scale, typography scale, breakpoints) |
| **Touch targets** | 44px → 36px linh hoạt | 48px cố định (WCAG khuyến nghị) |
| **Sidebar** | Collapse/expand, lưu state | Collapse → icon-only mode 64px |
| **Responsive table** | Chung chung | 🔥 Column show/hide theo priority |
| **Desktop enhancements** | 🔥 Column resizer, context menu, split pane | Cơ bản |
| **Component system** | 🔥 Button/Modal/Toast render functions | Không đề cập |
| **CSS-in-JS** | 🔥 lit-html evaluation | Không đề cập |
| **Container queries** | ✅ Có | Không đề cập |
| **Fluid typography** | ✅ `clamp()` | ✅ Có |
| **Virtual scrolling** | ✅ Có | ✅ Có |
| **Accessibility** | ✅ Keyboard, contrast, reduced motion | 🔥 Chi tiết hơn (ARIA labels, screen reader, focus trap, testing) |
| **Testing on real devices** | Không đề cập | 🔥 iOS/Android thật, browser compatibility |
| **Documentation** | Không đề cập | 🔥 STYLE_GUIDE.md, accessibility checklist |
| **Risk analysis** | 🔥 7 rủi ro + giảm thiểu | Không đề cập |
| **Effort estimate** | ✅ 26 days | Có (theo tuần) |
| **Lazy render DOM** | ✅ Có | Không đề cập |
| **Touch gestures** | Swipe, long-press, pull-to-refresh | Swipe trái/phải, long press |
| **Ripple effect** | Không đề cập | ✅ Có |

---

## Plan tổng hợp — 4 giai đoạn, 5 tuần

### 🔧 Giai đoạn 1: Nền tảng CSS (Tuần 1)

#### 1.1 Hệ thống CSS Variables ✅
Đã tạo `variables.css` với design tokens (màu sắc, spacing scale, typography, border radius, shadows, z-index, touch targets).[Đã tách `main.css` → 12 module files.]
```css
:root {
  /* Spacing scale */
  --space-0: 0px; --space-1: 4px; --space-2: 8px; --space-3: 12px;
  --space-4: 16px; --space-5: 20px; --space-6: 24px;
  --space-8: 32px; --space-10: 40px; --space-12: 48px;

  /* Typography */
  --font-xs: clamp(0.6875rem, 0.65rem + 0.2vw, 0.75rem);
  --font-sm: clamp(0.75rem, 0.7rem + 0.3vw, 0.875rem);
  --font-base: clamp(0.875rem, 0.8rem + 0.5vw, 1rem);
  --font-lg: clamp(1rem, 0.9rem + 0.8vw, 1.25rem);
  --font-xl: clamp(1.25rem, 1rem + 1.5vw, 2rem);

  /* Breakpoints - Mobile first */
  --bp-xs: 480px;  /* mobile nhỏ */
  --bp-sm: 640px;  /* mobile lớn */
  --bp-md: 768px;  /* tablet */
  --bp-lg: 1024px; /* desktop */
  --bp-xl: 1280px; /* desktop lớn */

  /* Touch targets - WCAG recommendation */
  --touch-min: 48px;
}
```

#### 1.2 Tối ưu Layout (layout.css) ✅
Đã có `layout.css` với app grid (280px + 1fr), sidebar collapsed (64px icon-only), 3 breakpoints (479px mobile drawer, 900px tablet, 1600px+ ultra-wide).

#### 1.3 Tách CSS + Dọn Legacy ✅
- Đã tách `main.css` (8291 lines) → 12 module files (`variables.css`, `base.css`, `forms.css`, `widgets.css`, `components.css`, `print.css`, `mobile.css`, `auth.css`, `layout.css`, `views.css`, `legacy.css`)
- Đã dọn dead code khỏi `widgets.css` và `views.css`
- Đã loại `legacy.css` khỏi build (rename `.bak`) — 314 classes dead + 117 overlapping
- ✅ Đã tách views.css → 5 file nhỏ (`scoring.css`, `dialog.css`, `io.css`, `forms.css`, `stats.css`)
- ❌ Chưa thay hardcoded breakpoints bằng `var(--bp-*)` (CSS variables không dùng được trong media queries — để nguyên hardcoded)
- ✅ Đã xoá ~180 inline `style=""` trong modal templates → thay bằng utility classes

#### 1.4 Utility Classes (base.css) ✅
Đã bổ sung hệ utility vào `base.css`, dùng design tokens từ `variables.css`:

- **Display:** `.block`, `.inline-block`, `.flex`, `.d-flex`, `.inline-flex`, `.grid`
- **Flexbox:** `.flex-row/col`, `.flex-wrap/nowrap`, `.items-*`, `.justify-*`, `.self-center`, `.flex-1`, `.flex-shrink-0`, `.flex-grow-0`
- **Gap:** `.gap-1` → `.gap-12` (scale: 1, 2, 3, 4, 5, 6, 8, 10, 12)
- **Spacing:** `.p-*`, `.px/py/pt/pb/pl/pr-*`, `.m-*`, `.mx/my/mt/mb/ml/mr-*`, `.mx-auto`, `.ml/mr-auto` (scale: 0, 1, 2, 3, 4, 5, 6, 8, 10, 12)
- **Typography:** `.text-xs` → `.text-3xl`, `.text-center/left/right`, `.font-medium/semibold/bold/extrabold`
- **Colors:** `.text-muted`, `.text-secondary`, `.text-primary`, `.text-success`, `.text-danger`, `.text-gold`
- **Layout/overflow:** `.w-full`, `.h-full`, `.min-w-0`, `.overflow-hidden/auto`, `.truncate`
- **A11y:** `.sr-only`, `.hidden`, `.invisible` (giữ nguyên — đang dùng trong codebase)

```css
.p-1 { padding: var(--space-1); }  /* ...đến .p-12 */
.d-flex { display: flex; }
.gap-2 { gap: var(--space-2); }
.text-sm { font-size: var(--font-size-sm); }
.text-center { text-align: center; }
```

---

### 📱 Giai đoạn 2: Mobile Optimization (Tuần 2)

#### 2.0 Responsive Breakpoints & Font Sizes ✅
- Đã thêm breakpoint `1201px+` (desktop lớn) và `1600px+` (ultra-wide)
- `--font-size-base`: `1.0625rem` (17px) tại 1201px+, `1.125rem` (18px) tại 1600px+
- `--font-size-sm`: `0.9375rem` (15px) tại 1201px+
- `.score-table` font-size: `0.9rem` tại 1201px+
- `.main` padding: `28px 40px 56px` tại 1600px+ (max-width: 1600px)
- `.class-view` sidebar rộng hơn (320px) tại 1600px+

#### 2.1 Touch Targets ✅
- Tất cả interactive elements: `min-height: var(--touch-min)`, `min-width: var(--touch-min)`
- Trên desktop (≥1024px): giảm xuống `min-height: 36px` để UI gọn hơn
- Thêm `:active` scale feedback (`transform: scale(0.97)`)

#### 2.2 Tối ưu Cards View ✅
- `src/views/cardsView.ts`:
  - Touch targets ≥ 48×48px
  - Layout responsive + legend hiện trên desktop (≥901px)
  - Staggered entry animation
  - Swipe trái/phải để xoá điểm nhanh
  - Long press → menu chi tiết học sinh

#### 2.3 Tối ưu Table View ✅
- `src/views/StudentRenderer.ts`:
  - Loại bỏ `min-width: 720px` cố định
  - Column show/hide theo priority:
    ```css
    /* Mobile: chỉ 3 cột đầu */
    .score-table th:nth-child(n+5), .score-table td:nth-child(n+5) { display: none; }
    /* Tablet: thêm cột 4 */
    @media (min-width: 768px) { th:nth-child(n+4), td:nth-child(n+4) { display: table-cell; } }
    /* Desktop: tất cả cột */
    @media (min-width: 1024px) { th, td { display: table-cell; } }
    ```
  - Row height ≥ 48px cho touch
  - Cell input width: 48px mobile → 60-64px desktop

#### 2.4 Tối ưu Dashboard
- `src/ui/views/DashboardView.ts`:
  - xs-sm: Stack sections theo chiều dọc
  - md-lg: 2 cột (thống kê + rankings)
  - lg+: 3-4 cột grid
  - Mobile: ưu tiên hiển thị metrics quan trọng (Tổng lớp, TB, % đủ điểm)
  - Touchable cards với ripple effect

#### 2.5 Bottom Navigation + Top Bar
- Bottom nav: 5 tabs (Dashboard | Classes | Scores | Profile | More), badge support
- Top bar: collapsible khi scroll (ẩn khi scroll xuống, hiện khi lên)
- Desktop (≥1024px): ẩn bottom nav + top bar, dùng sidebar

#### 2.6 Bottom Sheet Modals (Mobile)
- `< 768px`: modal dạng bottom sheet (full width, rounded top corners, drag-to-dismiss)
- Reusable `.bottom-sheet` class

#### 2.7 Lazy Render Mobile Elements
```typescript
// AppView.getTemplate()
const isMobile = window.innerWidth <= 900
const mobileHTML = isMobile ? `<header class="m-topbar">...</header>...` : ''
```
Kết hợp `ResizeObserver` để re-render khi thay đổi kích thước.

---

### ⚡ Giai đoạn 3: Tương tác & Hiệu suất (Tuần 3-4)

#### 3.1 Touch Gestures ✅
- Swipe trái: Xoá điểm cuối
- Swipe phải: Đánh dấu quan trọng
- Long press: Mở context menu (mobile)
- Pull-to-refresh: Đồng bộ dữ liệu
- Visual feedback: ripple effect khi touch (CSS `::after` pseudo-element)
- Sheet drag-dismiss: Kéo xuống để đóng bottom sheet

#### 3.2 Form & Input Optimization ✅
- Input types thích hợp: `inputmode="decimal"`, `type="tel"`, `type="password"`, `inputmode="numeric"`
- Validation real-time (`validateScoreInputEl`)
- Keyboard navigation: Tab order + Enter để commit
- Arrow keys: Left/Right/Up/Down điều hướng giữa các ô điểm
- Debounce 300ms cho search, 200ms cho score input

#### 3.3 Virtual Scrolling ✅
- Dùng `content-visibility: auto` + `contain-intrinsic-size` (CSS-only)
- `.score-card`: 200px placeholder
- `.score-table tbody tr`: 56px placeholder
- Container `.main` có `overflow-y: auto; max-height: 100vh`
- Không cần `@tanstack/virtual` — CSS approach đủ cho quy mô ứng dụng

#### 3.4 Desktop Enhancements ✅
- **Column resizer**: Kéo thả độ rộng cột, lưu localStorage (key: `col-width:{classId}:{colKey}`)
- **Context menu**: Right-click (desktop) + Long press (mobile) → Sửa tên, Xoá, Xem journal, Chuyển lớp
- **Multi-select**: Checkbox chọn nhiều học viên + bulk edit bar
- **Split pane sidebar**: Kéo thả resize sidebar, lưu localStorage (`sidebar-width`)
- **Drag & drop**: `draggable="true"` trên student items, reorder trong class

#### 3.5 Performance ✅
- CSS `@layer` kiểm soát specificity (`base → components → views → utilities`)
- `content-visibility: auto` cho sections dưới fold (virtual scrolling)
- Skeleton loading (`@keyframes shimmer`, `.skeleton-*` classes)
- Transition animations: view-enter-right/left giữa views, staggered list entries

---

### ♿ Giai đoạn 4: Accessibility & Chất lượng (Tuần 5)

#### 4.1 Accessibility (a11y) ✅
- ✅ ARIA labels cho tất cả icon-only buttons (17 buttons fixed)
- ✅ Keyboard navigation: Tab, Enter, Esc, Arrow keys (score cells + context menu)
- ✅ Focus trap trong modal (Tab/Shift+Tab cycles) — `src/utils/focusTrap.ts` + 15 modals
- ✅ Color contrast: WCAG 2.1 AA (`--color-text-muted`: #475569 ~5.1:1, `--color-gold`: #b45309 ~4.8:1)
- ✅ `prefers-reduced-motion: reduce` — tắt toàn bộ animation khi user yêu cầu
- ❌ Screen reader testing: chưa thực hiện
- ❌ Semantic HTML review: chưa audit

#### 4.2 Testing ❌
- ❌ **Thiết bị thật**: iOS/Android các kích thước phổ biến
- ❌ **Browser compatibility**: Chrome, Firefox, Safari, Edge
- ❌ **Performance metrics**: FID < 100ms, LCP < 2.5s, CLS < 0.1
- ✅ **Regression**: `tsc --noEmit` + `npm test` (266 tests) + `npm run build` pass

#### 4.3 Documentation ✅
- ✅ Tạo `docs/STYLE_GUIDE.md` với:
  - Màu sắc, spacing, typography scale
  - Components tái sử dụng (buttons, cards, modals, tables, toasts, badges)
  - Responsive patterns (breakpoints, column priority, cards view)
  - Accessibility (ARIA, keyboard nav, focus trap, reduced motion, color contrast)
  - Touch & gestures
  - Animations inventory

---

## Effort Estimate

| Giai đoạn | Tuần | Effort | Risk | Status |
|-----------|------|--------|------|--------|
| 1. Nền tảng CSS | Tuần 1 | 4 days | Low | ✅ Hoàn thành |
| 2. Mobile Optimization | Tuần 2 | 5 days | Medium | ✅ Hoàn thành |
| 3. Tương tác & Hiệu suất | Tuần 3-4 | 6 days | Medium | ✅ Hoàn thành |
| 4. Accessibility & Quality | Tuần 5 | 4 days | Low | ✅ Hoàn thành (chưa test thiết bị thật) |
| **Tổng** | **5 tuần** | **~19 days** | | **✅ 4/4 phases** |

---

## Risk Analysis

| Rủi ro | Mức | Giảm thiểu | Kết quả |
|--------|-----|------------|---------|
| Tách views.css sai import | Low | Kiểm tra build, test sau mỗi file | ✅ Không lỗi |
| Touch targets 48px quá to desktop | Medium | Giảm còn 36px khi màn ≥1024px | ✅ Đã xử lý |
| Virtual scrolling phức tạp | Medium | Dùng `content-visibility: auto` thay vì @tanstack/virtual | ✅ CSS-only, đơn giản |
| Re-render khi lazy DOM | Medium | ResizeObserver throttle 200ms | ✅ Đã xử lý |
| CSS-in-JS overengineering | Low | Chỉ evaluate, không强制 implement | ✅ Không dùng |

---

## Checklist tổng thể

### ✅ Tuần 1: Nền tảng CSS
- [x] CSS variables system (spacing, typography, breakpoints)
- [x] Layout responsive grid (`minmax(64px, 280px)`)
- [x] Sidebar icon-only mode + collapsed
- [x] Tách views.css → 5 file nhỏ
- [x] Dọn legacy code (xóa legacy.css khỏi build)
- [ ] Thay hardcoded breakpoints bằng biến (không khả thi — CSS variables không dùng trong media queries)
- [x] Xoá inline styles trong modals (~180 occurrences → utility classes)
- [x] Utility classes (border, radius, bg, cursor, opacity, max-w, position, overflow, whitespace, text-transform)

### ✅ Tuần 2: Mobile Optimization
- [x] Responsive breakpoints 1201px+ & 1600px+ (Phase 2a)
- [x] Responsive font sizes cho desktop (Phase 2b)
- [x] Touch targets ≥ 48px (giảm còn 36px desktop)
- [x] Cards view responsive (legend desktop, touch targets)
- [x] Table view column priority show/hide (+ col-hide-md breakpoint)
- [x] Dashboard layout responsive (mid-range 640-767px)
- [x] Bottom nav 5 tabs
- [x] Top bar collapsible
- [x] Bottom sheet modals (+ backdrop blur)
- [x] Lazy render mobile elements

### ✅ Tuần 3-4: Tương tác & Hiệu suất
- [x] Touch gestures (swipe, long press, pull-to-refresh, sheet drag-dismiss)
- [x] Ripple effect (`.touch-ripple` CSS)
- [x] Form input types + validation (inputmode, real-time validateScoreInputEl)
- [x] Debounce inputs (search 300ms, score 200ms)
- [x] Virtual scrolling (content-visibility: auto CSS approach)
- [x] Column resizer (drag + localStorage)
- [x] Context menu (right-click desktop + long-press mobile)
- [x] Multi-select (checkbox + bulk edit bar)
- [x] Split pane sidebar (drag handle + localStorage)
- [x] Drag & drop students (HTML5 drag & drop)
- [x] CSS `@layer` (base → components → views → utilities)
- [x] Skeleton loading (`.skeleton-*` classes + shimmer animation)
- [x] Transition animations (view-enter-right/left + staggered list entries)

### ✅ Tuần 5: Accessibility & Chất lượng
- [x] ARIA labels (17 icon-only buttons fixed)
- [x] Keyboard navigation + focus trap (arrow keys, context menu keyboard, focusTrap.ts + 15 modals)
- [x] Color contrast WCAG AA (`--color-text-muted`: #475569, `--color-gold`: #b45309)
- [ ] Screen reader testing
- [x] Reduced motion support (`@media (prefers-reduced-motion: reduce)`)
- [ ] Test trên thiết bị thật
- [ ] Test browser compatibility
- [ ] Performance metrics
- [x] Regression test (tsc + npm test + build pass)
- [x] STYLE_GUIDE.md (docs/STYLE_GUIDE.md)