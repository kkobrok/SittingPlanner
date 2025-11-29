# Domain-Driven Design: Domain Extraction & Refactoring Strategy

## Document Information

**Project:** SittingPlanner (EasyWedding MVP)
**Date:** 2025-01-13
**Version:** 1.0
**Purpose:** Strategic and Tactical DDD patterns for domain extraction and maintainability improvement

---

## Executive Summary

The SittingPlanner application has grown organically and now exhibits signs of a **distributed monolith** with cross-cutting concerns, anemic domain models, and tightly coupled layers. This document proposes a comprehensive Domain-Driven Design (DDD) refactoring strategy to extract **bounded contexts**, implement **tactical patterns**, and establish clear **domain boundaries**.

---

## Current State Analysis

### Identified Anti-Patterns

#### 1. **Anemic Domain Model**
```typescript
// Current: DTOs everywhere, no domain logic
interface GuestEntity {
  id: number;
  name: string;
  event_id: number;
  dietary_restrictions: string | null;
}

// Services contain ALL business logic
class GuestsService {
  async createGuest(data: CreateGuestDto) {
    // Validation here
    // Business rules here
    // Persistence here
  }
}
```

**Problems:**
- Business logic scattered across service layer
- No encapsulation of invariants
- Difficult to test domain rules
- Violates Tell, Don't Ask principle

#### 2. **Lack of Bounded Contexts**
Current structure treats everything as one monolithic domain:
```
src/
├── services/          ← All domains mixed
│   ├── auth.service.ts
│   ├── events.service.ts
│   ├── guests.service.ts
│   ├── seating-plan.service.ts
│   ├── assignments.service.ts
│   └── relationships.service.ts
├── pages/api/         ← REST endpoints mixed
├── components/        ← UI components mixed
└── types.ts           ← Global types file
```

#### 3. **Transaction Script Pattern**
Services follow procedural transaction scripts instead of domain-driven design:
```typescript
// Everything is CRUD operations
async createGuest(data) { /* INSERT */ }
async updateGuest(id, data) { /* UPDATE */ }
async deleteGuest(id) { /* DELETE */ }
```

---

## Strategic DDD Patterns

### Bounded Context Identification

Based on the PRD (US-001, US-002, US-003), we identify **4 core bounded contexts**:

#### 1. **Identity & Access Context** (Supporting)
**Ubiquitous Language:**
- User, Session, Credentials, Authentication, Authorization, Password Reset

**Responsibilities:**
- User registration and authentication
- Session management
- Password recovery
- Access control

**Core Domain:** No (supporting subdomain)

---

#### 2. **Event Management Context** (Core)
**Ubiquitous Language:**
- Event, Event Planner, Guest List, Venue, Date, Attendee

**Responsibilities:**
- Event creation and lifecycle management
- Event metadata (name, date, venue)
- Event ownership and access control
- Event templates

**Core Domain:** Yes (primary business value)

---

#### 3. **Guest & Relationship Context** (Core)
**Ubiquitous Language:**
- Guest, Attendee, Dietary Preference, Relationship, Friend Group, Conflict, Family, Affinity

**Responsibilities:**
- Guest profile management
- Relationship mapping (friend, family, conflict)
- Affinity scoring
- Guest import/export

**Core Domain:** Yes (critical for seating optimization)

---

#### 4. **Seating Optimization Context** (Core)
**Ubiquitous Language:**
- Seating Plan, Table Assignment, Seat, Optimization Score, Conflict, Constraint, AI Suggestion, Manual Override

**Responsibilities:**
- AI-powered seating plan generation
- Manual seating assignment
- Conflict detection and validation
- Optimization scoring
- Visual table layouts
- Export to PDF/CSV

**Core Domain:** Yes (unique differentiator)

---

### Context Map

```
┌─────────────────────────────────────────────────────────────┐
│                  Identity & Access Context                  │
│                     (Supporting Domain)                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ User, Session, Credentials, Authentication          │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │ ACL (Anti-Corruption Layer)
                         │ (Provides: userId)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Event Management Context                   │
│                      (Core Domain)                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Event, EventPlanner, GuestList, Venue               │   │
│  └─────────────────────────────────────────────────────┘   │
└────────┬───────────────────────────────────────────┬────────┘
         │ Published Events:                         │
         │ - EventCreated                            │
         │ - EventUpdated                            │
         │                                           │
         ▼                                           ▼
┌──────────────────────────────┐   ┌──────────────────────────────┐
│ Guest & Relationship Context │   │ Seating Optimization Context │
│       (Core Domain)          │   │       (Core Domain)          │
│  ┌──────────────────────┐   │◄──┤  ┌──────────────────────┐   │
│  │ Guest, Relationship  │   │   │  │ SeatingPlan, Table,  │   │
│  │ Friend, Conflict     │   │───┤  │ Assignment, Seat     │   │
│  └──────────────────────┘   │   │  └──────────────────────┘   │
└──────────────────────────────┘   └──────────────────────────────┘
        │ Published Events:                │ Published Events:
        │ - GuestAdded                     │ - PlanGenerated
        │ - RelationshipDefined            │ - AssignmentChanged
        │                                  │ - ConflictDetected
        └──────────────────────────────────┘
                Shared Kernel:
                - Guest ID references
                - Event ID references
```

