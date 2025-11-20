# View Implementation Plan: Seating Plan

## 1. Overview

The Seating Plan view (`/events/{id}/plan`) allows users to generate an AI-optimized seating plan, review the generated assignments visually, and perform manual adjustments with immediate validation and feedback. The view must present tables and guests, support drag-and-drop reassignments, provide keyboard-accessible alternatives for moving guests, show optimization scores and warnings, and integrate with the API endpoints for generation and validation.

## 2. View Routing

- Path: `/events/{event_id}/plan`
- Protected: Requires authenticated session and event ownership (API returns `403` otherwise).

## 3. Component Structure

- SeatingPlanPage (page wrapper)
  - PageHeader
  - PlanToolbar
    - GenerateButton -> GenerationModal
    - AutoArrangeToggle
    - ExportButton
  - SeatingPlanLayout (two-column layout)
    - DragAndDropCanvas (main visual canvas)
      - TableComponent[]
        - GuestCard[] (draggable)
      - CanvasOverlay (for temporary states, drop targets)
    - SidePanel
      - UnassignedGuestList (GuestCard[] draggable)
      - PlanSummary (optimization score, stats, warnings)
  - ConflictNotifier (toast or inline)
  - MoveGuestModal (keyboard/assistive move)
  - GlobalErrorBoundary

## 4. Component Details

### SeatingPlanPage
- Description: Page-level wrapper that orchestrates data loading and provides context for subcomponents.
- Main elements: `PageHeader`, `SeatingPlanLayout`, `GenerationModal`, `ConflictNotifier`.
- Events: page mount triggers data fetch; `Generate` triggers plan generation workflow.
- Validation: verifies `event_id` and that `tables.length > 0` and `guests.length > 0` before enabling generation.
- Types: `EventSummary`, `SeatingPlanVM`.
- Props: `eventId` from route.

### PlanToolbar
- Description: Controls for generating plan, toggling auto-arrange, exporting, and adjusting weights.
- Elements: `Button` controls, weight sliders (in `GenerationModal`).
- Events: `onGenerateClick`, `onExportClick`, `onAutoArrangeToggle`.
- Validation: disable `Generate` when insufficient data or while generation is running.
- Types: `GenerateOptions`.
- Props: `onGenerate(options)`, `isGenerating`, `disabled`.

### DragAndDropCanvas
- Description: Visual container for table components and their assigned guests. Hosts drag-and-drop handlers.
- Elements: `TableComponent` instances rendered at logical grid positions; visual drop indicators; zoom/pan controls (optional).
- Events: `onDragStart(guestId)`, `onDrop(guestId, toTableId, position)`, `onGuestClick(guestId)`.
- Validation: drop event triggers `validateAssignmentChange` and `mutateAssignment`.
- Types: `TableVM`, `GuestVM`, `AssignmentVM`.
- Props: `tables`, `assignments`, `guests`, `onDrop`.

### TableComponent
- Description: Visual representation of a single table, capacity, and assigned guests.
- Elements: table header (name, capacity), seats rendered as slots, GuestCard components.
- Events: `onSeatClick(guestId?)`, internal drag target events.
- Validation: show capacity warnings when assigned_count >= capacity; disable drop when full unless replacing.
- Types: `TableVM`.
- Props: `table`, `assignedGuests`, `onDrop`.

### GuestCard
- Description: Draggable card representing a guest with contextual actions (move, view details, edit).
- Elements: name, age range, dietary tags, icons for conflicts; drag handle.
- Events: `onDragStart`, `onContextMenu` (show move/delete/edit), `onMoveKeyboard` (open MoveGuestModal).
- Validation: display validation state (e.g., conflict severity) provided by latest validation result.
- Types: `GuestVM`.
- Props: `guest`, `assignment`, `onDragStart`.

### UnassignedGuestList
- Description: Side panel list of unassigned guests (draggable into canvas).
- Elements: searchable list, filters, GuestCard items.
- Events: `onGuestDragStart`, `onQuickAssign(guestId, tableId)`.
- Validation: accept quick assign only if table has capacity.
- Types: `GuestVM[]`.
- Props: `guests`, `onQuickAssign`.

### PlanSummary
- Description: Shows summary statistics: optimization score, total guests, assigned/unassigned counts, warnings.
- Elements: score badge, small list of warnings, suggested improvements.
- Events: none, except refresh actions.
- Types: `PlanSummaryVM`.
- Props: `planSummary`.

