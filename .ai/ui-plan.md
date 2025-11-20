# UI Architecture for EasySeating

## 0. Development Authentication Status

**IMPORTANT - Development Mode:**
- Authentication is currently **DISABLED** for development via the `DISABLE_AUTH=true` environment variable
- All API requests use a mock test user (`testuser@example.com`, ID: `e98fe906-d4e5-4151-b470-c1b1b2418723`)
- No JWT tokens are required during development
- See [.ai/re-enable-authentication-plan.md](.ai/re-enable-authentication-plan.md) for details on re-enabling authentication for production
- This allows rapid frontend development and testing without authentication overhead

## 1. UI Structure Overview

The EasySeating UI is designed as a single-page application (SPA) centered around a main dashboard for authenticated users. The architecture prioritizes a clear, hierarchical flow, enabling users to manage events, guests, and seating plans efficiently.

The structure is composed of three main areas:
1.  **Public Area:** Accessible to all users, containing the landing page, login, and registration views.
2.  **Authenticated Area (Dashboard):** The core of the application, protected by authentication. It features a persistent sidebar for primary navigation and a main content area that displays the selected view.
3.  **Event-Specific Area:** A nested section within the dashboard that uses a secondary, contextual navigation (e.g., tabs) to manage the details of a single event, including its guests, tables, and the seating plan itself.

The design emphasizes responsiveness, accessibility, and real-time feedback, ensuring a seamless user experience from event creation to final plan generation.

**Technical Implementation:**
- Built with Astro 5 framework for optimal performance and SSR capabilities
- Client-side data loading via fetch API for dynamic content
- Tailwind CSS for styling with glassmorphism design system
- Responsive mobile-first design approach

## 2. View List

### Authentication Views

-   **View Name:** Login
-   **View Path:** `/auth/login`
-   **Main Purpose:** To allow existing users to authenticate and access their dashboard.
-   **Key Information to Display:** Email and password fields, a login button, and a link to the registration page.
-   **Key View Components:** `LoginForm` component, `Input` fields, `Button`, `Card`.
-   **UX, Accessibility, and Security:**
    -   **UX:** Provide clear error messages for invalid credentials (`401 Unauthorized`). Upon successful login, redirect to the dashboard.
    -   **Accessibility:** Ensure all form fields have labels and are keyboard-navigable. Use `aria-live` regions for error messages.
    -   **Security:** The form will submit credentials over HTTPS. The API will handle password hashing and secure session creation.

-   **View Name:** Register
-   **View Path:** `/auth/register`
-   **Main Purpose:** To allow new users to create an account.
-   **Key Information to Display:** Email and password fields, a registration button, and a link to the login page.
-   **Key View Components:** `RegisterForm` component, `Input` fields, `Button`, `Card`.
-   **UX, Accessibility, and Security:**
    -   **UX:** Provide clear validation feedback (e.g., password strength). On success, log the user in and redirect to the dashboard.
    -   **Accessibility:** All form controls will be fully accessible.
    -   **Security:** The API will handle secure user creation and prevent email enumeration.

### Main Application Views

-   **View Name:** Dashboard (Event List)
-   **View Path:** `/dashboard`
-   **Main Purpose:** To provide an overview of all events created by the user and serve as the primary entry point for event management.
-   **Key Information to Display:** A list of events, each showing its name, date, and key stats (guest count, table count).
-   **Key View Components:** `EventCard`, `Button` (for creating a new event), `DataTable` or list component, `Search` and `Filter` controls.
-   **UX, Accessibility, and Security:**
    -   **UX:** Display a clear "Create New Event" button. Show a welcoming empty state if the user has no events. Use skeleton loaders while fetching data.
    -   **Accessibility:** Ensure the event list is navigable via keyboard. Cards and controls should have accessible names.
    -   **Security:** This view is protected and only accessible to authenticated users. API calls (`GET /api/events`) are authenticated.

