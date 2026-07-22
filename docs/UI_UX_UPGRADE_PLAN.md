# UI/UX Upgrade Plan — Sổ Điểm Giáo Lý (Professional & Responsive)

> **Mục tiêu**: Nâng cấp giao diện đạt chuẩn chuyên nghiệp, tương thích hoàn hảo mobile & desktop, có design system thống nhất, accessibility WCAG 2.1 AA, performance tốt.

---

## 📊 Tóm Tắt Trạng Thái Hiện Tại

| Khu vực | Trạng thái | Ghi chú |
|---------|------------|---------|
| **Design Tokens (CSS Variables)** | ✅ Hoàn thiện | `variables.css` có spacing, typography, colors, shadows, radius, z-index, touch targets, breakpoints, dark mode |
| **CSS Architecture** | ✅ Hoàn thiện | CSS Layers (`base → components → views → utilities`), modular 12 files |
| **Responsive Layout** | ✅ Hoàn thiện | App grid, sidebar collapse/icon-only (64px), mobile drawer, 6 breakpoints |
| **Mobile Shell** | ✅ Hoàn thiện | Bottom nav 5 tabs, collapsible top bar, FAB, bottom sheets, modals as bottom sheets (<768px) |
| **Table View** | ✅ Hoàn thiện | Column priority show/hide, sticky headers, col-resizer, virtual scroll |
| **Cards View** | ✅ Hoàn thiện | Responsive grid, legend desktop, touch targets 48px, swipe gestures |
| **Dashboard** | ✅ Hoàn thiện | 1-4 cột responsive, skeleton loading, stats cards |
| **Touch & Gestures** | ✅ Hoàn thiện | Swipe L/R, long press, pull-to-refresh, drag-dismiss, ripple effect |
| **Desktop Power Features** | ✅ Hoàn thiện | Column resizer, context menu, multi-select + bulk edit, split pane sidebar, drag & drop reorder |
| **Forms & Inputs** | ✅ Hoàn thiện | Input modes, validation, keyboard nav, arrow keys, debounce |
| **Performance** | ✅ Hoàn thiện | `content-visibility: auto`, skeleton, CSS-only virtual scroll, transitions |
| **Accessibility** | 🟡 80% | ARIA labels, focus trap, reduced motion, contrast AA — **chưa test screen reader** |
| **Dark Mode** | ✅ Hoàn thiện | CSS `prefers-color-scheme` + class toggle |
| **PWA/Offline** | 🟡 70% | Install prompt, SW cache — **chưa test offline data entry thật** |
| **Design System Doc** | ✅ Có | `STYLE_GUIDE.md` đầy đủ |
| **Component Library/Showcase** | ✅ Có | 20 Lit components + Storybook static build |
| **Real Device Testing** | ❌ Thiếu | Chưa test iOS/Android thật, browser compatibility |
| **Performance Metrics** | ❌ Thiếu | Chưa đo FID/LCP/CLS trên thiết bị thật |

---

## 🎯 Kế Hoạch Nâng Cấp — 4 Giai Đoạn (8 Tuần)

### Giai Đoạn 1: Design System & Component Library với Lit (Tuần 1-2) — **P0** 🟡 Đang thực hiện

#### 1.1 Cài đặt Lit & Dependencies
```bash
npm i lit @lit/test-helpers
npm i -D @storybook/web-components-vite @storybook/addon-a11y @storybook/addon-controls @storybook/addon-viewport @storybook/addon-measure @storybook/addon-outline @chromatic-com/storybook
```

