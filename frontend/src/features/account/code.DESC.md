# Account Feature Module — `src/features/account/`

This directory provides modal dialogs and settings forms for managing educator account profiles, subscription tiers, and system preferences.

---

## 📁 Directory Files

- [`AccountModals.tsx`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/account/AccountModals.tsx): Implements three dedicated settings dialogs:
  - **Preferences Modal**: Configures default teaching styles, assessment formats, and grading parameters across all classes.
  - **Account Settings Modal**: Allows users to inspect and update their educator name, email address, phone number, and password.
  - **Subscription Modal**: Displays current subscription plans, usage quotas, and PRO upgrade triggers.

---

## 💡 Role in the Application

`AccountModals.tsx` bridges user profile management with the persistent `AuthContext` and backend user tables.

For modal state contracts and props specifications, see [`code.ARCH.md`](file:///home/victor/antigravity/Teacher-Assistant-Workspace/frontend/src/features/account/code.ARCH.md).
