# Mobile Navigation & Responsive Layout Specification

## Document Information

**Project:** SittingPlanner (EasyWedding MVP)
**Component Focus:** DragAndDropCanvas.tsx & Layout.astro
**Date:** 2025-01-13
**Version:** 1.0
**Priority:** High - Accessibility & Mobile UX Improvement

---

## Executive Summary

This specification defines the business requirements for implementing a mobile-first responsive navigation pattern in the SittingPlanner seating plan interface. The changes will transform the desktop three-panel layout into a mobile-optimized single-panel view with bottom navigation, while preserving all existing desktop functionality.

---

## Technology Stack Reference

Per [tech-stack.md](../tech-stack.md), this implementation must align with:

- **Frontend Framework:** Astro 5 with React 19
- **Styling:** Tailwind CSS (utility-first approach)
- **Component Library:** Shadcn/ui design system
- **TypeScript:** Strict type safety
- **Design Philosophy:** Minimal JavaScript, performance-first, progressive enhancement

---

## Business Objectives

### Primary Goals

1. **Improve Mobile Accessibility** - Enable users to access all seating plan features on mobile devices (currently unusable due to cramped three-panel layout)
2. **Reduce Cognitive Load** - Provide focused, single-task views on small screens to prevent information overload
3. **Maintain Desktop Experience** - Preserve existing desktop workflow without regression
4. **Enhance Usability** - Implement industry-standard mobile navigation patterns (bottom tab bar) for familiarity

### Success Metrics

- Mobile task completion rate increases by ≥40%
- Touch target compliance: 100% of interactive elements ≥44×44px
- WCAG 2.1 Level AA compliance for mobile navigation
- Zero regressions in desktop user workflows
- Page load performance maintains <2s on 3G networks

---

## Components Affected

### Primary Component
- **DragAndDropCanvas.tsx** - Main seating plan layout component

### Secondary Components
- **Layout.astro** - Global application layout wrapper
- **AppShell.astro** - Page-level layout container
- **Footer** (inline in Layout.astro) - Global footer element

### Related Components (No Direct Changes)
- **UnassignedGuestList.tsx** - Left sidebar panel content
- **PlanSummary.tsx** - Right sidebar panel content
- **RulePreview.tsx** - Right sidebar panel content
- **TableWithSeats.tsx** - Center canvas content
- **EventNavTabs.astro** - Event-level navigation (remains separate from mobile nav)

---

## Current State Analysis

### Desktop Layout (≥ md breakpoint: 768px)

**DragAndDropCanvas Structure:**
```
┌─────────────────────────────────────────────┐
│ <div className="grid grid-cols-3 gap-4">   │
│  ┌──────────┬─────────────────┬───────────┐ │
│  │  LEFT    │     CENTER      │   RIGHT   │ │
│  │ col-span │   col-span-2    │ col-span  │ │
│  │    1     │                 │     1     │ │
│  │          │                 │           │ │
│  │ Sidebar  │  Canvas Area    │  Summary  │ │
│  │ (sticky) │  (scrollable)   │ (sticky)  │ │
│  └──────────┴─────────────────┴───────────┘ │
└─────────────────────────────────────────────┘
```

**Left Panel (col-span-1):**
- Unassigned Guest List
- Rule Preview
- Plan Summary

**Center Panel (col-span-2):**
- View mode toggle (Table View / Seat View)
- Seating arrangement canvas (drag-and-drop enabled)

**Right Panel (col-span-1):**
- Same as left panel (sticky sidebar)

**Current Issues on Mobile (<768px):**
- Three columns force horizontal scrolling
- Touch targets too small for drag operations
- Information density causes cognitive overload
- Sidebar content hidden or truncated

---

## Proposed Solution

### Desktop Behavior (≥ md: 768px)

**NO CHANGES** - Maintain existing functionality:
- Three-panel grid layout (`grid grid-cols-3`)
- Sticky sidebars
- All current interactions preserved
- Desktop footer remains visible

### Mobile Behavior (< md: 768px)

Transform into a **single-panel tabbed interface** with bottom navigation:

```
┌─────────────────────────┐
│                         │
│   ACTIVE PANEL          │
│   (Full Width)          │
│                         │
│   - Guests Panel   OR   │
│   - Canvas Panel   OR   │
│   - Summary Panel       │
│                         │
├─────────────────────────┤
│  ┌─────┬─────┬─────┐   │ ← Bottom Navigation (Fixed)
│  │Guest│Plan │Info │   │
│  └─────┴─────┴─────┘   │
└─────────────────────────┘
```