### GenerationModal
- Description: Modal to configure generation weights and start AI generation.
- Elements: sliders/inputs for weights, preserve assignments selector, constraints input (must seat together / must separate), `Start` and `Cancel` buttons.
- Events: `onStart(generateOptions)`.
- Validation: ensure weights are within 0-10 and that required constraints are valid.
- Types: `GenerateOptions`, `GenerateRequest`.
- Props: `isOpen`, `onClose`, `onStart`.

### MoveGuestModal
- Description: Keyboard-accessible modal to move a guest to another table (alternative to drag-and-drop).
- Elements: select list of tables, capacity indicators, confirm/cancel buttons.
- Events: `onConfirm(newTableId)`.
- Validation: block selection of tables at capacity unless the user chooses to swap.
- Types: `MoveRequest`.
- Props: `guest`, `tables`, `onConfirm`, `onClose`.

### ConflictNotifier
- Description: Shows validation results from `validate` endpoint with conflicts, severity, and messages.
- Elements: Toast list or inline alerts.
- Events: user can click to view conflict details or revert change.
- Types: `ValidateResult`.
- Props: `results`.

## 5. Types

### DTOs (from API plan mapping)
- `GuestDTO`:
  - `id: number`
  - `event_id: number`
  - `name: string`
  - `age_range?: string`
  - `drinking_habits?: string`
  - `dietary_restrictions?: string`
  - `hobbies_interests?: string`
  - `topics_to_avoid?: string`
  - `table_assignment?: { table_id: number; table_name?: string } | null

- `TableDTO`:
  - `id: number`
  - `event_id: number`
  - `name: string`
  - `capacity: number`
  - `assigned_count?: number`

- `AssignmentDTO`:
  - `id: number`
  - `event_id: number`
  - `guest_id: number`
  - `table_id: number`

- `SeatingPlanDTO` (response of generate):
  - `plan_id: string`
  - `status: string`
  - `optimization_score: number`
  - `assignments: Array<{ guest_id:number; guest_name:string; table_id:number; table_name:string; compatibility_score:number; alternative_tables?: any[] }>`
  - `statistics: { total_guests:number; assigned:number; unassigned:number; tables_used:number; average_table_compatibility:number }
  - `warnings?: string[]`

- `ValidateResultDTO` (response of validate):
  - `overall_impact: { current_score:number; projected_score:number; score_change:number }
  - `conflicts: Array<{type:string; guest1_id:number; guest2_id:number; severity:string; message:string}>
  - `recommendations: string[]`

### ViewModel Types (frontend)
- `GuestVM` extends `GuestDTO` with:
  - `conflicts?: Array<{type:string; severity:string; message:string}>`
  - `assignedTableId?: number | null`

- `TableVM` extends `TableDTO` with:
  - `assignedGuests: GuestVM[]`
  - `availableSeats: number`

- `PlanSummaryVM`:
  - `optimizationScore: number`
  - `totalGuests: number`
  - `assigned: number`
  - `unassigned: number`
  - `warnings: string[]`