**Relationship Types:**
- **Identity → Event:** **Conformist** (Event context conforms to Identity's User ID)
- **Event → Guest:** **Customer/Supplier** (Event publishes events, Guest subscribes)
- **Event → Seating:** **Customer/Supplier** (Event publishes events, Seating subscribes)
- **Guest ↔ Seating:** **Partnership** (Shared kernel with guest references)

---

## Tactical DDD Patterns

### Example Domain: **Seating Optimization Context**

Let's refactor the Seating Optimization domain as a **complete cross-sectional example** through all layers.

---

### Layer 1: Domain Model (Core Business Logic)

#### 1.1 Value Objects

**Value Objects** are immutable, identity-less objects defined by their attributes.

```typescript
// src/domains/seating-optimization/domain/value-objects/OptimizationScore.ts

/**
 * Value Object: OptimizationScore
 * Represents a 0-100 score indicating seating plan quality
 */
export class OptimizationScore {
  private constructor(private readonly _value: number) {
    if (_value < 0 || _value > 100) {
      throw new Error('OptimizationScore must be between 0 and 100');
    }
  }

  static create(value: number): OptimizationScore {
    return new OptimizationScore(value);
  }

  static zero(): OptimizationScore {
    return new OptimizationScore(0);
  }

  get value(): number {
    return this._value;
  }

  isOptimal(): boolean {
    return this._value >= 80;
  }

  isAcceptable(): boolean {
    return this._value >= 60;
  }

  equals(other: OptimizationScore): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return `${this._value}%`;
  }
}
```

```typescript
// src/domains/seating-optimization/domain/value-objects/TableCapacity.ts

/**
 * Value Object: TableCapacity
 * Encapsulates table capacity rules and constraints
 */
export class TableCapacity {
  private constructor(
    private readonly _total: number,
    private readonly _assigned: number
  ) {
    if (_total <= 0) {
      throw new Error('Table capacity must be positive');
    }
    if (_assigned < 0 || _assigned > _total) {
      throw new Error('Assigned count must be between 0 and total capacity');
    }
  }

  static create(total: number, assigned: number = 0): TableCapacity {
    return new TableCapacity(total, assigned);
  }

  get total(): number {
    return this._total;
  }

  get assigned(): number {
    return this._assigned;
  }

  get available(): number {
    return this._total - this._assigned;
  }

  isFull(): boolean {
    return this._assigned >= this._total;
  }

  canAccommodate(guestCount: number): boolean {
    return this.available >= guestCount;
  }

  withAssignment(count: number): TableCapacity {
    return new TableCapacity(this._total, this._assigned + count);
  }

  utilizationPercentage(): number {
    return (this._assigned / this._total) * 100;
  }
}
```

```typescript
// src/domains/seating-optimization/domain/value-objects/SeatPosition.ts

/**
 * Value Object: SeatPosition
 * Represents a specific seat at a table
 */
export class SeatPosition {
  private constructor(private readonly _position: number) {
    if (_position < 1) {
      throw new Error('Seat position must be positive');
    }
  }

  static create(position: number): SeatPosition {
    return new SeatPosition(position);
  }

  get value(): number {
    return this._position;
  }

  equals(other: SeatPosition): boolean {
    return this._position === other._position;
  }
}
```

---

#### 1.2 Entities

**Entities** have identity and lifecycle. They contain business logic.

```typescript
// src/domains/seating-optimization/domain/entities/Table.ts

import { TableCapacity } from '../value-objects/TableCapacity';
import { TableType } from '../value-objects/TableType';

export interface TableProps {
  id: number;
  eventId: number;
  name: string;
  capacity: TableCapacity;
  tableType: TableType;
}

/**
 * Entity: Table
 * Represents a physical table at an event with seating capacity
 */
export class Table {
  private constructor(private props: TableProps) {}

  static create(props: Omit<TableProps, 'capacity'> & { capacity: number }): Table {
    return new Table({
      ...props,
      capacity: TableCapacity.create(props.capacity),
    });
  }

  static reconstitute(props: TableProps): Table {
    return new Table(props);
  }

  get id(): number {
    return this.props.id;
  }

  get eventId(): number {
    return this.props.eventId;
  }

  get name(): string {
    return this.props.name;
  }

  get capacity(): TableCapacity {
    return this.props.capacity;
  }

  get tableType(): TableType {
    return this.props.tableType;
  }

  // Business logic: Can this table accommodate a group?
  canAccommodateGroup(guestCount: number): boolean {
    return this.capacity.canAccommodate(guestCount);
  }

  // Business logic: Update capacity after assignment
  withAssignment(guestCount: number): Table {
    return new Table({
      ...this.props,
      capacity: this.capacity.withAssignment(guestCount),
    });
  }

  isOvercapacity(): boolean {
    return this.capacity.assigned > this.capacity.total;
  }

  equals(other: Table): boolean {
    return this.id === other.id;
  }
}
```

```typescript
// src/domains/seating-optimization/domain/entities/Assignment.ts

import { SeatPosition } from '../value-objects/SeatPosition';

export interface AssignmentProps {
  id: number;
  guestId: number;
  tableId: number;
  seatPosition: SeatPosition | null;
  assignedAt: Date;
}

/**
 * Entity: Assignment
 * Represents a guest's assignment to a specific table (and optionally seat)
 */
export class Assignment {
  private constructor(private props: AssignmentProps) {}

  static create(
    guestId: number,
    tableId: number,
    seatPosition?: number
  ): Assignment {
    return new Assignment({
      id: 0, // Will be assigned by repository
      guestId,
      tableId,
      seatPosition: seatPosition ? SeatPosition.create(seatPosition) : null,
      assignedAt: new Date(),
    });
  }

  static reconstitute(props: AssignmentProps): Assignment {
    return new Assignment(props);
  }

  get id(): number {
    return this.props.id;
  }

  get guestId(): number {
    return this.props.guestId;
  }

  get tableId(): number {
    return this.props.tableId;
  }

  get seatPosition(): SeatPosition | null {
    return this.props.seatPosition;
  }

  get assignedAt(): Date {
    return this.props.assignedAt;
  }

  // Business logic: Reassign to different table
  reassignToTable(newTableId: number): Assignment {
    return new Assignment({
      ...this.props,
      tableId: newTableId,
      seatPosition: null, // Clear seat when moving tables
      assignedAt: new Date(),
    });
  }

  // Business logic: Assign specific seat
  assignToSeat(position: number): Assignment {
    return new Assignment({
      ...this.props,
      seatPosition: SeatPosition.create(position),
    });
  }

  hasSpecificSeat(): boolean {
    return this.seatPosition !== null;
  }
}
```

---

#### 1.3 Aggregates

**Aggregates** enforce invariants across a cluster of entities and value objects. The **Aggregate Root** is the entry point.

```typescript
// src/domains/seating-optimization/domain/aggregates/SeatingPlan.ts

import { Table } from '../entities/Table';
import { Assignment } from '../entities/Assignment';
import { OptimizationScore } from '../value-objects/OptimizationScore';
import { SeatingPlanGeneratedEvent } from '../events/SeatingPlanGeneratedEvent';
import { AssignmentChangedEvent } from '../events/AssignmentChangedEvent';

export interface SeatingPlanProps {
  id: number;
  eventId: number;
  tables: Table[];
  assignments: Assignment[];
  optimizationScore: OptimizationScore;
  generatedAt: Date | null;
  modifiedAt: Date;
}

/**
 * Aggregate Root: SeatingPlan
 * Manages tables, assignments, and ensures seating invariants
 */
export class SeatingPlan {
  private domainEvents: any[] = [];

  private constructor(private props: SeatingPlanProps) {}

  static create(eventId: number, tables: Table[]): SeatingPlan {
    return new SeatingPlan({
      id: 0, // Will be assigned by repository
      eventId,
      tables,
      assignments: [],
      optimizationScore: OptimizationScore.zero(),
      generatedAt: null,
      modifiedAt: new Date(),
    });
  }

  static reconstitute(props: SeatingPlanProps): SeatingPlan {
    return new SeatingPlan(props);
  }

  // Getters
  get id(): number {
    return this.props.id;
  }

  get eventId(): number {
    return this.props.eventId;
  }

  get tables(): ReadonlyArray<Table> {
    return this.props.tables;
  }

  get assignments(): ReadonlyArray<Assignment> {
    return this.props.assignments;
  }

  get optimizationScore(): OptimizationScore {
    return this.props.optimizationScore;
  }

  // ===== BUSINESS LOGIC (INVARIANTS) =====

  /**
   * Assign a guest to a table
   * Invariant: Total capacity cannot be exceeded
   */
  assignGuestToTable(guestId: number, tableId: number, seatPosition?: number): void {
    // Find the table
    const table = this.props.tables.find(t => t.id === tableId);
    if (!table) {
      throw new Error(`Table ${tableId} not found in seating plan`);
    }

    // Check if guest already assigned
    const existingAssignment = this.props.assignments.find(a => a.guestId === guestId);
    if (existingAssignment) {
      throw new Error(`Guest ${guestId} is already assigned to table ${existingAssignment.tableId}`);
    }

    // Check capacity
    const currentAssignmentsAtTable = this.props.assignments.filter(a => a.tableId === tableId).length;
    if (currentAssignmentsAtTable >= table.capacity.total) {
      throw new Error(`Table ${tableId} is at full capacity`);
    }

    // Check seat position conflict if specified
    if (seatPosition !== undefined) {
      const seatTaken = this.props.assignments.some(
        a => a.tableId === tableId && a.seatPosition?.value === seatPosition
      );
      if (seatTaken) {
        throw new Error(`Seat ${seatPosition} at table ${tableId} is already taken`);
      }
    }

    // Create assignment
    const assignment = Assignment.create(guestId, tableId, seatPosition);
    this.props.assignments.push(assignment);
    this.props.modifiedAt = new Date();

    // Raise domain event
    this.domainEvents.push(
      new AssignmentChangedEvent({
        seatingPlanId: this.id,
        guestId,
        tableId,
        seatPosition,
        occurredAt: new Date(),
      })
    );
  }

  /**
   * Unassign a guest from their table
   */
  unassignGuest(guestId: number): void {
    const index = this.props.assignments.findIndex(a => a.guestId === guestId);
    if (index === -1) {
      throw new Error(`Guest ${guestId} is not assigned to any table`);
    }

    this.props.assignments.splice(index, 1);
    this.props.modifiedAt = new Date();
  }

  /**
   * Mark plan as AI-generated with score
   */
  markAsGenerated(score: number): void {
    this.props.optimizationScore = OptimizationScore.create(score);
    this.props.generatedAt = new Date();
    this.props.modifiedAt = new Date();

    // Raise domain event
    this.domainEvents.push(
      new SeatingPlanGeneratedEvent({
        seatingPlanId: this.id,
        eventId: this.eventId,
        score: score,
        occurredAt: new Date(),
      })
    );
  }

  /**
   * Get all unassigned guests (by ID)
   */
  getUnassignedGuestIds(allGuestIds: number[]): number[] {
    const assignedIds = new Set(this.props.assignments.map(a => a.guestId));
    return allGuestIds.filter(id => !assignedIds.has(id));
  }

  /**
   * Calculate statistics
   */
  getStatistics() {
    const totalCapacity = this.props.tables.reduce((sum, t) => sum + t.capacity.total, 0);
    const assignedCount = this.props.assignments.length;

    return {
      totalTables: this.props.tables.length,
      totalCapacity,
      assignedGuests: assignedCount,
      utilizationPercentage: (assignedCount / totalCapacity) * 100,
      optimizationScore: this.props.optimizationScore.value,
    };
  }

  /**
   * Get domain events (for event sourcing)
   */
  getDomainEvents(): any[] {
    return [...this.domainEvents];
  }

  /**
   * Clear domain events after publishing
   */
  clearDomainEvents(): void {
    this.domainEvents = [];
  }
}
```

---

#### 1.4 Domain Events

**Domain Events** represent something that happened in the domain.

```typescript
// src/domains/seating-optimization/domain/events/SeatingPlanGeneratedEvent.ts

export interface SeatingPlanGeneratedEventProps {
  seatingPlanId: number;
  eventId: number;
  score: number;
  occurredAt: Date;
}

export class SeatingPlanGeneratedEvent {
  readonly eventType = 'SeatingPlanGenerated' as const;

  constructor(public readonly props: SeatingPlanGeneratedEventProps) {}
}
```

```typescript
// src/domains/seating-optimization/domain/events/AssignmentChangedEvent.ts

export interface AssignmentChangedEventProps {
  seatingPlanId: number;
  guestId: number;
  tableId: number;
  seatPosition?: number;
  occurredAt: Date;
}

export class AssignmentChangedEvent {
  readonly eventType = 'AssignmentChanged' as const;

  constructor(public readonly props: AssignmentChangedEventProps) {}
}
```

---

#### 1.5 Domain Services

**Domain Services** contain domain logic that doesn't naturally fit in an entity or value object.

```typescript
// src/domains/seating-optimization/domain/services/ConflictDetector.ts

import { SeatingPlan } from '../aggregates/SeatingPlan';
import { GuestRelationship } from '../../guest-relationships/domain/entities/GuestRelationship';

export interface Conflict {
  type: 'seated_together' | 'separated';
  guest1Id: number;
  guest2Id: number;
  severity: 'high' | 'medium' | 'low';
  message: string;
}

/**
 * Domain Service: ConflictDetector
 * Detects seating conflicts based on guest relationships
 */
export class ConflictDetector {
  detectConflicts(
    seatingPlan: SeatingPlan,
    relationships: GuestRelationship[]
  ): Conflict[] {
    const conflicts: Conflict[] = [];

    for (const rel of relationships) {
      const guest1Assignment = seatingPlan.assignments.find(a => a.guestId === rel.guest1Id);
      const guest2Assignment = seatingPlan.assignments.find(a => a.guestId === rel.guest2Id);

      // Skip if either guest is unassigned
      if (!guest1Assignment || !guest2Assignment) continue;

      const seatedTogether = guest1Assignment.tableId === guest2Assignment.tableId;

      // Conflict: Enemies seated together
      if (rel.type === 'conflict' && seatedTogether) {
        conflicts.push({
          type: 'seated_together',
          guest1Id: rel.guest1Id,
          guest2Id: rel.guest2Id,
          severity: rel.strength >= 8 ? 'high' : rel.strength >= 5 ? 'medium' : 'low',
          message: `Guests with conflict relationship are seated at the same table`,
        });
      }

      // Conflict: Close friends/family separated
      if ((rel.type === 'friend' || rel.type === 'family') && !seatedTogether && rel.strength >= 8) {
        conflicts.push({
          type: 'separated',
          guest1Id: rel.guest1Id,
          guest2Id: rel.guest2Id,
          severity: 'medium',
          message: `Close ${rel.type}s are seated at different tables`,
        });
      }
    }

    return conflicts;
  }
}
```

---

### Layer 2: Application Layer (Use Cases)

**Application Services** orchestrate domain objects to fulfill use cases. They are **transaction boundaries**.

```typescript
// src/domains/seating-optimization/application/use-cases/AssignGuestToTableUseCase.ts

import { SeatingPlanRepository } from '../ports/SeatingPlanRepository';
import { GuestRelationshipRepository } from '../ports/GuestRelationshipRepository';
import { ConflictDetector } from '../../domain/services/ConflictDetector';
import { EventBus } from '../ports/EventBus';

export interface AssignGuestToTableCommand {
  seatingPlanId: number;
  guestId: number;
  tableId: number;
  seatPosition?: number;
  userId: string; // For authorization
}

export interface AssignGuestToTableResult {
  success: boolean;
  conflicts: any[];
  warnings: string[];
}

/**
 * Use Case: Assign Guest to Table
 * Orchestrates domain objects to assign a guest to a table
 */
export class AssignGuestToTableUseCase {
  constructor(
    private seatingPlanRepo: SeatingPlanRepository,
    private relationshipRepo: GuestRelationshipRepository,
    private conflictDetector: ConflictDetector,
    private eventBus: EventBus
  ) {}

  async execute(command: AssignGuestToTableCommand): Promise<AssignGuestToTableResult> {
    // 1. Load aggregate
    const seatingPlan = await this.seatingPlanRepo.findById(command.seatingPlanId);
    if (!seatingPlan) {
      throw new Error('SEATING_PLAN_NOT_FOUND');
    }

    // 2. Authorization check (could be in separate service)
    const event = await this.seatingPlanRepo.getEventForPlan(seatingPlan.id);
    if (event.userId !== command.userId) {
      throw new Error('UNAUTHORIZED');
    }

    // 3. Execute domain logic (aggregate enforces invariants)
    seatingPlan.assignGuestToTable(
      command.guestId,
      command.tableId,
      command.seatPosition
    );

    // 4. Detect conflicts
    const relationships = await this.relationshipRepo.findByEventId(event.id);
    const conflicts = this.conflictDetector.detectConflicts(seatingPlan, relationships);

    // 5. Save aggregate (transaction)
    await this.seatingPlanRepo.save(seatingPlan);

    // 6. Publish domain events
    const events = seatingPlan.getDomainEvents();
    for (const event of events) {
      await this.eventBus.publish(event);
    }
    seatingPlan.clearDomainEvents();

    // 7. Return result
    return {
      success: true,
      conflicts,
      warnings: conflicts.filter(c => c.severity === 'high').map(c => c.message),
    };
  }
}
```

```typescript
// src/domains/seating-optimization/application/use-cases/GenerateSeatingPlanUseCase.ts

import { SeatingPlanRepository } from '../ports/SeatingPlanRepository';
import { TableRepository } from '../ports/TableRepository';
import { GuestRepository } from '../ports/GuestRepository';
import { AISeatingOptimizer } from '../../domain/services/AISeatingOptimizer';
import { EventBus } from '../ports/EventBus';

export interface GenerateSeatingPlanCommand {
  eventId: number;
  userId: string;
  constraints?: {
    preferFriendsAtSameTable?: boolean;
    avoidConflicts?: boolean;
  };
}

export interface GenerateSeatingPlanResult {
  seatingPlanId: number;
  optimizationScore: number;
  assignmentsCreated: number;
}

/**
 * Use Case: Generate Seating Plan with AI
 */
export class GenerateSeatingPlanUseCase {
  constructor(
    private seatingPlanRepo: SeatingPlanRepository,
    private tableRepo: TableRepository,
    private guestRepo: GuestRepository,
    private aiOptimizer: AISeatingOptimizer,
    private eventBus: EventBus
  ) {}

  async execute(command: GenerateSeatingPlanCommand): Promise<GenerateSeatingPlanResult> {
    // 1. Load dependencies
    const tables = await this.tableRepo.findByEventId(command.eventId);
    const guests = await this.guestRepo.findByEventId(command.eventId);

    // 2. Validate preconditions
    if (tables.length === 0) {
      throw new Error('NO_TABLES_CONFIGURED');
    }
    if (guests.length === 0) {
      throw new Error('NO_GUESTS_TO_ASSIGN');
    }

    // 3. Create seating plan aggregate
    const seatingPlan = await this.seatingPlanRepo.createForEvent(command.eventId, tables);

    // 4. Call domain service (AI optimization)
    const optimizationResult = await this.aiOptimizer.optimize(seatingPlan, guests, command.constraints);

    // 5. Apply assignments to aggregate
    for (const assignment of optimizationResult.assignments) {
      seatingPlan.assignGuestToTable(assignment.guestId, assignment.tableId, assignment.seatPosition);
    }

    // 6. Mark as generated with score
    seatingPlan.markAsGenerated(optimizationResult.score);

    // 7. Save
    await this.seatingPlanRepo.save(seatingPlan);

    // 8. Publish events
    const events = seatingPlan.getDomainEvents();
    for (const event of events) {
      await this.eventBus.publish(event);
    }
    seatingPlan.clearDomainEvents();

    // 9. Return result
    return {
      seatingPlanId: seatingPlan.id,
      optimizationScore: optimizationResult.score,
      assignmentsCreated: optimizationResult.assignments.length,
    };
  }
}
```

---

### Layer 3: Infrastructure Layer (Adapters)

**Repositories** implement persistence. **Ports** define interfaces in the application layer.

```typescript
// src/domains/seating-optimization/application/ports/SeatingPlanRepository.ts

import { SeatingPlan } from '../../domain/aggregates/SeatingPlan';
import { Table } from '../../domain/entities/Table';

/**
 * Port: SeatingPlanRepository
 * Interface for seating plan persistence
 */
export interface SeatingPlanRepository {
  findById(id: number): Promise<SeatingPlan | null>;
  findByEventId(eventId: number): Promise<SeatingPlan | null>;
  createForEvent(eventId: number, tables: Table[]): Promise<SeatingPlan>;
  save(seatingPlan: SeatingPlan): Promise<void>;
  delete(id: number): Promise<void>;
  getEventForPlan(seatingPlanId: number): Promise<{ id: number; userId: string }>;
}
```

```typescript
// src/domains/seating-optimization/infrastructure/repositories/SupabaseSeatingPlanRepository.ts

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/db/database.types';
import { SeatingPlanRepository } from '../../application/ports/SeatingPlanRepository';
import { SeatingPlan } from '../../domain/aggregates/SeatingPlan';
import { Table } from '../../domain/entities/Table';
import { Assignment } from '../../domain/entities/Assignment';
import { OptimizationScore } from '../../domain/value-objects/OptimizationScore';
import { TableCapacity } from '../../domain/value-objects/TableCapacity';
import { SeatPosition } from '../../domain/value-objects/SeatPosition';

/**
 * Adapter: SupabaseSeatingPlanRepository
 * Implements SeatingPlanRepository using Supabase
 */
export class SupabaseSeatingPlanRepository implements SeatingPlanRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  async findById(id: number): Promise<SeatingPlan | null> {
    // Fetch seating plan with tables and assignments
    const { data: planData, error: planError } = await this.supabase
      .from('seating_plans')
      .select('*, tables(*), seating_assignments(*)')
      .eq('id', id)
      .single();

    if (planError || !planData) {
      return null;
    }

    // Reconstitute domain objects
    const tables = planData.tables.map(t =>
      Table.reconstitute({
        id: t.id,
        eventId: t.event_id,
        name: t.name,
        capacity: TableCapacity.create(t.capacity, this.countAssignments(t.id, planData.seating_assignments)),
        tableType: t.table_type as any,
      })
    );

    const assignments = planData.seating_assignments.map(a =>
      Assignment.reconstitute({
        id: a.id,
        guestId: a.guest_id,
        tableId: a.table_id,
        seatPosition: a.seat_position ? SeatPosition.create(a.seat_position) : null,
        assignedAt: new Date(a.created_at),
      })
    );

    return SeatingPlan.reconstitute({
      id: planData.id,
      eventId: planData.event_id,
      tables,
      assignments,
      optimizationScore: OptimizationScore.create(planData.optimization_score ?? 0),
      generatedAt: planData.generated_at ? new Date(planData.generated_at) : null,
      modifiedAt: new Date(planData.updated_at),
    });
  }

  async save(seatingPlan: SeatingPlan): Promise<void> {
    // Start transaction
    const { error: updateError } = await this.supabase
      .from('seating_plans')
      .update({
        optimization_score: seatingPlan.optimizationScore.value,
        generated_at: seatingPlan.generatedAt?.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', seatingPlan.id);

    if (updateError) {
      throw new Error(`Failed to save seating plan: ${updateError.message}`);
    }

    // Delete old assignments
    await this.supabase
      .from('seating_assignments')
      .delete()
      .eq('seating_plan_id', seatingPlan.id);

    // Insert new assignments
    const assignmentRows = seatingPlan.assignments.map(a => ({
      seating_plan_id: seatingPlan.id,
      guest_id: a.guestId,
      table_id: a.tableId,
      seat_position: a.seatPosition?.value ?? null,
    }));

    if (assignmentRows.length > 0) {
      const { error: insertError } = await this.supabase
        .from('seating_assignments')
        .insert(assignmentRows);

      if (insertError) {
        throw new Error(`Failed to save assignments: ${insertError.message}`);
      }
    }
  }

  private countAssignments(tableId: number, assignments: any[]): number {
    return assignments.filter(a => a.table_id === tableId).length;
  }

  async findByEventId(eventId: number): Promise<SeatingPlan | null> {
    const { data, error } = await this.supabase
      .from('seating_plans')
      .select('id')
      .eq('event_id', eventId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.findById(data.id);
  }

  async createForEvent(eventId: number, tables: Table[]): Promise<SeatingPlan> {
    // Create seating plan record
    const { data, error } = await this.supabase
      .from('seating_plans')
      .insert({ event_id: eventId })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error('Failed to create seating plan');
    }

    return SeatingPlan.reconstitute({
      id: data.id,
      eventId,
      tables,
      assignments: [],
      optimizationScore: OptimizationScore.zero(),
      generatedAt: null,
      modifiedAt: new Date(),
    });
  }

  async delete(id: number): Promise<void> {
    await this.supabase.from('seating_plans').delete().eq('id', id);
  }

  async getEventForPlan(seatingPlanId: number): Promise<{ id: number; userId: string }> {
    const { data, error } = await this.supabase
      .from('seating_plans')
      .select('events(id, user_id)')
      .eq('id', seatingPlanId)
      .single();

    if (error || !data) {
      throw new Error('Event not found for seating plan');
    }

    return {
      id: (data.events as any).id,
      userId: (data.events as any).user_id,
    };
  }
}
```

---

### Layer 4: API Layer (Controllers)

**Controllers** handle HTTP requests and call application services.

```typescript
// src/pages/api/seating-plans/[id]/assign-guest.ts

import type { APIRoute } from 'astro';
import { createClient } from '@/db/supabase.client';
import { AssignGuestToTableUseCase } from '@/domains/seating-optimization/application/use-cases/AssignGuestToTableUseCase';
import { SupabaseSeatingPlanRepository } from '@/domains/seating-optimization/infrastructure/repositories/SupabaseSeatingPlanRepository';
import { SupabaseGuestRelationshipRepository } from '@/domains/guest-relationships/infrastructure/repositories/SupabaseGuestRelationshipRepository';
import { ConflictDetector } from '@/domains/seating-optimization/domain/services/ConflictDetector';
import { InMemoryEventBus } from '@/shared/infrastructure/InMemoryEventBus';

export const POST: APIRoute = async ({ request, locals, params }) => {
  try {
    // 1. Parse request
    const body = await request.json();
    const { guestId, tableId, seatPosition } = body;
    const seatingPlanId = parseInt(params.id!);

    // 2. Check authentication
    const user = locals.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // 3. Initialize dependencies
    const supabase = createClient(request);
    const seatingPlanRepo = new SupabaseSeatingPlanRepository(supabase);
    const relationshipRepo = new SupabaseGuestRelationshipRepository(supabase);
    const conflictDetector = new ConflictDetector();
    const eventBus = new InMemoryEventBus();

    // 4. Execute use case
    const useCase = new AssignGuestToTableUseCase(
      seatingPlanRepo,
      relationshipRepo,
      conflictDetector,
      eventBus
    );

    const result = await useCase.execute({
      seatingPlanId,
      guestId,
      tableId,
      seatPosition,
      userId: user.id,
    });

    // 5. Return response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400 }
    );
  }
};
```

---

### Layer 5: UI Layer (Components)

**Components** call API endpoints and display data.

```tsx
// src/components/SeatingPlan/DragAndDropCanvas.tsx (Refactored)

// Components remain mostly unchanged, but now they call well-defined API endpoints
// that execute use cases instead of calling anemic services directly

const handleDrop = async (guestId: number, tableId: number, seatPosition?: number) => {
  try {
    const response = await fetch(`/api/seating-plans/${seatingPlanId}/assign-guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestId, tableId, seatPosition }),
    });

    const result = await response.json();

    if (result.conflicts.length > 0) {
      setConflicts(result.conflicts); // Show conflicts to user
    }

    if (result.success) {
      refetch(); // Refresh seating plan
      showSuccess(`Guest assigned to table`);
    }
  } catch (error) {
    showError('Failed to assign guest');
  }
};
```

---

## Proposed Folder Structure

```
src/
├── domains/                              ← Bounded Contexts
│   ├── identity-access/                  ← Identity & Access Context
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── User.ts
│   │   │   │   └── Session.ts
│   │   │   ├── value-objects/
│   │   │   │   ├── Email.ts
│   │   │   │   ├── Password.ts
│   │   │   │   └── UserId.ts
│   │   │   └── events/
│   │   │       ├── UserRegisteredEvent.ts
│   │   │       └── UserLoggedInEvent.ts
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   ├── RegisterUserUseCase.ts
│   │   │   │   ├── LoginUserUseCase.ts
│   │   │   │   └── ResetPasswordUseCase.ts
│   │   │   └── ports/
│   │   │       ├── UserRepository.ts
│   │   │       └── SessionRepository.ts
│   │   └── infrastructure/
│   │       └── repositories/
│   │           └── SupabaseUserRepository.ts
│   │
│   ├── event-management/                 ← Event Management Context
│   │   ├── domain/
│   │   │   ├── aggregates/
│   │   │   │   └── Event.ts              ← Aggregate Root
│   │   │   ├── entities/
│   │   │   │   └── Venue.ts
│   │   │   ├── value-objects/
│   │   │   │   ├── EventName.ts
│   │   │   │   ├── EventDate.ts
│   │   │   │   └── EventId.ts
│   │   │   ├── services/
│   │   │   │   └── EventTemplateService.ts
│   │   │   └── events/
│   │   │       ├── EventCreatedEvent.ts
│   │   │       └── EventUpdatedEvent.ts
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   ├── CreateEventUseCase.ts
│   │   │   │   ├── UpdateEventUseCase.ts
│   │   │   │   └── DeleteEventUseCase.ts
│   │   │   └── ports/
│   │   │       └── EventRepository.ts
│   │   └── infrastructure/
│   │       └── repositories/
│   │           └── SupabaseEventRepository.ts
│   │
│   ├── guest-relationships/              ← Guest & Relationship Context
│   │   ├── domain/
│   │   │   ├── aggregates/
│   │   │   │   └── GuestList.ts          ← Aggregate Root
│   │   │   ├── entities/
│   │   │   │   ├── Guest.ts
│   │   │   │   └── GuestRelationship.ts
│   │   │   ├── value-objects/
│   │   │   │   ├── GuestName.ts
│   │   │   │   ├── DietaryPreference.ts
│   │   │   │   ├── RelationshipType.ts   ← friend, family, conflict
│   │   │   │   └── AffinityScore.ts
│   │   │   ├── services/
│   │   │   │   └── RelationshipAnalyzer.ts
│   │   │   └── events/
│   │   │       ├── GuestAddedEvent.ts
│   │   │       └── RelationshipDefinedEvent.ts
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   ├── AddGuestUseCase.ts
│   │   │   │   ├── DefineRelationshipUseCase.ts
│   │   │   │   └── ImportGuestListUseCase.ts
│   │   │   └── ports/
│   │   │       ├── GuestRepository.ts
│   │   │       └── RelationshipRepository.ts
│   │   └── infrastructure/
│   │       └── repositories/
│   │           ├── SupabaseGuestRepository.ts
│   │           └── SupabaseRelationshipRepository.ts
│   │
│   └── seating-optimization/             ← Seating Optimization Context
│       ├── domain/
│       │   ├── aggregates/
│       │   │   └── SeatingPlan.ts        ← Aggregate Root (shown above)
│       │   ├── entities/
│       │   │   ├── Table.ts
│       │   │   └── Assignment.ts
│       │   ├── value-objects/
│       │   │   ├── OptimizationScore.ts
│       │   │   ├── TableCapacity.ts
│       │   │   ├── SeatPosition.ts
│       │   │   └── TableType.ts
│       │   ├── services/
│       │   │   ├── ConflictDetector.ts   ← Domain Service (shown above)
│       │   │   └── AISeatingOptimizer.ts
│       │   └── events/
│       │       ├── SeatingPlanGeneratedEvent.ts
│       │       ├── AssignmentChangedEvent.ts
│       │       └── ConflictDetectedEvent.ts
│       ├── application/
│       │   ├── use-cases/
│       │   │   ├── GenerateSeatingPlanUseCase.ts   ← (shown above)
│       │   │   ├── AssignGuestToTableUseCase.ts    ← (shown above)
│       │   │   ├── UnassignGuestUseCase.ts
│       │   │   ├── ValidateSeatingPlanUseCase.ts
│       │   │   └── ExportSeatingPlanUseCase.ts
│       │   └── ports/
│       │       ├── SeatingPlanRepository.ts
│       │       ├── TableRepository.ts
│       │       ├── GuestRepository.ts               ← Shared with guest-relationships
│       │       ├── GuestRelationshipRepository.ts  ← Shared with guest-relationships
│       │       └── EventBus.ts
│       └── infrastructure/
│           ├── repositories/
│           │   ├── SupabaseSeatingPlanRepository.ts ← (shown above)
│           │   └── SupabaseTableRepository.ts
│           └── services/
│               └── OpenRouterAIOptimizer.ts         ← Adapter for AI service
│
├── shared/                                ← Shared Kernel
│   ├── domain/
│   │   └── Entity.ts                      ← Base Entity class
│   ├── infrastructure/
│   │   ├── InMemoryEventBus.ts
│   │   └── SupabaseUnitOfWork.ts
│   └── types/
│       ├── Result.ts                      ← Result<T, E> type
│       └── Either.ts                      ← Either<L, R> type
│
├── pages/
│   ├── api/
│   │   ├── auth/                          ← Identity & Access endpoints
│   │   │   ├── login.ts
│   │   │   ├── register.ts
│   │   │   └── logout.ts
│   │   ├── events/                        ← Event Management endpoints
│   │   │   ├── index.ts
│   │   │   └── [id].ts
│   │   ├── guests/                        ← Guest & Relationship endpoints
│   │   │   ├── index.ts
│   │   │   ├── [id].ts
│   │   │   └── relationships.ts
│   │   └── seating-plans/                 ← Seating Optimization endpoints
│   │       ├── generate.ts
│   │       ├── [id]/assign-guest.ts       ← (shown above)
│   │       └── [id]/export.ts
│   └── ...                                ← Astro pages
│
└── components/                            ← UI Components (existing)
    └── ...