-   **View Name:** Event Details
-   **View Path:** `/events/{id}`
-   **Main Purpose:** To act as a container for managing a specific event's details, including guests, tables, and the seating plan.
-   **Key Information to Display:** The event name and date in a header. The main content area will be rendered by sub-views.
-   **Key View Components:** `PageHeader`, `Tabs` or other secondary navigation component to switch between sub-views.
-   **UX, Accessibility, and Security:**
    -   **UX:** The contextual navigation makes it easy to switch between different aspects of event management without losing context.
    -   **Accessibility:** Tabs must be manageable with arrow keys and follow ARIA patterns.
    -   **Security:** Access is restricted to the event owner via API authorization (`403 Forbidden`).

### Event Sub-Views

-   **View Name:** Guest Management
-   **View Path:** `/events/{id}/guests`
-   **Main Purpose:** To manage all guests for a specific event with comprehensive profile information.
-   **Key Information to Display:**
    -   Searchable and sortable table of guests
    -   Guest name (required)
    -   Age range (optional: child, teen, adult, senior)
    -   Drinking habits (optional: none, light, moderate, heavy)
    -   Dietary restrictions (optional: text field for allergies, preferences)
    -   Hobbies/Interests (optional: multi-select tags or text)
    -   Topics to avoid (optional: text field)
    -   Seating assignment status (unassigned, assigned to table X)
    -   Relationship count indicator
-   **Key View Components:**
    -   `DataTable` with sorting/filtering/pagination
    -   `Button` for adding a single guest
    -   `Button` for bulk import (CSV)
    -   `Modal` for adding/editing a guest with tabbed interface:
        -   Tab 1: Basic Info (name, age, diet, drinking)
        -   Tab 2: Preferences (hobbies, topics to avoid)
        -   Tab 3: Relationships (managed via `GuestRelationshipManager`)
    -   `GuestRelationshipManager` component for defining relationships with other guests
    -   `BulkImportWizard` for CSV upload with field mapping
    -   `DeleteConfirmationDialog` for removing guests
-   **UX, Accessibility, and Security:**
    -   **UX:**
        -   The bulk import flow should be a guided, multi-step wizard within a modal
        -   Provide CSV template download option
        -   Show validation errors inline during bulk import with ability to fix or skip rows
        -   Editing a guest opens a modal with tabbed sections for organization
        -   Show relationship indicators on guest cards (e.g., "3 relationships")
        -   Auto-save draft changes to prevent data loss
        -   Provide search/filter by name, age range, dietary restrictions
        -   Export guest list to CSV
    -   **Accessibility:**
        -   The data table must be accessible with proper ARIA labels
        -   Screen readers can navigate rows and columns
        -   All modals trap focus and are dismissible via Escape
        -   Form fields have clear labels and validation messages
        -   Relationship manager provides keyboard navigation
    -   **Security:**
        -   All actions (create, update, delete) are authenticated and authorized by the API
        -   CSV upload limited to 1000 rows to prevent abuse
        -   File type validation (CSV only)
        -   Input sanitization for text fields

-   **View Name:** Table Management
-   **View Path:** `/events/{id}/tables`
-   **Main Purpose:** To define the tables available for the event and manage their configuration.
-   **Key Information to Display:**
    -   Grid or list of tables showing:
        -   Table name (required, e.g., "Table 1", "VIP Table")
        -   Capacity (required, number of seats)
        -   Number of currently assigned guests (e.g., "5 / 8")
        -   Visual capacity indicator (progress bar or fill indicator)
        -   Edit and delete action buttons
    -   Total capacity summary (total seats vs total guests)
    -   Empty state when no tables exist
-   **Key View Components:**
    -   `TableCard` or `DataTable` for displaying tables in grid/list layout
    -   `Modal` for adding a new table (simple form: name + capacity)
    -   `Modal` for editing an existing table
    -   `DeleteConfirmationDialog` for removing tables
    -   `Button` for adding tables
    -   `CapacityIndicator` component showing fill status
    -   `TotalCapacitySummary` showing overall event capacity vs guests