- `GenerateOptions`:
  - `relationships_weight?: number`
  - `age_compatibility_weight?: number`
  - `drinking_habits_weight?: number`
  - `hobbies_weight?: number`
  - `dietary_restrictions_weight?: number`
  - `preserve_assignments?: number[]`
  - `constraints?: { must_seat_together?: number[][]; must_separate?: number[][] }

## 6. State Management

- Use React Query (recommended) or SWR for server state (guests, tables, assignments, plan). React Query is preferred because of mutation support and optimistic updates.
- Local UI state via React `useState` and context for drag/drop transient state.
- Suggested custom hooks:
  - `useSeatingData(eventId)` — fetches guests, tables, assignments, returns VMs and provides refetch/mutations.
  - `useGeneratePlan(eventId, options)` — triggers POST `/api/events/{event_id}/seating-plans/generate`, polls or retrieves plan by `plan_id` if async.
  - `useValidateChange(eventId)` — POST `/api/events/{event_id}/seating-plans/validate` to validate proposed changes.
  - `useAssignmentMutations(eventId)` — handles create/update/delete assignment endpoints with optimistic updates and rollback on error.

State variables:
- `tables: TableVM[]`
- `guests: GuestVM[]`
- `assignments: AssignmentDTO[]` or derived mapping guest->table
- `planSummary: PlanSummaryVM`
- `isGenerating: boolean`
- `validationResults: ValidateResultDTO | null`
- `dragState: { guestId?: number; originTableId?: number }`
- `moveModalState: { open: boolean; guest?: GuestVM }`

## 7. API Integration

### Required API calls
- `GET /api/events/{event_id}/guests` — fetch guests
- `GET /api/events/{event_id}/tables` — fetch tables
- `GET /api/events/{event_id}/assignments` — fetch assignments (or combine with guests)
- `POST /api/events/{event_id}/seating-plans/generate` — generate seating plan
  - Request: `GenerateOptions`
  - Response: `SeatingPlanDTO` (may be synchronous or async; handle `status`)
- `GET /api/seating-plans/{plan_id}` — retrieve generated plan (if generation returns plan_id)
- `POST /api/events/{event_id}/seating-plans/validate` — validate proposed changes
  - Request: `{ changes: [{ guest_id, from_table_id, to_table_id }] }`
  - Response: `ValidateResultDTO`
- `POST /api/assignments` — create new assignment
- `PATCH /api/assignments/{id}` — update assignment
- `PATCH /api/events/{event_id}/assignments/bulk` — bulk assignment updates
- `DELETE /api/assignments/{id}` — delete assignment

### Frontend action mapping
- Generate: call generate endpoint -> poll GET plan -> update assignments and planSummary
- Drop guest: call validate -> if acceptable, call PATCH assignment (or POST new assignment) optimistic update, then show validation results
- Keyboard move: call validate then perform assignment mutation
- Undo/Redo: keep local history stack and revert via API bulk update when applicable

## 8. User Story Mapping

- **US-002 Automated Seating Plan Generation**
  - UI: `GenerationModal` to set weights -> `PlanToolbar` -> `useGeneratePlan`
  - API: `POST /generate`, `GET /seating-plans/{plan_id}`
  - Components: `PlanSummary`, `DragAndDropCanvas` to display results

- **US-003 Manual Seating Plan Adjustment**
  - UI: `DragAndDropCanvas`, `GuestCard`, `MoveGuestModal` -> `useValidateChange`, `useAssignmentMutations`
  - API: `POST /validate`, `PATCH /assignments/{id}` or `PATCH /events/{id}/assignments/bulk`
  - Features: real-time feedback, undo/redo

- **US-004 Seating Plan Templates**
  - Not fully implemented here, but saving/exporting will use `POST /events/{id}/templates` (future)

- **US-001 Guest Details Input**
  - Guest editing integrated via modal from `GuestCard`, uses `POST /events/{id}/guests` and `PATCH /guests/{id}`

## 9. User Interactions and Outcomes

- Drag guest to table -> show drop indicator -> on drop, call `validate` -> if success, optimistic assignment -> show updated score and any conflicts.
- Drag guest to full table -> show visual disabled state -> disallow drop unless replacing.
- Click `Generate` -> open `GenerationModal` -> confirm -> show `isGenerating` -> display plan when ready.
- Click guest "Move (keyboard)" -> open `MoveGuestModal` -> select table -> validate -> commit change.
- View validation conflict -> `ConflictNotifier` allows user to view details and revert last change.

## 10. Conditions and Validation

- Generation requires at least one table and at least one guest: UI prevents generation otherwise.
- Assignments must not exceed table capacity: validation/assignment endpoints return `409` or validation indicates conflict.
- All API calls require a valid access token; on `401` redirect to login.
- Rate limits (429) on generation calls: UI must show polite message and retry guidance.

## 11. Error Handling

- Network error: show a persistent banner with retry.
- 401 Unauthorized: redirect to `/auth/login` with a message about session expiration.
- 403 Forbidden: display an authorization error and prevent edits.
- 409 Conflict (table capacity): show inline error, revert optimistic change.
- 429 Rate limit: show informative toast and disable generation control briefly.
- 500+ server error: global error boundary shows fallback and suggests retry.

## 12. Implementation Steps

1. Create route file at `src/pages/events/[eventId]/plan.astro` that mounts `SeatingPlanPage` and passes `eventId`.
2. Implement data hooks: `useSeatingData`, `useAssignmentMutations`, `useGeneratePlan`, `useValidateChange`.
3. Build `SeatingPlanPage` that fetches data and renders `PlanToolbar`, `SeatingPlanLayout`.
4. Implement `DragAndDropCanvas` and `TableComponent` with accessible drag-and-drop (use `react-dnd` or `@dnd-kit/core`).
5. Implement `GuestCard` with drag handle and keyboard move action.
6. Implement `UnassignedGuestList` and `PlanSummary` components.
7. Implement `GenerationModal` with weight controls and POST generation behavior.
8. Implement `validate` logic on drop with optimistic updates and rollback.
9. Implement `ConflictNotifier` and undo/redo stack.
10. Add tests for key interactions and accessibility checks (keyboard move, ARIA roles).

---

Now I'll write the final implementation plan file. 