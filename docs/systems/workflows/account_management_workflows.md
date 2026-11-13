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
    UI->>UI: Populates full_name, title, affiliation, phone from user.user_metadata (email read-only)
    Teacher->>UI: Edits profile fields and clicks "Save Profile"
    UI->>UI: Sets isSaving = true
    UI->>Auth: Calls updateUserMetadata({ full_name, title, affiliation, phone })
    Auth->>Supa: supabase.auth.updateUser({ data: updatedMetadata })
    alt Success
        Supa-->>Auth: Returns updated User object
        Auth->>Auth: Updates local user state
        UI-->>Teacher: Displays success notification toast and closes modal
    else Failure
        Supa-->>UI: Returns AuthError
        UI-->>Teacher: Displays error toast (onTriggerToast) and restores inputs
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

    Teacher->>UI: Clicks "Change Login Password" in Profile Modal
    Teacher->>UI: Enters newPassword and confirmPassword (min 8 characters)
    Teacher->>UI: Clicks "Save Profile"
    UI->>UI: Validates newPassword === confirmPassword and length >= 8
    UI->>UI: Renders inline progress bar ("Encrypting & updating credentials... Please wait")
    UI->>Supa: supabase.auth.updateUser({ password: newPassword, data: { has_password: true } })
    alt Success
        Supa-->>UI: Digest updated and session refreshed
        UI-->>Teacher: Displays success toast and resets password fields
    else Failure
        Supa-->>UI: Throws validation or network error
        UI-->>Teacher: Displays error message via onTriggerToast and resets isSaving
    end
```

---

## 3. Workflow: Teaching Preferences & AI Assistant Configuration

Educators configure default remedial thresholds, Socratic verbosity, AI feedback tone, and late attendance weighting via the Preferences dialog (`PreferencesModalContent`).

```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Educator
    participant UI as AccountModals (PreferencesModalContent)
    participant Auth as AuthContext (updateUserMetadata)
    participant Supa as Supabase Auth (user_metadata.preferences)

    Teacher->>UI: Opens "Teaching Preferences"
    Teacher->>UI: Configures remedialThreshold (60-90%), socraticVerbosity, feedbackTone, lateAttendanceWeight (0-100%)
    Teacher->>UI: Clicks "Save Preferences"
    UI->>Auth: updateUserMetadata({ preferences: { ... } })
    Auth->>Supa: supabase.auth.updateUser({ data: { preferences } })
    Supa-->>Auth: Persists preferences on authenticated user metadata
    UI-->>Teacher: Displays confirmation toast and closes modal
```