---

## Detailed Requirements

### 1. Panel Organization

#### Panel 1: "Guests" (Left Content)
**Purpose:** Manage unassigned guests and relationships

**Contents:**
- `<UnassignedGuestList />` component
- `<RulePreview />` component

**Mobile Behavior:**
- Full viewport width
- Scrollable vertically
- Maintains independent scroll position when switching panels

**Navigation Label:** "Guests"
**Icon:** User/People icon (from existing icon library)

---

#### Panel 2: "Plan" (Center Content)
**Purpose:** View and modify seating arrangements

**Contents:**
- View mode toggle (Table View / Seat View)
- Canvas area with drag-and-drop functionality
- All table components

**Mobile Behavior:**
- Full viewport width
- Optimized drag-and-drop for touch (increased touch targets)
- Maintains view mode selection (table/seat) when switching panels
- Preserves zoom/pan state if applicable

**Navigation Label:** "Plan"
**Icon:** Grid/Layout icon

---

#### Panel 3: "Summary" (Right Content)
**Purpose:** Review plan metrics and warnings

**Contents:**
- `<PlanSummary />` component
- Optimization score
- Guest counts
- Warnings/conflicts

**Mobile Behavior:**
- Full viewport width
- Scrollable vertically
- Real-time updates when assignments change

**Navigation Label:** "Summary"
**Icon:** Chart/Analytics icon

---

### 2. Bottom Navigation Component

#### Requirements

**Visual Design:**
- Fixed position at bottom of viewport
- Equal-width tabs (33.33% each)
- Elevated above content (z-index management)
- Solid white background (not translucent - per UI guidelines)
- Top border for visual separation

**Interaction Design:**
- Active state indication:
  - Primary color background for active tab
  - Icon + label color change
  - Subtle underline or indicator bar
- Tap feedback (ripple effect on touch)
- Minimum touch target: 56×56px (exceeds WCAG 44×44px minimum)

**Accessibility:**
- `role="navigation"` on container
- `aria-label="Seating plan navigation"`
- `aria-current="page"` on active tab
- Keyboard navigation support (arrow keys to switch tabs)
- Focus visible indicators
- Screen reader announcements on tab change

**Technical Constraints:**
- Must use Shadcn/ui components if available
- Tailwind CSS classes only (no custom CSS)
- Mobile-first responsive classes (`md:hidden` to hide on desktop)

---

### 3. Footer Visibility Management

#### Desktop (≥ md: 768px)
- Footer in `Layout.astro` remains **visible**
- No changes to existing footer content or styling
- Maintains current position (bottom of page, after main content)

#### Mobile (< md: 768px)
- Footer in `Layout.astro` becomes **hidden**
- Prevents visual clutter below bottom navigation
- Frees vertical space for content

**Implementation Approach:**
```astro
<!-- In Layout.astro, line 29-31 -->
<footer class="py-8 text-center text-sm text-muted-foreground border-t border-border/40 md:block hidden">
  <span class="font-medium">Sitting Planner</span>
</footer>
```

**Rationale:**
- Bottom navigation provides primary wayfinding on mobile
- Footer content (copyright, branding) is non-essential for task completion
- Reduces page height and scroll distance
- Aligns with mobile-first best practices (iOS Safari, Material Design guidelines)

---

### 4. State Management

#### Panel Switching Behavior

**State to Preserve:**
- Active panel selection (guests/plan/summary)
- Scroll position for each panel independently
- View mode selection (table/seat view) in Plan panel
- Drag-and-drop operation state (if mid-drag, cancel gracefully)

**Transition Behavior:**
- Smooth fade transition (300ms duration)
- No layout shift or content reflow
- Loading states if panel content requires data fetch
- Cancel active drag operation when switching panels

**Implementation Notes:**
- Use React state for active panel: `const [activePanel, setActivePanel] = useState<'guests' | 'plan' | summary'>('plan')`
- Store scroll positions: `const scrollPositions = useRef({ guests: 0, plan: 0, summary: 0 })`
- Restore scroll on panel mount: `useEffect(() => { scrollRef.current.scrollTop = scrollPositions.current[activePanel] })`

---

### 5. Responsive Breakpoint Strategy

**Breakpoint Definition:**
- Desktop: `md` and above (≥768px)
- Mobile: Below `md` (<768px)