#### 1.2 Cấu trúc Component Library ✅
```
src/ui/components/
├── Button/       ✅ 9 tests
├── Input/        ✅ 5 tests
├── Select/       ✅ 3 tests
├── Modal/        ✅ 5 tests
├── Toast/        ✅ 5 tests
├── Badge/        ✅ 3 tests
├── Card/         ✅ 3 tests
├── Table/        ✅ 3 tests
├── Tabs/         ✅ 3 tests
├── Sidebar/      ✅ 4 tests
├── BottomNav/    ✅ 4 tests
├── TopBar/       ✅ 4 tests
├── FAB/          ✅ 3 tests
├── BottomSheet/  ✅ 4 tests
├── Skeleton/     ✅ 3 tests
├── Avatar/       ✅ 5 tests
├── Chip/         ✅ 4 tests
├── Tooltip/      ✅ 3 tests
├── Dropdown/     ✅ 3 tests
├── CommandPalette/ ✅ 4 tests
└── index.ts      ✅ Barrel export
```

**Yêu cầu từng component:**
- Kế thừa `LitElement`, dùng `@property()` cho props, `@state()` cho internal state
- Template dùng `` html`` literal (lit-html) — type-safe, reactive
- Styles dùng `` css`` literal trong Shadow DOM — encapsulated, không conflict
- TypeScript strict types cho props/events
- Accessible by default (ARIA, keyboard, focus-visible)
- Support dark mode qua CSS variables (inherit từ host)
- Unit test coverage ≥80% (Vitest + `@lit/test-helpers`)
- Storybook story với controls/knobs

#### 1.3 Storybook Setup cho Lit ✅
- [x] Config `.storybook/main.ts`, `preview.ts` với CSS layers, global decorators
- [x] Add addons: `a11y`, `controls`, `viewport`, `measure`, `outline`, `chromatic`
- [ ] Publish static build lên GitHub Pages / Netlify preview
- [ ] Document từng component: props, variants, states, accessibility notes

#### 1.4 Migration Từ Inline HTML → Lit Components
- [x] `AppView.ts` — mobile shell (TopBar, BottomNav, FAB, BottomSheet) + event bindings
- [x] `ClassView.ts` — buttons, tabs, input, selects, skeleton → Lit components
- [x] `DashboardView.ts` — buttons, status badges → Lit components
- [x] Modals: 15/16 modals → `<gl-modal>` (giữ lại `ExcelImportModal` — multi-step wizard phức tạp)
- [ ] `ProfileView.ts` migration — skip vì navigation rows có custom layout không tương thích `<gl-button>`

> **Lưu ý**: Không cần `design-tokens.json` build script — CSS variables trong `variables.css` đã là single source of truth. Chỉ tạo JSON nếu có team designer + Figma sync.

---

### Giai Đoạn 2: Desktop UX Polish (Tuần 3-4) — **P1**

#### 2.1 Advanced Filtering & Search (ClassView)
- [ ] **Multi-column filter bar** — filter theo nhiều cột điểm cùng lúc (AND/OR logic)
- [ ] **Saved filter presets** — lưu filter thường dùng vào localStorage, dropdown chọn nhanh
- [ ] **Column visibility toggle** — modal/popover chọn ẩn/hiện cột (cải thiện UI từ ColumnsModal)
- [ ] **Global search / Command Palette** — `Cmd/Ctrl+K` mở **native `<dialog>` custom** tìm học viên, lớp, hành động
- [ ] **Keyboard shortcuts cheatsheet** — modal `?` hiển thị đầy đủ, nhóm theo ngữ cảnh

#### 2.2 Print/Export — CSS Only (Không JS PDF Library)
- [ ] **Tối ưu `src/styles/print.css`** — định hình giao diện in chuẩn A4 dọc, tự động ngắt trang (`page-break-inside: avoid`), ẩn nút điều hướng
- [ ] **Print preview modal** — xem trước trước khi in (dùng `window.print()` native), zoom in/out
- [ ] **Batch print** — in nhiều lớp cùng lúc (parish report)
- [ ] **Không dùng `pdfmake` / `@react-pdf/renderer`** — tận dụng Print to PDF của OS/browser, nhẹ, tin cậy, hỗ trợ mobile