-   **UX, Accessibility, and Security:**
    -   **UX:**
        -   Provide clear feedback if a user tries to delete a table that has guests assigned (`409 Conflict`)
        -   Show warning dialog: "This table has X guests assigned. Please reassign them first."
        -   Visual feedback for overcapacity (table has more guests than capacity)
        -   Quick add: inline form for rapidly adding multiple tables with auto-incrementing names
        -   Bulk operations: "Add 10 tables" wizard for large events
        -   Drag-to-reorder tables for display preference
    -   **Accessibility:**
        -   All controls for adding/editing/deleting tables must be keyboard accessible
        -   Table cards have clear ARIA labels
        -   Action buttons have descriptive labels (not just icons)
        -   Confirmation dialogs are properly announced
    -   **Security:**
        -   API endpoints ensure users can only manage tables for their own events
        -   Validation prevents capacity < 1
        -   Cascade delete warnings for tables with guests

-   **View Name:** Seating Plan
-   **View Path:** `/events/{id}/plan`
-   **Main Purpose:** To generate, view, and manually adjust the seating plan. This is the core interactive feature.
-   **Key Information to Display:**
    -   Visual canvas showing all tables with assigned guests
    -   Unassigned guests panel (sidebar or bottom panel)
    -   Overall optimization score (0-100 scale with visual indicator)
    -   Score breakdown by factor (relationships, age compatibility, interests, etc.)
    -   Table capacity warnings (overcapacity indicators)
    -   Conflict indicators (incompatible guests at same table)
    -   Generation status (not generated, generating, generated, modified)
    -   Export/Print options
-   **Key View Components:**
    -   `DragAndDropCanvas` - Main seating area with visual table layout
    -   `TableComponent` (visual) - Circular or rectangular table visualization
    -   `GuestCard` (draggable) - Individual guest representation with avatar/name
    -   `UnassignedGuestsPanel` - List of guests not yet seated
    -   `Button` ("Generate Plan") - Triggers AI generation
    -   `Modal` (GenerationOptionsModal) - Configure AI optimization weights:
        -   Relationship priority (slider: 0-100%)
        -   Age compatibility (slider: 0-100%)
        -   Interests/hobbies match (slider: 0-100%)
        -   Avoid conflicts (checkbox: topics to avoid)
        -   Random seed option for reproducibility
    -   `OptimizationScorePanel` - Shows overall score and breakdown
    -   `ConflictNotifier` (Toast/Alert) - Real-time validation feedback
    -   `ValidationFeedbackPanel` - Detailed conflict list with suggestions
    -   `ExportMenu` - Dropdown with export options (PDF, CSV, Print)
    -   `LoadingOverlay` - Shown during AI generation with progress indicator
    -   `UndoRedoControls` - History navigation for manual changes
-   **UX, Accessibility, and Security:**
    -   **UX:**
        -   Use a loading indicator during AI generation (show estimated time)
        -   Provide immediate visual feedback (color-coding, icons) on conflicts when a guest is dropped on a new table
        -   Color code guests: green (well-matched), yellow (neutral), red (conflicts)
        -   Show relationship lines between connected guests (toggle on/off)
        -   Highlight alternative seats when dragging a guest
        -   Auto-save plan changes every 30 seconds
        -   Undo/redo stack for manual adjustments (Ctrl+Z / Ctrl+Y)
        -   Comparison view: show before/after when manually adjusting
        -   Export options:
            -   PDF with visual table layout and guest names
            -   CSV with table assignments for printing place cards
            -   Print-friendly view optimized for paper
        -   Regenerate specific table: allow partial regeneration
        -   Lock tables: prevent AI from modifying specific table assignments
    -   **Accessibility:**
        -   Provide a non-visual, keyboard-based alternative for moving guests
        -   "Move Guest" button on guest card opens modal to select destination table
        -   Screen reader announces drag-and-drop actions and results
        -   Keyboard shortcuts: Arrow keys to navigate, Enter to select, Escape to cancel
        -   High contrast mode support for visual indicators
        -   Text alternatives for all visual conflict/optimization indicators
    -   **Security:**
        -   The AI generation and validation endpoints are protected and rate-limited by the API
        -   Rate limit: max 10 generations per event per hour
        -   Validation API called on every manual change (debounced to 500ms)
        -   Export endpoints require authentication and event ownership
        -   PDF generation server-side to prevent client-side tampering