**Implementation Pattern:**
```tsx
{/* Desktop: Three-column grid */}
<div className="hidden md:grid md:grid-cols-3 gap-4">
  {/* Existing desktop layout */}
</div>

{/* Mobile: Single panel + bottom nav */}
<div className="md:hidden">
  {/* New mobile layout */}
  <MobilePanelView activePanel={activePanel} />
  <BottomNavigation activePanel={activePanel} onPanelChange={setActivePanel} />
</div>
```

**Why `md` (768px)?**
- Aligns with Tailwind CSS defaults
- Industry-standard tablet/desktop breakpoint
- Matches AppShell.astro existing breakpoints (`md:p-6`)
- Sufficient width for three-column layout without cramping

---

## User Journey: Mobile Experience

### Scenario: Event Planner Assigns Guests on iPhone

1. **User opens seating plan page**
   - Lands on "Plan" panel (default active)
   - Sees full-width canvas with tables
   - Bottom navigation visible with "Plan" highlighted

2. **User needs to see unassigned guests**
   - Taps "Guests" in bottom navigation
   - Smooth transition to Guests panel
   - Sees full list of unassigned guests
   - Can scroll freely without canvas interference

3. **User drags guest to table**
   - Returns to "Plan" panel via bottom nav
   - Drags guest card to table (large touch targets)
   - Assignment completes successfully

4. **User checks optimization score**
   - Taps "Summary" in bottom navigation
   - Sees updated plan summary with new assignment
   - Reviews warnings if any

5. **User repeats workflow seamlessly**
   - Bottom navigation always visible
   - No need for back button or menu diving
   - Focused, distraction-free single-task views

---

## Accessibility Requirements

### WCAG 2.1 Level AA Compliance

#### Touch Targets (Success Criterion 2.5.5)
- All navigation tabs: Minimum 56×56px (exceeds 44×44px requirement)
- Guest cards (draggable): Minimum 48×48px
- Table drop zones: Minimum 60×60px
- Seat slots: Minimum 44×44px

#### Keyboard Navigation (Success Criterion 2.1.1)
- Tab key navigates between bottom nav items
- Arrow keys switch between panels (Left/Right)
- Enter/Space activates panel switch
- Escape key cancels drag operations

#### Screen Reader Support (Success Criterion 4.1.2)
- Announce panel changes: "Navigated to Guests panel"
- Announce drag actions: "Guest John Doe picked up. Drop on a table to assign."
- Live region for plan updates: "Guest assigned to Table 3"
- Descriptive labels for all interactive elements

#### Visual Design (Success Criterion 1.4.3, 1.4.11)
- Color contrast ratio ≥4.5:1 for text
- Color contrast ratio ≥3:1 for interactive elements
- Non-color indicators for active state (underline + background)
- Focus indicators clearly visible (2px outline)

---

## Technical Constraints

### Performance Requirements
- Initial render: <100ms for panel switch
- Transition animation: 300ms (no jank, 60fps)
- Touch response time: <50ms (perceived as instant)
- Bundle size increase: <10KB gzipped

### Browser Compatibility
- Safari iOS 14+ (primary mobile browser)
- Chrome Mobile 90+
- Firefox Mobile 90+
- Responsive down to 320px width (iPhone SE)

### Development Constraints
- No new external dependencies (use existing React, Tailwind, Shadcn/ui)
- TypeScript strict mode compliance
- Reuse existing components (no rewrites)
- Follow Astro 5 best practices (island architecture)

---

## Implementation Phases (High-Level)

### Phase 1: Layout Restructuring
- Add mobile/desktop conditional rendering in `DragAndDropCanvas.tsx`
- Extract panel content into separate components if needed
- Implement responsive grid → single column transformation

### Phase 2: Bottom Navigation Component
- Create `<BottomNavigation />` component
- Implement tab switching logic
- Add accessibility attributes

### Phase 3: State Management
- Add panel selection state
- Implement scroll position preservation
- Handle drag-and-drop state cleanup

### Phase 4: Footer Visibility
- Update `Layout.astro` with responsive footer classes
- Test across all application pages

### Phase 5: Testing & Refinement
- Manual testing on iOS/Android devices
- Accessibility audit with screen reader
- Performance profiling
- Cross-browser compatibility check

---

## Design System Integration

### Component References (Shadcn/ui)

**Bottom Navigation:**
- Base: Shadcn `Tabs` component (if suitable)
- Alternative: Custom component using Shadcn `Button` primitives
- Icons: lucide-react (already in use per tech stack)