#### 2.3 Data Density & Power User Features
- [ ] **Compact mode toggle** — density: comfortable (default) / compact / spacious
- [ ] **Column pinning** — pin left/right columns khi scroll ngang
- [ ] **Row detail expand** — click row → expand panel chi tiết (journal, scores history)
- [ ] **Keyboard-first grid navigation** — vim-like `h/j/k/l`, `Enter` edit, `Esc` exit
- [ ] **Command Palette** — custom `<dialog>` implementation (~150 lines TS)

#### 2.4 Sidebar & Navigation Enhancements
- [ ] **Sidebar sections collapsible state persist** — localStorage per-section
- [ ] **Quick switcher** — `Cmd/Ctrl+Shift+O` switch lớp nhanh (fuzzy search)
- [ ] **Recent classes**

---

### Giai Đoạn 3: Mobile UX Polish (Tuần 5-6) — **P1**

#### 3.1 Tab Điểm / Cả Năm / Theo Dõi — Polish
- [ ] **Segmented control sticky** — term switcher + view switcher gộp, scroll ngang mượt
- [ ] **Swipe between views** — đã có, cần tinh chỉnh threshold, haptic feedback
- [ ] **Pull-to-refresh visual** — indicator rõ ràng, sync status inline
- [ ] **Empty states có hành động** — "Thêm học viên", "Nhập từ Excel" ngay trên empty state

#### 3.2 Màn Lớp (Class List) Mobile
- [ ] **Class cards** — thay list đơn giản bằng card có avatar, TB, trạng thái, actions inline
- [ ] **Swipe actions trên class card** — trái: xóa, phải: archive/sửa
- [ ] **Long press class** → context menu (đổi tên, xóa, archive, sao chép)

#### 3.3 Màn Cá Nhân / Profile
- [ ] **Settings groups** — accordion: Tài khoản, Giao diện, Đồng bộ, Dữ liệu, About
- [ ] **Theme picker visual** — light/dark/system + accent color picker
- [ ] **Backup/restore UI** — progress bar, confirmation rõ ràng
- [ ] **PWA install prompt** — custom banner không dùng `beforeinstallprompt` deprecated

#### 3.4 Màn Đăng Nhập (Login)
- [ ] **Illustration/branding** — hero area đẹp, animation subtle
- [ ] **Biometric/WebAuthn prominent** — nếu hỗ trợ, hiển thị lớn
- [ ] **PIN entry keypad** — numeric keypad custom, không dùng input type=password
- [ ] **Error states rõ ràng** — shake animation, inline message
- [ ] **Remember me / auto-login** — toggle, lưu session an toàn

#### 3.5 Gesture & Touch Polish
- [ ] **Haptic feedback** — `navigator.vibrate()` cho actions quan trọng (xóa, lưu, sync)
- [ ] **Edge swipe back** — swipe từ cạnh trái để back (nếu trong nested view)
- [ ] **Sticky action bar** — khi scroll danh sách HV, bar actions (thêm, lọc, bulk) sticky bottom
- [ ] **Safe area handling** — test notch, Dynamic Island, home indicator

#### 3.6 Offline-First UX
- [ ] **Offline indicator** — banner/top bar khi offline, queue count
- [ ] **Optimistic UI** — nhập điểm ngay, sync ngầm, conflict resolution UI
- [ ] **Background sync** — Workbox background sync cho queue

---

### Giai Đoạn 4: Quality Assurance & Performance (Tuần 7-8) — **P0/P1**

#### 4.1 Accessibility Audit & Fix (WCAG 2.1 AA)
- [ ] **Screen reader testing** — NVDA (Windows), VoiceOver (macOS/iOS), TalkBack (Android)
  - [ ] Semantic HTML audit: landmarks, headings hierarchy, lists, tables
  - [ ] ARIA labels cho tất cả icon-only buttons, dynamic content
  - [ ] Live regions cho toast, loading, sync status
  - [ ] Focus order logic, focus visible rõ ràng