### Additional Application Views

-   **View Name:** Landing Page
-   **View Path:** `/`
-   **Main Purpose:** To introduce EasySeating to new users and provide clear calls-to-action.
-   **Key Information to Display:**
    -   Hero section with value proposition
    -   Feature highlights (AI-powered optimization, drag-and-drop interface, export options)
    -   How it works (3-4 step process visualization)
    -   Testimonials or example seating plans
    -   Pricing tiers (Free vs Premium)
    -   Call-to-action buttons (Sign Up, Try Demo)
-   **Key View Components:**
    -   `HeroSection` with background and CTA buttons
    -   `FeatureGrid` showcasing key features with icons
    -   `HowItWorksTimeline` showing the process
    -   `PricingTable` comparing Free and Premium plans
    -   `Footer` with links and contact info
-   **UX, Accessibility, and Security:**
    -   **UX:** Fast loading, mobile responsive, clear value proposition above the fold
    -   **Accessibility:** Semantic HTML, alt text for images, keyboard navigable
    -   **Security:** No authentication required, public access

-   **View Name:** Templates (Future Feature)
-   **View Path:** `/templates`
-   **Main Purpose:** To manage saved seating plan templates for reuse across events.
-   **Key Information to Display:**
    -   Grid of saved templates with preview thumbnails
    -   Template name, creation date, guest count, table count
    -   Filter by tags or event type
    -   Template sharing status (private/shared)
-   **Key View Components:**
    -   `TemplateCard` with preview, name, and metadata
    -   `Button` for creating new template from current event
    -   `Modal` for template details and application
    -   `ShareTemplateDialog` for sharing with other users (Premium)
-   **UX, Accessibility, and Security:**
    -   **UX:** Visual previews, easy filtering, one-click apply to new event
    -   **Accessibility:** Cards navigable by keyboard, clear labels
    -   **Security:** Templates belong to user, sharing requires Premium subscription

-   **View Name:** Account Settings
-   **View Path:** `/account`
-   **Main Purpose:** To manage user profile, subscription, and preferences.
-   **Key Information to Display:**
    -   Profile information (email, name)
    -   Subscription status (Free/Premium)
    -   Billing information (for Premium users)
    -   Preferences (email notifications, default optimization weights)
    -   Account security (password change, delete account)
-   **Key View Components:**
    -   `ProfileForm` for updating user information
    -   `SubscriptionPanel` showing current plan and upgrade option
    -   `BillingInformation` for payment method management
    -   `PreferencesForm` for app settings
    -   `SecuritySettings` for password management
    -   `DangerZone` for account deletion
-   **UX, Accessibility, and Security:**
    -   **UX:** Tabbed interface for organization, clear upgrade prompts for Premium
    -   **Accessibility:** All forms accessible, clear error messages
    -   **Security:** Password change requires current password, account deletion requires confirmation

-   **View Name:** Password Reset
-   **View Path:** `/auth/reset-password`
-   **Main Purpose:** To allow users to reset their password if forgotten.
-   **Key Information to Display:**
    -   Email input field
    -   Success message after email sent
    -   New password form (when accessed via reset link)
-   **Key View Components:**
    -   `PasswordResetRequestForm` for email submission
    -   `PasswordResetForm` for setting new password
    -   `SuccessMessage` confirming reset email sent
-   **UX, Accessibility, and Security:**
    -   **UX:** Clear instructions, link expiration notice, redirect to login after success
    -   **Accessibility:** Form fields labeled, error messages announced
    -   **Security:** Email verification required, reset links expire after 1 hour, rate-limited

## 3. User Journey Map

This map describes the primary user journey for creating a new seating plan.

1.  **Registration/Login:**
    -   A new user visits the site and navigates to the **Register** view.
    -   They fill out the form and are redirected to the **Dashboard**.
    -   An existing user visits the site, enters their credentials in the **Login** view, and is redirected to the **Dashboard**.

