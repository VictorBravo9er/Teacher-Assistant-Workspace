# High-Level Page Views — `src/views/`

This directory provides the top-level page views and master view orchestration screens for the application.

---

## 📁 Directory Files

- [`LandingPage.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/views/LandingPage.tsx): Public product landing page highlighting feature pillars (Class Management, Rubric Grading, AI Diagnostics, Analytics), pricing plans, and login/signup navigation buttons.
- [`AuthPage.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/views/AuthPage.tsx): Authentication page handling user Sign In and Sign Up with full name, phone number, email, and password validation.
- [`ClassApp.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/views/ClassApp.tsx): Master authenticated application workspace view. Orchestrates top navigation controls, 3-way layout view mode switching (`details-only`, `split`, `chat-only`), edit mode toggling, toast alerts, gradebook matrix displays, and sidebar coordination.

---

## 💡 Role in the Application

Views represent the top of the UI component tree under `App.tsx`, integrating layouts, custom hooks, and feature submodules into cohesive application screens.

For view transitions, view mode layout splits, and top header action contracts, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/views/code.ARCH.md).