- [ ] **Keyboard-only navigation** — Tab, Shift+Tab, Enter, Space, Arrow keys, Escape
- [ ] **Color contrast** — verify tất cả text/background combos ≥4.5:1 (normal), ≥3:1 (large)
- [ ] **Reduced motion** — test `prefers-reduced-motion: reduce` tắt tất cả animation
- [ ] **Zoom 200%** — layout không vỡ, horizontal scroll không xuất hiện
- [ ] **Accessibility checklist** — cập nhật `STYLE_GUIDE.md` section 6

#### 4.2 Real Device Testing Matrix
| Device | OS | Browser | Viewport | Test Cases |
|--------|-----|---------|----------|------------|
| iPhone SE (2020) | iOS 17+ | Safari | 375×667 | Touch targets, safe area, PWA install |
| iPhone 15 Pro | iOS 17+ | Safari | 393×852 | Dynamic Island, gestures, haptic |
| iPad Air | iPadOS 17+ | Safari | 820×1180 | Split view, sidebar, keyboard |
| Galaxy S23 | Android 14 | Chrome | 360×780 | Back gesture, PWA, notifications |
| Galaxy Tab S9 | Android 14 | Chrome | 848×1344 | Desktop mode, drag-drop |
| Desktop 1366×768 | Win 11 | Chrome/Edge/Firefox | 1366×768 | Sidebar collapse, table scroll |
| Desktop 1920×1080 | Win 11 | Chrome/Edge/Firefox | 1920×1080 | Ultra-wide, column resizer |
| Desktop 2560×1440 | macOS | Safari/Chrome | 2560×1440 | Retina, dark mode |

**Test scenarios mỗi device:**
- [ ] Login PIN + biometric
- [ ] Tạo lớp, thêm HV, nhập điểm (cards + table view)
- [ ] Swipe gestures, long press, pull-to-refresh
- [ ] Sidebar/drawer open/close
- [ ] Modal bottom sheet drag dismiss
- [ ] PWA install + offline data entry
- [ ] Print/export
- [ ] Sync conflict resolution

#### 4.3 Browser Compatibility
- [ ] **Chrome** (latest 2 versions)
- [ ] **Firefox** (latest 2 versions)
- [ ] **Safari** (latest 2 versions) — focus: CSS `env()`, `content-visibility`, `backdrop-filter`
- [ ] **Edge** (latest 2 versions)
- [ ] **Samsung Internet** (Android)
- [ ] Polyfill check: `ResizeObserver`, `IntersectionObserver`, `focus-visible`, `dialog` element

#### 4.4 Performance Metrics & Optimization
| Metric | Target | Measurement |
|--------|--------|-------------|
| **LCP** (Largest Contentful Paint) | < 2.5s | Lighthouse, Web Vitals (mobile 3G) |
| **INP** (Interaction to Next Paint) | < 200ms | Real user monitoring |
| **CLS** (Cumulative Layout Shift) | < 0.1 | Lighthouse, layout shift regions |
| **TTFB** | < 600ms | Server timing |
| **Bundle size (gz)** | < 150KB JS, < 50KB CSS | Vite build report |
| **Lighthouse Performance** | ≥ 90 | CI gate |
| **Lighthouse Accessibility** | ≥ 95 | CI gate |

**Optimizations:**
- [ ] Code splitting: lazy load modals, heavy views (ParishReport, ExcelImport)
- [ ] Tree shaking: remove unused lodash/date-fns, dùng native APIs
- [ ] Image optimization: SVG icons inline, WebP/AVIF cho illustrations
- [ ] Font loading: `font-display: swap`, preload Inter font
- [ ] Service Worker: `stale-while-revalidate` cho static assets, `network-first` cho API
- [ ] Virtual list: **giữ `content-visibility: auto`** — đã đủ cho 100+ HV, không cần `@tanstack/virtual`

#### 4.5 PWA & Offline Verification
- [ ] **Install criteria met** — manifest, SW, HTTPS, icons 192/512, screenshots
- [ ] **Offline data entry** — nhập điểm offline → queue → sync khi online
- [ ] **Conflict UI** — test 2 thiết bị sửa cùng 1 HV, resolve UI
- [ ] **Background sync** — Workbox `backgroundSync` plugin
- [ ] **Update flow** — `skipWaiting`, `clients.claim`, toast "Phiên bản mới sẵn sàng"