2.  **Event Creation:**
    -   On the **Dashboard**, the user clicks "Create New Event."
    -   A modal appears, prompting for an event name and date.
    -   Upon submission, the user is navigated to the **Event Details** view for the newly created event, landing on the **Guest Management** sub-view.

3.  **Data Entry:**
    -   In the **Guest Management** view, the user adds guests one by one or uses the bulk import feature.
    -   While adding/editing a guest, they can define relationships with other guests.
    -   The user navigates to the **Table Management** sub-view to add tables and define their capacities.

4.  **Plan Generation and Adjustment:**
    -   The user navigates to the **Seating Plan** sub-view.
    -   They click "Generate Plan," configure the AI optimization weights in a modal, and start the generation.
    -   The UI shows a loading state, then displays the generated plan with guests assigned to tables.
    -   The user reviews the plan. They can drag and drop a guest from one table to another to make manual adjustments.
    -   The UI calls the validation API on drop and immediately shows any new conflicts or score changes.

5.  **Finalization:**
    -   Once satisfied, the user can use the "Export" or "Print" function to get a physical or digital copy of the plan.
    -   The plan is automatically saved. The user can log out or return to the dashboard.

## 4. Layout and Navigation Structure

The navigation is designed to be hierarchical and context-aware, based on the decisions from the planning session.

-   **Primary Navigation (Persistent Sidebar):**
    -   A vertical sidebar is always visible in the authenticated area.
    -   It contains links to top-level views:
        -   **Dashboard** (`/dashboard`): The main landing page.
        -   **Templates** (`/templates`): For managing saved templates (future feature).
        -   **Account/Settings** (`/account`): For managing user profile and subscription.
    -   It also includes the application logo and a logout button/user profile section at the bottom.

-   **Secondary Navigation (Contextual Tabs):**
    -   When a user selects an event and enters the **Event Details** view, a secondary navigation bar (e.g., a set of tabs) appears below the main header.
    -   This navigation is specific to the selected event and allows switching between its sub-views:
        -   **Guests** (`/events/{id}/guests`)
        -   **Tables** (`/events/{id}/tables`)
        -   **Seating Plan** (`/events/{id}/plan`)

This two-tiered structure keeps the primary navigation clean while providing focused controls for the complex task of event management.

## 5. Key Components

These are reusable components that form the building blocks of the UI. All components follow accessibility best practices and are styled with Tailwind CSS using the glassmorphism design system.

### Core UI Components

-   **DataTable:**
    -   Versatile table component with built-in support for sorting, filtering, and pagination
    -   Used for displaying lists of events, guests, and tables
    -   Features: column sorting (click header), text filter, row selection, custom cell renderers
    -   Responsive: collapses to card view on mobile
    -   Accessibility: ARIA grid pattern, keyboard navigation
    -   Empty state support with custom messaging

-   **Modal:**
    -   Generic modal component used for forms, confirmation dialogs, and detailed information
    -   Features: backdrop click to close, Escape key to dismiss, focus trap, scroll lock
    -   Variants: small (alerts), medium (forms), large (detailed content), fullscreen (mobile)
    -   Accessibility: ARIA dialog pattern, announces title to screen readers
    -   Animation: fade in/out with scale transform

-   **Card:**
    -   Flexible content container with glassmorphism styling
    -   Variants: `EventCard`, `GuestCard`, `TableCard`, `TemplateCard`
    -   Features: hover effects, optional action buttons, status badges
    -   Supports header, body, and footer sections
    -   Responsive padding and spacing

-   **PageHeader:**
    -   Consistent header for each view with title and action buttons
    -   Features: breadcrumbs navigation, contextual actions (e.g., "Create Event")
    -   Responsive: stacks on mobile, horizontal on desktop
    -   Includes back button for nested views

-   **Button:**
    -   Standardized button component with multiple variants
    -   Variants: primary, secondary, danger, ghost, link
    -   Sizes: small, medium, large
    -   States: default, hover, active, disabled, loading
    -   Icons: optional left/right icon support
    -   Accessibility: proper focus indicators, disabled state handling