**Visual Consistency:**
- Background: `bg-white` (solid, not translucent per UI guidelines)
- Border: `border-t border-border/40`
- Active state: `bg-primary text-primary-foreground`
- Inactive state: `text-muted-foreground`
- Shadows: `shadow-[var(--shadow-lg)]` (elevation)

**Typography:**
- Tab labels: `text-xs font-medium` (compact, legible)
- Icons: 20×20px size (balanced with labels)

---

## Non-Functional Requirements

### Usability
- Mobile users complete guest assignment task in ≤5 taps
- Panel switching perceived as "instant" (no perceived lag)
- Zero accidental mis-taps due to cramped UI

### Maintainability
- Code follows existing project patterns
- Components remain reusable across desktop/mobile
- Clear separation of concerns (presentation vs. logic)

### Scalability
- Pattern extensible to future panels (e.g., "Analytics", "Export")
- Bottom nav supports 3-5 tabs without redesign
- Component approach allows theming/customization

---

## Testing Criteria

### Functional Testing
- [ ] Desktop layout unchanged on screens ≥768px
- [ ] Mobile shows single panel on screens <768px
- [ ] Bottom navigation visible only on mobile
- [ ] Panel switching preserves scroll position
- [ ] All drag-and-drop functionality works on mobile (touch)
- [ ] Footer hidden on mobile, visible on desktop

### Accessibility Testing
- [ ] Passes axe DevTools scan (0 violations)
- [ ] Screen reader announces panel changes correctly
- [ ] Keyboard navigation works (no mouse required)
- [ ] Touch targets meet 44×44px minimum
- [ ] Color contrast ratios pass WCAG AA

### Performance Testing
- [ ] Panel switch completes in <100ms
- [ ] No layout shift during transitions
- [ ] 60fps maintained during animations
- [ ] Lighthouse mobile score ≥90

### Cross-Browser Testing
- [ ] Safari iOS 14-17
- [ ] Chrome Mobile (latest 2 versions)
- [ ] Firefox Mobile (latest version)
- [ ] Responsive down to 320px width

---

## Out of Scope

The following items are **not** included in this specification:

- Desktop layout changes (three-panel grid remains unchanged)
- Changes to drag-and-drop logic or functionality
- Modifications to guest/table data models
- New features (e.g., export, analytics)
- Dark mode specific adjustments (follows existing theme)
- Tablet-specific layouts (uses desktop layout at ≥768px)
- Gesture controls (swipe to switch panels - future consideration)
- Offline mode or PWA capabilities

---

## Risk Assessment

### Low Risk
- Footer visibility change (simple CSS class addition)
- Bottom navigation component (standard pattern)

### Medium Risk
- Panel switching state management (requires careful React state handling)
- Scroll position preservation (edge cases with dynamic content)

### Mitigation Strategies
- Thorough testing on physical devices (not just emulators)
- Incremental rollout (feature flag if possible)
- Fallback to desktop layout if JavaScript fails (progressive enhancement)

---

## Success Validation

### Metrics to Track Post-Launch

**Quantitative:**
- Mobile bounce rate on seating plan page (target: <20%)
- Mobile task completion rate (target: ≥80%)
- Average time to assign 10 guests on mobile (target: <2 minutes)
- WCAG accessibility score (target: 100% Level AA)

**Qualitative:**
- User feedback surveys (mobile usability rating ≥4/5)
- Support ticket reduction for mobile issues
- User interviews (5-10 participants)

---

## References

### Industry Standards
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/)
- [Apple Human Interface Guidelines - Tab Bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
- [Material Design - Bottom Navigation](https://m3.material.io/components/navigation-bar)
- [Nielsen Norman Group - Mobile UX](https://www.nngroup.com/articles/mobile-ux/)

### Internal Documentation
- [tech-stack.md](../tech-stack.md) - Technology decisions
- [project-prd.md](../project-prd.md) - Product requirements

---

## Approval & Sign-Off

**Prepared By:** Development Team
**Review Required From:**
- [ ] Product Owner
- [ ] UX Designer
- [ ] Frontend Lead
- [ ] Accessibility Specialist

**Approved By:** ___________________
**Date:** ___________________

---

## Revision History

| Version | Date       | Author | Changes                          |
|---------|------------|--------|----------------------------------|
| 1.0     | 2025-01-13 | Dev Team | Initial specification created   |

---

**END OF SPECIFICATION**