#### 4.6 Notification System
- [ ] **Web Notifications API** — request permission contextually (khi cần nhắc thiếu điểm)
- [ ] **Scheduled notifications** — nhắc trước hạn tổng kết (7 ngày, 3 ngày, 1 ngày)
- [ ] **Sync notifications** — "Máy khác vừa cập nhật lớp X" (Supabase realtime + SW)
- [ ] **Permission handling** — denied state UI, settings link

---

## 📋 Checklist Chi Tiết Theo File/Module

### CSS & Design System
- [x] `src/ui/components/` — 20 Lit components (346 tests)
- [x] Storybook config + build pass
- [ ] Storybook deploy
- [x] Migration một phần: AppView, ClassView, DashboardView → Lit components
- [ ] Migration hoàn chỉnh: modals, ProfileView

### Desktop Views
- [x] `ClassView` — advanced filters (score range, presets), compact mode, column pinning, column visibility toggle, keyboard nav ✅
- [x] `DashboardView` — print layout (CSS only), batch export ✅
- [x] `AppView` — quick switcher, sidebar sections collapsible + persist, recent classes ✅
- [x] Keyboard shortcuts cheatsheet modal ✅

### Mobile Views
- [ ] `mobile.css` — polish tab bar, sticky actions, safe areas
- [ ] `LoginView` — keypad, biometric prominent, illustration
- [ ] `ClassView` mobile — class cards, swipe actions
- [ ] `ProfileView` — settings groups, theme picker visual
- [ ] Offline banner, optimistic UI indicators

### Accessibility
- [ ] Semantic HTML audit toàn app
- [ ] ARIA live regions cho toast/sync
- [ ] Focus-visible styles consistent
- [ ] Screen reader test script/checklist

### Testing & CI
- [ ] Playwright E2E matrix: mobile (iOS/Android emulation) + desktop
- [ ] Lighthouse CI gate (perf ≥90, a11y ≥95)
- [ ] Visual regression: Chromatic hoặc Percy cho Storybook
- [ ] Bundle size monitor: `vite-bundle-analyzer` CI

---

## 🛠️ Công Cụ & Thư Viện Mới Cần Thêm

| Purpose | Library | Reason |
|---------|---------|--------|
| Component Engine | **`lit`** (~6KB) | Reactive, Shadow DOM, declarative, Vite/Storybook ready |
| Storybook | `@storybook/web-components-vite` | Component documentation cho Lit/Web Components |
| Testing Lit | `@lit/test-helpers` | Unit test utilities cho Lit components |
| Command Palette | **Custom native `<dialog>`** (~150 lines) | Không dependency, full control, accessible |
| Print/PDF | **CSS `@media print` only** | Native OS Print to PDF, 0 bytes JS, mobile support |
| Virtual List | **CSS `content-visibility: auto`** (existing) | Native, GPU-accelerated, 0 bytes JS |
| Date/Time | `date-fns` (tree-shakable) | Format dates lightweight |
| Icons | `lucide` hoặc SVG inline | Consistent, tree-shakable |
| Testing | `@playwright/test`, `@chromatic-com/storybook` | E2E + visual regression |
| Performance | `web-vitals`, `lighthouse-ci` | Real metrics |

> **Loại bỏ**: `kbar`, `@tanstack/virtual`, `pdfmake`, `@react-pdf/renderer`, `@design-tokens/utils`, custom design-tokens build script

---

## 📅 Timeline Tổng Hợp

| Tuần | Giai đoạn | Deliverables |
|------|-----------|--------------|
| 1-2 | Design System & Components (Lit) | 🟢 20 Lit components ✅, Storybook build ✅, migration 95% (15/16 modals ✅, ExcelImportModal giữ lại) |
| 3-4 | Desktop Polish | 🟢 Advanced filters ✅, PrintModal preview ✅, Sidebar collapsible ✅, Recent classes ✅, Column visibility ✅ |
| 5-6 | Mobile Polish | Chưa bắt đầu |
| 7 | Accessibility Audit | Chưa bắt đầu |
| 8 | Real Device + Perf | Chưa bắt đầu |