### Specialized Components

-   **DragAndDropCanvas:**
    -   Specialized container for the seating plan view
    -   Manages state and logic for dragging guests and dropping onto tables
    -   Features: drag preview, drop zones, collision detection, snap-to-grid
    -   Accessibility: keyboard-based alternative via "Move Guest" modal
    -   Visual feedback: highlight valid drop zones, show conflicts

-   **GuestRelationshipManager:**
    -   Complex component for defining relationships between guests
    -   Features: search other guests, select relationship type (family, friend, colleague, avoid)
    -   Visual: graph or list view showing connections
    -   Bi-directional relationships: adding "A knows B" also adds "B knows A"
    -   Accessibility: keyboard navigable, clear relationship labels

-   **BulkImportWizard:**
    -   Multi-step wizard for CSV upload and field mapping
    -   Step 1: File upload with drag-and-drop
    -   Step 2: Field mapping (CSV columns → guest attributes)
    -   Step 3: Validation and error handling
    -   Step 4: Confirmation and import
    -   Features: download CSV template, skip invalid rows, show progress

-   **OptimizationScorePanel:**
    -   Displays overall seating plan optimization score (0-100)
    -   Visual: circular progress indicator with color coding (red < 60, yellow 60-80, green > 80)
    -   Breakdown: shows score by factor (relationships, age, interests, conflicts)
    -   Expandable details: click to see detailed scoring explanation

-   **ValidationFeedbackPanel:**
    -   Shows detailed list of conflicts and suggestions
    -   Features: filter by severity (error, warning, info), group by table
    -   Interactive: click conflict to highlight affected guests
    -   Suggestions: AI-powered recommendations for resolving conflicts

### Utility Components

-   **ConflictNotifier:**
    -   Toast notification system for real-time feedback
    -   Variants: success, error, warning, info
    -   Auto-dismiss after configurable timeout (default 5s)
    -   Stacks multiple notifications
    -   Accessibility: uses `aria-live="polite"` for announcements

-   **GlobalErrorHandler:**
    -   Error boundary component that catches critical errors
    -   Displays user-friendly error message with retry option
    -   Logs errors to console (and external service in production)
    -   Prevents application crash
    -   Fallback UI: shows error state with contact support link

-   **SkeletonLoader:**
    -   Placeholder component indicating content is loading
    -   Variants: text lines, cards, tables, custom shapes
    -   Animated shimmer effect for visual feedback
    -   Improves perceived performance
    -   Matches layout of actual content

-   **EmptyState:**
    -   Displayed when lists/collections have no items
    -   Features: icon, title, description, call-to-action button
    -   Contextual messaging (e.g., "No guests yet. Add your first guest.")
    -   Illustrations or icons for visual interest

-   **LoadingOverlay:**
    -   Full-page or section overlay during async operations
    -   Features: spinner, progress percentage (if available), status message
    -   Used during AI generation, data exports, bulk operations
    -   Prevents interaction while loading
    -   Accessibility: announces loading state to screen readers

### Form Components

-   **Input:**
    -   Text input with label, validation, and error messages
    -   Variants: text, email, password, number, date
    -   Features: prefix/suffix icons, character counter, autocomplete
    -   Validation: real-time with debounce, shows error state
    -   Accessibility: associated labels, aria-invalid, error announcements

-   **Select:**
    -   Dropdown select component
    -   Features: search/filter options, multi-select, custom option renderer
    -   Accessibility: keyboard navigable, ARIA combobox pattern
    -   Responsive: native select on mobile for better UX

-   **Slider:**
    -   Range input for optimization weight configuration
    -   Features: min/max labels, current value display, step increments
    -   Accessibility: keyboard control (arrow keys), ARIA slider pattern
    -   Visual feedback: colored track showing fill

-   **Checkbox/Toggle:**
    -   Boolean input with label
    -   Variants: checkbox, toggle switch
    -   Features: indeterminate state, disabled state
    -   Accessibility: proper ARIA roles, keyboard toggleable

