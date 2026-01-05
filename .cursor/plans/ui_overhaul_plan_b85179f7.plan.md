---
name: UI Overhaul Plan
overview: Simplify the header to show only profile avatar and mode toggle, redesign login/signup forms with card layout, move authenticated dashboard to root route, and ensure atomic components use default styles.
todos:
  - id: header
    content: Simplify header to only show ModeToggle and UserMenu
    status: completed
  - id: user-menu
    content: Rewrite UserMenu with Avatar trigger and full dropdown menu
    status: completed
  - id: login-form
    content: Redesign SignInForm with Card layout, Field components, Google button
    status: completed
  - id: signup-form
    content: Redesign SignUpForm to match new login style
    status: completed
  - id: routes
    content: Move dashboard to root route with auth check, delete old dashboard route
    status: completed
---

# UI Overhaul Plan

## 1. Simplify Header Component

Update [`apps/web/src/components/header.tsx`](apps/web/src/components/header.tsx):

- Remove all navigation links
- Keep only ModeToggle and UserMenu together on the right side (toggle adjacent to user avatar)
- Clean up the layout to be minimal

**Previous UI state:** Header had navigation links (Home, Dashboard) on the left with ModeToggle and UserMenu grouped together on the right.

## 2. Update UserMenu with Avatar

Rewrite [`apps/web/src/components/user-menu.tsx`](apps/web/src/components/user-menu.tsx) based on the provided NavUser pattern:

- Replace text button trigger with Avatar showing user initials/image
- Use existing `Avatar`, `AvatarImage`, `AvatarFallback` from `@/components/ui/avatar`
- Add dropdown with user info, account options, and sign out
- Include icons from lucide-react (BadgeCheck, Bell, CreditCard, LogOut, Sparkles)
- When not logged in, redirect to `/login` instead of showing a button

## 3. Redesign Login Form

Rewrite [`apps/web/src/components/sign-in-form.tsx`](apps/web/src/components/sign-in-form.tsx):

- Wrap form in Card with CardHeader (title, description) and CardContent
- Use Field, FieldLabel, FieldGroup, FieldDescription from `@/components/ui/field`
- Add "Forgot your password?" link
- Add Google login button with icon (lucide-react's Chrome)
- Remove extra className styling from Button components
- Link to signup page using anchor or route navigation

## 4. Redesign Sign Up Form

Update [`apps/web/src/components/sign-up-form.tsx`](apps/web/src/components/sign-up-form.tsx) to match the login form style:

- Use Card layout with CardHeader and CardContent
- Use Field components for form fields (Name, Email, Password)
- Add Google signup button with icon
- Remove extra className styling from Button components

## 5. Update Routing Structure

Move dashboard to root and make it authenticated:

- Update [`apps/web/src/routes/index.tsx`](apps/web/src/routes/index.tsx): Replace the current home component with the Calendar dashboard, add the beforeLoad auth check
- Delete [`apps/web/src/routes/dashboard.tsx`](apps/web/src/routes/dashboard.tsx) (no longer needed)
- Update [`apps/web/src/components/sign-in-form.tsx`](apps/web/src/components/sign-in-form.tsx): Navigate to "/" after successful login
- Update [`apps/web/src/components/sign-up-form.tsx`](apps/web/src/components/sign-up-form.tsx): Navigate to "/" after successful signup
- Update [`apps/web/src/components/user-menu.tsx`](apps/web/src/components/user-menu.tsx): Navigate to "/" after sign out

## 6. Atomic Component Style Guidelines

All UI components should follow the existing atomic component patterns established in `apps/web/src/components/ui/`:

### Button Component Pattern (`button.tsx`)
- Uses `@base-ui/react` primitives as the foundation
- Styled with `class-variance-authority` (cva) for variant management
- Variants: `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`
- Sizes: `default`, `xs`, `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`
- Uses `cn()` utility for className merging
- Default styles applied via `defaultVariants` - avoid overriding with custom classNames when possible

### General Atomic Component Rules
- Prefer using variant props over custom className overrides
- Compose with `cn()` from `@/lib/utils` for any necessary className additions
- Use `data-slot` attributes for component identification
- Follow the existing focus-visible, disabled, and aria-invalid styling patterns
- Icons should use `[&_svg:not([class*='size-'])]:size-4` pattern for consistent sizing

## Files Changed Summary

| File | Action |
|------|--------|
| `apps/web/src/components/header.tsx` | Simplify - remove nav |
| `apps/web/src/components/user-menu.tsx` | Rewrite - avatar trigger |
| `apps/web/src/components/sign-in-form.tsx` | Redesign - card layout |
| `apps/web/src/components/sign-up-form.tsx` | Redesign - card layout |
| `apps/web/src/routes/index.tsx` | Replace with dashboard |
