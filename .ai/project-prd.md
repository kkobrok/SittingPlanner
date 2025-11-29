## US-001: Seating Plan Creation

- Title: Seating Plan Creation
- Description: As a user, I want to create and edit seating plans for my events so that I can organize guests efficiently.
- Acceptance Criteria:
  - User can create a new seating plan for an event (name, date, guest list, table setup).
  - User can assign guests to tables and seats.
  - User can update seating assignments at any time.
  - User can delete a seating plan.
  - User can view a summary of the seating plan (tables, guests, assignments).

## US-002: Guest and Table Management

- Title: Guest and Table Management
- Description: As a user, I want to manage guests and tables for my events so that I can keep my event data organized.
- Acceptance Criteria:
  - User can add, edit, and remove guests (name, dietary restrictions, notes).
  - User can add, edit, and remove tables (name, capacity, type).
  - User can import guest lists from a file.
  - User can view guests and tables in a dashboard.
  - User cannot manage guests or tables without logging in (see US-003).

## US-003: Secure Access and Authentication

- Title: Secure Access
- Description: As a user, I want to register and log in securely so that my event data is protected.
- Acceptance Criteria:
  - Registration and login are available on dedicated pages.
  - Login requires email and password.
  - Registration requires email, password, and password confirmation.
  - User can log in and log out using buttons in the top navigation.
  - No external login providers (e.g., Google, GitHub) are used.
  - Password recovery is available.
  - User cannot access event management features without logging in.