## 6. State Management and Data Flow

### Client-Side State Management

The application uses a combination of local component state and client-side fetch for data management:

-   **Local Component State:** For UI-only state (modals, accordions, form inputs)
-   **Fetch-Based Data Loading:** Client-side fetch API calls to backend REST API
-   **URL State:** Event ID and current view stored in URL for bookmarkability
-   **Auto-Save Pattern:** Changes auto-saved to backend every 30 seconds
-   **Optimistic Updates:** UI updates immediately, then syncs with server
-   **Debouncing:** Validation API calls debounced to 500ms to reduce server load

### Data Loading Patterns

**Pattern 1: Client-Side Fetch with Loading States**
```javascript
// Used in tables.astro, guests.astro
async function loadData() {
  setLoading(true);
  try {
    const res = await fetch(`/api/events/${eventId}/guests`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    setGuests(data.data);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
}
```

**Pattern 2: Optimistic Updates**
```javascript
// Update UI immediately, rollback on error
function moveGuest(guestId, tableId) {
  const previousState = getCurrentState();
  updateUIOptimistically(guestId, tableId);

  fetch(`/api/events/${eventId}/seating-plans/assignments`, {
    method: 'POST',
    body: JSON.stringify({ guest_id: guestId, table_id: tableId })
  })
  .catch(() => rollbackUI(previousState));
}
```

### Error Handling Strategy

**HTTP Status Code Handling:**
- `401 Unauthorized`: Redirect to login (or bypass in dev mode)
- `403 Forbidden`: Show "Access Denied" message
- `404 Not Found`: Show "Resource not found" message
- `409 Conflict`: Show specific conflict message (e.g., "Table has guests assigned")
- `422 Unprocessable Entity`: Show validation errors inline on form fields
- `429 Too Many Requests`: Show "Please wait before trying again"
- `500 Server Error`: Show generic error with retry option

**Error Display Patterns:**
- **Inline Form Errors:** Show below/next to affected field
- **Toast Notifications:** For non-critical errors and success messages
- **Error Modals:** For critical errors requiring user acknowledgment
- **Error Boundaries:** Catch React/component errors and show fallback UI

### API Integration

**Base URL Configuration:**
- Development: `http://localhost:3000/api` (or current dev server port)
- Production: Same origin `/api` (Astro handles routing)

**Request Headers:**
```javascript
headers: {
  'Content-Type': 'application/json',
  // Authentication handled by cookies in production
  // In development, DISABLE_AUTH=true bypasses this
}
```

**Response Format (Standard):**
```json
{
  "data": [...],
  "error": null
}
```

**Error Response Format:**
```json
{
  "data": null,
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "details": { /* additional context */ }
  }
}
```

## 7. Responsive Design and Mobile Considerations

### Breakpoints (Tailwind CSS)
- **sm:** 640px - Small tablets, large phones in landscape
- **md:** 768px - Tablets
- **lg:** 1024px - Small laptops
- **xl:** 1280px - Desktops
- **2xl:** 1536px - Large desktops

### Mobile-Specific Adaptations

**Navigation:**
- Desktop: Persistent sidebar
- Mobile: Hamburger menu with drawer navigation

**Data Tables:**
- Desktop: Full table with all columns
- Mobile: Collapse to card list with essential info only

**Seating Plan Canvas:**
- Desktop: Full drag-and-drop interface
- Mobile: Tap guest → select table via modal (drag-and-drop difficult on touch)

**Forms:**
- Desktop: Multi-column layouts where appropriate
- Mobile: Single column, full-width inputs

**Modals:**
- Desktop: Centered overlay with max-width
- Mobile: Full-screen on small devices

### Touch Optimization
- Minimum touch target: 44x44px (WCAG guideline)
- Swipe gestures for navigation where appropriate
- Native select dropdowns on mobile for better UX
- Larger tap targets for drag handles on mobile

## 8. Accessibility Requirements

### WCAG 2.1 Level AA Compliance

