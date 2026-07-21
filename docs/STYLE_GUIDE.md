# Style Guide — Sổ Điểm Giáo Lý

> Hướng dẫn thiết kế và phát triển giao diện.

## Mục lục

1. [Design Tokens](#1-design-tokens)
   - [Màu sắc](#màu-sắc)
   - [Spacing](#spacing)
   - [Typography](#typography)
   - [Border Radius](#border-radius)
   - [Shadows](#shadows)
   - [Z-Index](#z-index)
   - [Transitions](#transitions)
   - [Touch Targets](#touch-targets)
2. [Utility Classes](#2-utility-classes)
3. [Components](#3-components)
   - [Buttons](#buttons)
   - [Inputs & Forms](#inputs--forms)
   - [Cards](#cards)
   - [Modals](#modals)
   - [Tables](#tables)
   - [Toasts](#toasts)
   - [Badges & Tags](#badges--tags)
   - [Loading States](#loading-states)
4. [Layout](#4-layout)
   - [App Grid](#app-grid)
   - [Sidebar](#sidebar)
   - [Mobile Navigation](#mobile-navigation)
5. [Responsive Patterns](#5-responsive-patterns)
   - [Breakpoints](#breakpoints)
   - [Table View Priority](#table-view-priority)
   - [Cards View](#cards-view)
6. [Accessibility](#6-accessibility)
   - [ARIA](#aria)
   - [Keyboard Navigation](#keyboard-navigation)
   - [Focus Management](#focus-management)
   - [Reduced Motion](#reduced-motion)
   - [Color Contrast](#color-contrast)
7. [Touch & Gestures](#7-touch--gestures)
8. [Animations](#8-animations)

---

## 1. Design Tokens

Tất cả design tokens được định nghĩa trong `src/styles/variables.css` dưới dạng CSS custom properties.

### Màu sắc

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--color-bg` | `#f3f6fb` | `#0f172a` | Nền trang |
| `--color-bg-elevated` | `#ffffff` | `#1e293b` | Card, panel, modal |
| `--color-bg-hover` | `#f1f5f9` | `#334155` | Hover states |
| `--color-text` | `#1a2332` | `#f1f5f9` | Văn bản chính |
| `--color-text-secondary` | `#3d4f66` | `#cbd5e1` | Văn bản phụ |
| `--color-text-muted` | `#475569` | `#94a3b8` | Văn bản mờ (ghi chú, hint) |
| `--color-primary` | `#2563eb` | `#60a5fa` | Màu chủ đạo |
| `--color-success` | `#16a34a` | `#4ade80` | Thành công |
| `--color-danger` | `#dc2626` | `#f87171` | Nguy hiểm/Xoá |
| `--color-warning` | `#ea580c` | `#fb923c` | Cảnh báo |
| `--color-gold` | `#b45309` | `#fbbf24` | Vàng (xếp hạng, TB) |
| `--color-border` | `#d8e0ec` | `#334155` | Đường viền |

### Spacing

Sử dụng scale 4px: `--space-{1|2|3|4|5|6|8|10|12}` tương ứng 4px–48px.

```css
--space-1: 4px;  --space-2: 8px;   --space-3: 12px;
--space-4: 16px; --space-5: 20px;  --space-6: 24px;
--space-8: 32px; --space-10: 40px; --space-12: 48px;
```

### Typography

Font chính: system font stack (không import web font).

```css
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-mono: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
```

Kích thước (dùng `clamp()` cho fluid typography):

| Token | Giá trị |
|-------|---------|
| `--font-size-xs` | `clamp(0.6875rem, 0.65rem + 0.2vw, 0.75rem)` |
| `--font-size-sm` | `clamp(0.75rem, 0.7rem + 0.3vw, 0.875rem)` |
| `--font-size-base` | `clamp(0.875rem, 0.8rem + 0.5vw, 1rem)` |
| `--font-size-lg` | `clamp(1rem, 0.9rem + 0.8vw, 1.25rem)` |
| `--font-size-xl` | `clamp(1.25rem, 1rem + 1.5vw, 2rem)` |

### Border Radius

| Token | Giá trị |
|-------|---------|
| `--radius-sm` | `4px` |
| `--radius-md` | `8px` |
| `--radius-lg` | `12px` |
| `--radius-xl` | `16px` |
| `--radius-full` | `9999px` |

### Shadows

| Token | Giá trị |
|-------|---------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.08)` |
| `--shadow-lg` | `0 10px 25px rgba(0,0,0,0.12)` |

### Z-Index

| Token | Giá trị | Usage |
|-------|---------|-------|
| `--z-dropdown` | `100` | Dropdown, context menu |
| `--z-sticky` | `200` | Sticky header |
| `--z-overlay` | `300` | Modal overlay |
| `--z-modal` | `400` | Modal panel |
| `--z-toast` | `500` | Toast notifications |

### Transitions

| Token | Giá trị |
|-------|---------|
| `--duration-fast` | `150ms` |
| `--duration-normal` | `250ms` |
| `--duration-slow` | `400ms` |
| `--easing-standard` | `ease-out` |
| `--easing-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` |

### Touch Targets

```css
--touch-min: 48px;        /* Mobile: WCAG recommend */
--touch-target-min: 48px; /* Touch targets */
```

Desktop (≥1024px) giảm còn 36px.

---

## 2. Utility Classes

Định nghĩa trong `src/styles/base.css`. Sử dụng design tokens.

### Display
`.block`, `.inline-block`, `.flex`, `.d-flex`, `.inline-flex`, `.grid`

### Flexbox
`.flex-row`, `.flex-col`, `.flex-wrap`, `.items-center`, `.items-start`, `.justify-center`, `.justify-between`, `.self-center`, `.flex-1`, `.flex-shrink-0`

### Gap
`.gap-{1|2|3|4|5|6|8|10|12}` — tương ứng `var(--space-*)`

### Spacing
Padding: `.p-*`, `.px-*`, `.py-*`, `.pt-*`, `.pb-*`, `.pl-*`, `.pr-*`
Margin: `.m-*`, `.mx-*`, `.my-*`, `.mt-*`, `.mb-*`, `.ml-*`, `.mr-*`
`.mx-auto`, `.ml-auto`, `.mr-auto`

### Typography
Kích thước: `.text-xs`, `.text-sm`, `.text-base`, `.text-lg`, `.text-xl`, `.text-2xl`, `.text-3xl`
Căn chỉnh: `.text-center`, `.text-left`, `.text-right`
Font weight: `.font-medium`, `.font-semibold`, `.font-bold`, `.font-extrabold`

### Colors
`.text-muted`, `.text-secondary`, `.text-primary`, `.text-success`, `.text-danger`, `.text-gold`

### Sizing
`.w-full`, `.h-full`, `.min-w-0`

### Overflow
`.overflow-hidden`, `.overflow-auto`, `.overflow-y-auto`

### Misc
`.truncate`, `.sr-only` (screen reader only), `.hidden`, `.invisible`

---

## 3. Components

### Buttons

| Class | Usage |
|-------|-------|
| `.btn` | Base button |
| `.btn-primary` | Primary action |
| `.btn-secondary` | Secondary action |
| `.btn-ghost` | Ghost/outline button |
| `.btn-danger` | Destructive action |
| `.btn-sm` | Small button (36px desktop, 48px mobile) |
| `.btn-icon` | Icon-only button (square) |
| `.btn-icon-neutral` | Neutral icon button |

Tất cả button có `min-height: var(--touch-target-min)` và `:active` scale feedback.

### Inputs & Forms

| Class | Usage |
|-------|-------|
| `.input` | Text input |
| `.select` | Select dropdown |
| `.filter-select` | Compact filter select |
| `.cell-score` | Score input (table view) |
| `[data-score-input]` | Score input (cards view) |
| `.is-invalid` | Validation error state |

### Cards

`.score-card` / `.se-row` — Student score card (cards view). Có `content-visibility: auto` cho virtual scrolling.

### Modals

Modal pattern: `.modal-overlay` > `.modal-panel`. Overlay có `backdrop-filter: blur(4px)` (mobile) và click-outside-to-close. Panel có `dialogPop` animation. Mobile (≤900px): dạng bottom sheet.

### Tables

`.score-table` — Bảng điểm. `.table-wrap` — container scroll ngang. `.col-hide-xs/sm/md` — column priority breakpoints.

### Toasts

`.toast` — Thông báo. Animation: `toast-in` (từ phải vào), `toast-out` (ra phải). Mobile: `toast-in-mobile` (từ dưới lên).

### Badges & Tags

`.badge` — Badge nhỏ. `.tag` — Tag xếp loại (`.xs`, `.g`, `.k`, `.tb`, `.y`). `.chip` — Chip điểm.

### Loading States

`.loading-spinner` — Spinner cơ bản. `.skeleton*` — Skeleton loading (`.skeleton-text`, `.skeleton-title`, `.skeleton-avatar`, `.skeleton-card`, `.skeleton-table-row`).

---

## 4. Layout

### App Grid

```css
.app {
  display: grid;
  grid-template-columns: minmax(64px, 280px) 1fr;
  height: 100vh;
}
```

Desktop (≥1024px): sidebar + main. Mobile (≤900px): single column, sidebar là drawer.

### Sidebar

- Desktop: `.sidebar` rộng 280px (có thể kéo resize), collapse xuống 64px icon-only.
- Mobile: `.sidebar` là drawer trượt từ trái, có scrim overlay.
- Accordion sections: `.sidebar-acc-header` + `.sidebar-acc-panel`.

### Mobile Navigation

- Bottom nav: `.m-nav` với 5 tabs (Dashboard, Lớp, Điểm, Cá nhân, Thêm).
- Top bar: `.m-topbar` với title, collapsible khi scroll.
- FAB: `.m-fab` — thêm học viên nhanh.

---

## 5. Responsive Patterns

### Breakpoints

| Name | Min Width | Usage |
|------|-----------|-------|
| xs | 0 | Mobile nhỏ |
| sm | 480px | Mobile lớn |
| md | 768px | Tablet |
| lg | 1024px | Desktop |
| xl | 1280px | Desktop lớn |
| 2xl | 1600px | Ultra-wide |

### Table View Priority

| Screen | Columns shown |
|--------|---------------|
| < 480px (xs) | 3 cột đầu |
| 480-767px (sm) | 4 cột |
| 768-1023px (md) | 5 cột |
| 1024-1280px (lg) | 6 cột (col-hide-md) |
| ≥ 1280px | Tất cả |

### Cards View

| Screen | Layout |
|--------|--------|
| < 480px | Tên + TB + input điểm nhanh |
| 480-767px | 2-3 cột điểm |
| ≥ 768px | Tất cả cột + legend |

---

## 6. Accessibility

### ARIA
- Tất cả icon-only buttons phải có `aria-label`.
- Buttons có text hiển thị dùng `aria-label` khi cần mô tả thêm.
- Modal dialogs dùng `role="dialog"` + `aria-modal="true"`.

### Keyboard Navigation
- **Tab**: Di chuyển giữa các ô điểm, controls.
- **Arrow keys**: Điều hướng giữa các ô điểm trong bảng/cards.
- **Enter**: Xác nhận nhập điểm.
- **Escape**: Đóng modal, context menu.
- **Ctrl+Z**: Undo. **Ctrl+Shift+Z / Ctrl+Y**: Redo.
- **Ctrl+N**: Thêm học viên. **Ctrl+S**: Đồng bộ.
- **/**: Focus thanh tìm kiếm. **?**: Hiển thị shortcuts.

### Focus Management
- Modal có focus trap (Tab/Shift+Tab cycle trong modal).
- Focus được khôi phục về phần tử trước đó khi đóng modal.
- `:focus-visible` outline 3px với offset 2px.

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

### Color Contrast
- Tất cả text pass WCAG AA (≥4.5:1 cho normal text, ≥3:1 cho large text).
- `--color-text-muted`: #475569 (pass ~5.1:1 trên light bg).

---

## 7. Touch & Gestures

Định nghĩa trong `src/ui/gestures.ts`.

| Gesture | Hành động |
|---------|-----------|
| Swipe trái | Xoá điểm cuối |
| Swipe phải | Đánh dấu quan trọng |
| Long press | Context menu |
| Pull-to-refresh | Đồng bộ dữ liệu |
| Click outside | Đóng modal/dropdown/context menu |

Desktop: right-click thay thế long press cho context menu.

---

## 8. Animations

Dùng CSS `@keyframes` + `transition`.

| Animation | Mục đích |
|-----------|----------|
| `fade-in` | Xuất hiện mờ dần |
| `slide-up` | Trượt lên từ dưới |
| `scale-in` | Phóng to (spring) |
| `view-enter-right/left` | Chuyển view (slide) |
| `stagger-in` | Danh sách xuất hiện tuần tự |
| `dialogPop` | Modal xuất hiện |
| `toast-in/out` | Toast |
| `shimmer` | Skeleton loading |
| `spin` | Spinner |
| `syncPulse` | Đồng bộ |

Tất cả animation tôn trọng `prefers-reduced-motion`.
