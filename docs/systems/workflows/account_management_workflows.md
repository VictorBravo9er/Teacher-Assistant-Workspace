# Account & Preferences Management Workflows

This document outlines the user flows for profile configuration, teaching preferences, authentication security, and subscription tier management implemented in `frontend/src/features/account/AccountModals.tsx`.

---

## 1. Workflow: Educator Profile & Metadata Customization

Educators maintain their academic profile metadata, department affiliations, and contact records through the Profile Settings dialog.

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Educator
    participant UI as AccountModals (ProfileModalContent)
    participant Auth as AuthContext (updateUserMetadata)
    participant Supa as Supabase Auth (supabase.auth.updateUser)

    Teacher->>UI: Opens Profile Settings from sidebar or header dropdown
    UI->>UI: Populates full_name, title, affiliation, phone from user.user_metadata
    Teacher->>UI: Edits profile fields and clicks "Save Changes"
    UI->>UI: Sets isSaving = true
    UI->>Auth: Calls updateUserMetadata({ full_name, title, affiliation, phone })
    Auth->>Supa: supabase.auth.updateUser({ data: updatedMetadata })
    alt Success
        Supa-->>Auth: Returns updated User object
        Auth->>Auth: Updates local user state
        UI-->>Teacher: Displays success notification toast and closes modal
    else Failure
        Supa-->>UI: Returns AuthError
        UI-->>Teacher: Displays error alert banner and restores editable inputs
    end
```

---

## 2. Workflow: Account Password Rotation & Credential Encryption

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Educator
    participant UI as AccountModals (showPasswordChange)
    participant Supa as Supabase Auth

    Teacher->>UI: Toggles "Change Password" checkbox in Profile Settings
    Teacher->>UI: Enters newPassword and confirmPassword (min 8 characters)
    Teacher->>UI: Clicks "Save Changes"
    UI->>UI: Validates newPassword === confirmPassword and length >= 8
    UI->>UI: Renders blocking progress state ("Encrypting credentials and refreshing session...")
    UI->>Supa: supabase.auth.updateUser({ password: newPassword })
    alt Success
        Supa-->>UI: Digest updated and session refreshed
        UI-->>Teacher: Displays success toast and resets form fields
    else Failure
        Supa-->>UI: Throws validation or network error
        UI-->>Teacher: Displays inline error message and unlocks form
    end
```

---

## 3. Workflow: Teaching Preferences & AI Assistant Configuration

Educators configure platform-wide pedagogical behaviors, default grading approaches, and theme styling via the Preferences dialog.

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Educator
    participant UI as AccountModals (PreferencesModalContent)
    participant Local as Local Storage / User State

    Teacher->>UI: Opens "Teaching Preferences"
    Teacher->>UI: Selects default grading scale (Letter / Points / Rubric-Only)
    Teacher->>UI: Sets AI Assistant persona tone (Strict / Encouraging / Analytical)
    Teacher->>UI: Clicks "Save Preferences"
    UI->>Local: Commits preferences to browser storage / user profile
    UI-->>Teacher: Displays toast and updates workspace defaults
```