**Keyboard Navigation:**
- All interactive elements accessible via Tab/Shift+Tab
- Logical tab order matching visual layout
- Skip links for bypassing navigation
- Keyboard shortcuts documented and accessible

**Screen Reader Support:**
- Semantic HTML elements (nav, main, section, article)
- ARIA labels for interactive components
- ARIA live regions for dynamic content updates
- Alt text for all images and icons

**Visual Accessibility:**
- Color contrast ratio ≥ 4.5:1 for normal text
- Color contrast ratio ≥ 3:1 for large text and UI components
- Information not conveyed by color alone
- Focus indicators visible and high contrast
- Text resizable up to 200% without loss of functionality

**Form Accessibility:**
- All inputs have associated labels
- Error messages linked to form fields via aria-describedby
- Required fields indicated with both visual and text indicators
- Autocomplete attributes for common fields

**Interactive Component Patterns:**
- Modals: ARIA dialog pattern, focus trap
- Tabs: ARIA tabs pattern, arrow key navigation
- Dropdowns: ARIA combobox/listbox pattern
- Drag-and-drop: Keyboard alternative provided

## 9. Performance Optimization

### Loading Performance
- Lazy load images and heavy components
- Code splitting by route (Astro automatic)
- Prefetch critical API data during SSR where applicable
- Minimize bundle size (tree-shaking, minification)

### Runtime Performance
- Debounce expensive operations (search, validation)
- Virtual scrolling for large lists (1000+ items)
- Memoize expensive calculations
- Optimize re-renders (React.memo, useMemo where applicable)

### Perceived Performance
- Skeleton loaders during data fetch
- Optimistic UI updates
- Progressive image loading
- Instant page transitions with view transitions API

### Caching Strategy
- API responses cached client-side (15 minutes)
- Static assets cache-busted on deployment
- Service worker for offline support (future enhancement)

## 10. Design System and Styling

### Glassmorphism Theme
The UI uses a glassmorphism design aesthetic with the following characteristics:

**Visual Style:**
- Semi-transparent backgrounds with backdrop blur
- Subtle borders with white/40% opacity
- Soft shadows for depth
- Gradients for visual interest (background, accents)
- Rounded corners (0.5rem to 2rem radius)

**Color Palette:**
- Primary: Pink/Rose shades (#ec4899, #db2777)
- Secondary: Purple/Violet shades
- Neutral: Gray scale for text and borders
- Success: Green (#10b981)
- Warning: Yellow/Amber (#f59e0b)
- Error: Red (#ef4444)
- Info: Blue (#3b82f6)

**Typography:**
- Font Family: System font stack (default) or custom font
- Headings: Bold weight, larger size
- Body: Regular weight, comfortable reading size (16px base)
- Code/Monospace: For technical content

**Spacing Scale:**
- Based on Tailwind CSS spacing (4px increments)
- Consistent padding/margin throughout

**Component Styling Guidelines:**
- Cards: `bg-white/70 backdrop-blur rounded-2xl border border-white/40 shadow`
- Buttons: `rounded-full bg-pink-500 hover:bg-pink-600 text-white font-semibold px-6 py-2`
- Inputs: `rounded-xl border border-gray-300 px-3 py-2`
- Focus states: Ring with primary color

### Animation and Transitions
- Subtle transitions for interactive elements (150-300ms)
- Smooth page transitions
- Loading spinners and progress indicators
- Micro-interactions for user feedback (button press, hover states)

## 11. Premium Features UI Differentiation

### Visual Indicators
- Premium badge/icon on user profile
- "Premium" labels on exclusive features
- Upgrade prompts in-context (e.g., "Upgrade to Premium for custom designs")

### Upgrade Flow
1. User clicks on premium feature or "Upgrade" button
2. Modal shows pricing comparison (Free vs Premium)
3. Payment form (Stripe integration)
4. Confirmation and redirect back to app with premium access

### Premium-Only Features (UI Treatment)
- Templates sharing: Disabled with lock icon + upgrade prompt
- Custom design requests: "Contact us" form only visible to premium users
- Advanced export formats: Grayed out with upgrade tooltip
- Priority support: Badge in help/support section