```

---

## DDD Patterns Summary

### Strategic Patterns Applied

| Pattern | Application | Benefit |
|---------|-------------|---------|
| **Bounded Context** | 4 contexts: Identity, Event, Guest, Seating | Clear domain boundaries, independent evolution |
| **Ubiquitous Language** | Domain-specific terminology in code | Alignment between code and business |
| **Context Map** | Customer/Supplier, Partnership, ACL relationships | Explicit integration patterns |
| **Shared Kernel** | Guest IDs, Event IDs shared across contexts | Controlled sharing of common concepts |
| **Anti-Corruption Layer** | Identity context provides only userId | Protect domains from external changes |

### Tactical Patterns Applied

| Pattern | Implementation | Purpose |
|---------|---------------|---------|
| **Value Objects** | OptimizationScore, TableCapacity, SeatPosition | Immutable, self-validating values |
| **Entities** | Table, Assignment, Guest | Objects with identity and lifecycle |
| **Aggregates** | SeatingPlan (root), Event, GuestList | Enforce invariants, transaction boundaries |
| **Domain Events** | SeatingPlanGeneratedEvent, AssignmentChangedEvent | Capture domain state changes |
| **Domain Services** | ConflictDetector, AISeatingOptimizer | Stateless domain logic |
| **Repositories** | SeatingPlanRepository, GuestRepository | Persistence abstraction |
| **Application Services** | AssignGuestToTableUseCase | Orchestrate use cases, transaction boundaries |
| **Ports & Adapters** | Repository interfaces + Supabase implementations | Hexagonal architecture, testability |

---

## Migration Strategy

### Phase 1: Extract Seating Optimization Context (2-3 weeks)
1. Create folder structure for seating-optimization domain
2. Extract Value Objects (OptimizationScore, TableCapacity, SeatPosition)
3. Extract Entities (Table, Assignment)
4. Create SeatingPlan aggregate
5. Implement ConflictDetector domain service
6. Create repositories with Supabase adapters
7. Migrate API endpoints to use cases
8. Update UI components to call new endpoints

### Phase 2: Extract Guest & Relationship Context (2 weeks)
1. Create GuestList aggregate
2. Extract Guest and GuestRelationship entities
3. Extract RelationshipType value object
4. Implement repositories
5. Migrate guest management endpoints

### Phase 3: Extract Event Management Context (1-2 weeks)
1. Create Event aggregate
2. Extract EventName, EventDate value objects
3. Implement repositories
4. Publish EventCreated/EventUpdated events

### Phase 4: Refactor Identity & Access (1 week)
1. Extract User aggregate
2. Extract Email, Password value objects
3. Implement ACL for userId sharing

### Phase 5: Integrate Event Bus (1 week)
1. Implement event publishing in aggregates
2. Create event handlers (e.g., send notifications)
3. Add eventual consistency support

---

## Benefits of DDD Refactoring

### Business Benefits
1. **Ubiquitous Language** - Code matches business terminology
2. **Faster Feature Development** - Clear boundaries reduce coupling
3. **Reduced Bugs** - Domain logic encapsulated in aggregates
4. **Better Testing** - Domain logic testable without infrastructure

### Technical Benefits
1. **Maintainability** - Clear separation of concerns
2. **Testability** - Pure domain objects, mockable ports
3. **Scalability** - Bounded contexts can be extracted to microservices
4. **Evolvability** - Domains evolve independently

---

## Anti-Patterns to Avoid

### ❌ Don't Create Anemic Repositories
```typescript
// BAD: Repository with business logic
class GuestRepository {
  async canBeSeated(guestId: number, tableId: number): Promise<boolean> {
    // Business logic in repository!
  }
}
```

**Instead:** Put business logic in domain entities/services

### ❌ Don't Expose Database Entities Directly
```typescript
// BAD: Returning Supabase types
async getGuest(id: number): Promise<Database['guests']['Row']> { }
```

**Instead:** Return domain entities

### ❌ Don't Skip Aggregates
Aggregates are **mandatory** for enforcing invariants across multiple entities.

### ❌ Don't Make Everything an Aggregate
Only group entities that must maintain invariants together.

---

## Conclusion

This DDD refactoring transforms SittingPlanner from an anemic transaction script architecture to a **rich domain model** with clear boundaries, encapsulated business logic, and maintainable structure. The **Seating Optimization Context** example demonstrates the full cross-sectional implementation from domain model to UI layer.

**Next Steps:**
1. Review and approve this architecture
2. Begin Phase 1: Extract Seating Optimization Context
3. Create unit tests for domain objects
4. Gradually migrate existing code

---

**References:**
- Eric Evans - "Domain-Driven Design: Tackling Complexity in the Heart of Software"
- Vaughn Vernon - "Implementing Domain-Driven Design"
- Martin Fowler - "Patterns of Enterprise Application Architecture"