**Tổng: 8 tuần (2 tháng)**

---

## 🎯 Definition of Done (Per Phase)

### Phase 1 Done khi:
- [x] 20 components trong `src/ui/components/` có test + story (346 tests)
- [x] Storybook static build pass
- [ ] Storybook deployed, docs hoàn chỉnh (cần GitHub Pages / Netlify)
- [x] AppView/ClassView/DashboardView dùng components thay vì template strings
- [x] `npm run build` + `npm test` pass (346 tests, build clean)
- [x] 15/16 modals → `<gl-modal>` (ExcelImportModal giữ nguyên vì multi-step wizard phức tạp)
- [ ] `ProfileView.ts` migration — skip vì navigation rows layout không tương thích `<gl-button>`

### Phase 2 Done khi:
- [x] Advanced filter bar (classification + completion + score range) + saved presets hoạt động
- [x] Command palette (`Cmd+K`) tìm lớp/HV/actions
- [x] Print layout builder (A4 CSS only, preview iframe, zoom, tùy chỉnh layout) ✅
- [x] Compact mode toggle persist
- [x] Column pinning, row detail expand ✅
- [x] Quick switcher (`Cmd+Shift+O`) ✅
- [x] Multi-column score range filter (AND logic) ✅
- [x] Column visibility toggle per class (localStorage persist) ✅
- [x] Sidebar sections collapsible (3 sections + recent classes) + persist ✅
- [x] Recent classes tracking (5 gần nhất, click để chuyển) ✅

### Phase 3 Done khi:
- [ ] Mobile tabs sticky, swipe mượt, haptic feedback
- [ ] Class cards với swipe actions
- [ ] Login view redesign hoàn chỉnh
- [ ] Profile settings groups + theme picker visual
- [ ] Offline indicator + optimistic UI
- [ ] Safe area handling test pass trên iPhone 15 Pro

### Phase 4 Done khi:
- [ ] Screen reader test pass (NVDA, VoiceOver, TalkBack)
- [ ] WCAG 2.1 AA checklist 100%
- [ ] Device matrix test report (8 thiết bị/x browser)
- [ ] Lighthouse CI: Perf ≥90, A11y ≥95, PWA ≥90
- [ ] Bundle size < 150KB JS gzipped
- [ ] PWA offline data entry verified
- [ ] Notifications working (permission + scheduled)

---

## 📝 Ghi Chú Triển Khai

1. **Ưu tiên component library trước** — việc migrate views sau sẽ nhanh và nhất quán hơn
2. **Mobile-first trong CSS** — đã có, giữ nguyên, chỉ polish
3. **Lazy load heavy features** — ExcelImport, ParishReport, PrintModal, YearCompare
4. **Feature flags** — dùng `localStorage` flags để bật/tắt features mới khi test
5. **Backward compatibility** — migration state (IndexedDB schema v4) đã ổn, không đụng
6. **Documentation** — cập nhật `STYLE_GUIDE.md` và `ARCHITECTURE.md` song song

---

## 🔗 Tài Liệu Tham Khảo

- `docs/STYLE_GUIDE.md` — Design system hiện tại
- `docs/ui-upgrade-plan.md` — Plan cũ (đã hoàn thành 4/4 phases cơ bản)
- `docs/PLAN.md` — Overall project plan (Phase 4 UX/UI Polish còn thiếu items)
- `src/styles/variables.css` — Design tokens
- `src/styles/mobile.css` — Mobile shell styles
- `src/ui/gestures.ts` — Touch gesture utilities
- `src/utils/focusTrap.ts` — Accessibility utility

---

*Plan này được tạo dựa trên audit codebase tháng 7/2026. Cập nhật theo tiến độ thực tế.*