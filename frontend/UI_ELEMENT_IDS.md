# Frontend UI Element ID Reference

This document organizes and lists all important element `id` attributes assigned across the frontend application components. These IDs facilitate DOM selection, automated testing, accessibility auditing, and backend/frontend integration.

---

## 1. Main Navigation & Sidebar (`Sidebar.tsx`)

| Element ID | Description / Component Role |
| :--- | :--- |
| `main-sidebar` | Main left sidebar container |
| `sidebar-brand-header` | Top brand header section |
| `sidebar-brand-icon-collapsed` | Collapsed brand icon indicator |
| `sidebar-collapse-button` | Button to collapse sidebar into icon mode |
| `sidebar-search-input` | Search input to filter active classes and templates |
| `sidebar-templates-header` | Clickable section header for "Teacher Templates" |
| `sidebar-create-template-button` | Plus icon button to open template creation modal |
| `sidebar-template-item-{id}` | Container for individual template item |
| `sidebar-delete-template-button-{id}` | Button to delete specific template |
| `sidebar-save-active-as-template-button` | Button to save currently active class configuration as template |
| `sidebar-classes-header` | Clickable section header for "Active Classes" |
| `sidebar-toggle-archived-button` | Toggle button to switch between active and archived classes |
| `sidebar-create-class-button` | Plus icon button to open "Create Class" modal |
| `sidebar-class-item-{id}` | Container for individual class project item |
| `sidebar-class-menu-button-{id}` | Context menu trigger ("..." button) on class item |
| `sidebar-theme-light-button` | Switch theme to Light mode |
| `sidebar-theme-dark-button` | Switch theme to Dark mode |
| `sidebar-theme-system-button` | Switch theme to System preference mode |
| `sidebar-settings-button` | Open general system settings modal |
| `sidebar-preferences-button` | Open teaching preferences modal |
| `sidebar-user-profile-card` | User profile section at the bottom of sidebar |
| `sidebar-subscription-button` | PRO subscription badge trigger |
| `sidebar-logout-button` | User logout action trigger |

---

## 2. Top Header & Layout Controls (`ClassApp.tsx`)

| Element ID | Description / Component Role |
| :--- | :--- |
| `toast-notification` | Floating notification toast overlay |
| `toast-dismiss-button` | Close/dismiss button on toast alert |
| `top-nav-controls` | Right-side container for top navigation controls |
| `top-nav-preset-template-button` | Button to initialize a new class from template view |
| `top-nav-edit-button` | Button to enter Edit Mode for current class/template |
| `top-nav-save-button` | Green button to save changes and exit Edit Mode |
| `top-nav-cancel-button` | Button to cancel pending edits and restore previous layout |
| `top-nav-view-mode-group` | 3-way view mode toggle button group |
| `view-mode-chat-only-button` | Toggle layout to Chat Only view mode |
| `view-mode-split-button` | Toggle layout to Split View mode |
| `view-mode-details-only-button` | Toggle layout to Details Only (Expanded) view mode |

---

## 3. Class Details & Configuration (`ClassDetails.tsx`)

| Element ID | Description / Component Role |
| :--- | :--- |
| `class-details-container` | Main wrapper card for class details panel |
| `class-details-tabs` | Sub-tab navigation header container |
| `class-details-tab-profile` | Tab trigger for "Class Profile" |
| `class-details-tab-materials` | Tab trigger for "Materials Repository" |
| `class-details-tab-instructions` | Tab trigger for "AI Instructions & Guidelines" |
| `class-profile-teaching-style-input` | Input field for instructor teaching style |
| `class-profile-assessment-preferences-input` | Textarea for assessment preferences |
| `class-profile-special-notes-input` | Textarea for class reminders and notes |
| `materials-upload-file-button` | Button to open file upload form (Edit Mode only) |
| `instructions-new-guideline-button` | Button to open prompt template form (Edit Mode only) |

---

## 4. RAG AI Diagnostics & Chat (`RAGClass.tsx`)

| Element ID | Description / Component Role |
| :--- | :--- |
| `rag-panel-header` | Header section of the RAG session sidebar |
| `rag-new-analysis-button` | Button to trigger New AI Analysis modal |
| `rag-search-diagnostics-input` | Search bar to filter conversation history |
| `rag-session-item-{id}` | Session item container in conversation history |
| `rag-duplicate-session-button-{id}` | Button to duplicate an existing chat session |
| `rag-delete-session-button-{id}` | Button to delete a chat session |
| `rag-chat-form-container` | Bottom area containing chat input form |
| `rag-chat-form` | HTML form element for submitting chat messages |
| `rag-chat-input` | Text input bar for typing prompt messages to AI |
| `rag-chat-send-button` | Submit button for sending chat messages |

---

## 5. Roster & Student Management (`StudentRegister.tsx`)

| Element ID | Description / Component Role |
| :--- | :--- |
| `student-register-container` | Main container for student roster section |
| `student-register-add-button` | Button to open "Add Student" prompt |
| `student-card-{id}` | Card container for an individual student in roster |
| `student-detail-modal-overlay` | Modal backdrop for student portfolio details |
| `student-detail-modal` | Card modal for inspecting/editing student details |
| `student-detail-close-button` | Button to close student portfolio modal |

---

## 6. Modals & Dialogs (`CreateClassModal.tsx`, `CommandPalette.tsx`)

| Element ID | Description / Component Role |
| :--- | :--- |
| `create-class-name-input` | Input field for class title when creating new class |
| `create-class-mode-existing-button` | Mode switch tab to select an existing institute |
| `create-class-mode-new-button` | Mode switch tab to register a new institute |
| `create-class-cancel-button` | Cancel button inside create class modal |
| `create-class-submit-button` | Submit button to finalize class creation |
| `command-palette-overlay` | Command palette modal backdrop (`Ctrl + K`) |
| `command-palette-modal` | Command palette container box |
| `command-palette-search-input` | Input bar inside command palette |

---

## 7. Authentication (`AuthPage.tsx`)

| Element ID | Description / Component Role |
| :--- | :--- |
| `auth-back-to-home-button` | Navigation button back to landing page |
| `auth-fullname-input` | Input field for full name during signup |
| `auth-phone-input` | Input field for phone number during signup |
| `auth-email-input` | Input field for user email |
| `auth-password-input` | Input field for user password |
| `auth-submit-button` | Primary button for Sign In / Sign Up submission |
| `auth-toggle-mode-button` | Link/button to switch between Sign In and Sign Up modes |
