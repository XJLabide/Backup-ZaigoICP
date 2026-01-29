# UI Design System

This document defines the design system for the application. We use a **hybrid approach**:

| Context | Design System | Philosophy |
|---------|---------------|------------|
| **Auth Pages** | Black/White Minimal | High contrast, distraction-free |
| **Dashboard/App** | Black/White Minimal | Professional, consistent with auth |
| **Landing/Marketing** | Modern SaaS | Engaging, flexible for marketing needs |

---

## Part 1: App Design System (Auth + Dashboard)

The application UI (auth pages and dashboard) follows a minimal, high-contrast design philosophy using a black/white color palette with careful spacing and typography.

### Design Philosophy

The app UI is intentionally **minimal and airy** with a focus on clarity and usability:

- **High contrast**: Pure black and white only - no gradients or secondary colors
- **Minimal decoration**: Essential elements only, no ornamental styling
- **Generous spacing**: Breathing room between elements for clarity
- **System-first**: Leverages platform default typography for accessibility
- **Mobile-first**: Responsive design that works on all screen sizes

This approach ensures the app is distraction-free, accessible, and fast-loading.

## Color System

### Palette

The auth UI uses a strictly limited color palette:

| Color | Token | Usage | CSS Value |
|-------|-------|-------|-----------|
| **Pure Black** | `text-black` / `border-black` / `bg-black` | Primary text, borders, buttons | `#000` or `black` |
| **Pure White** | `text-white` / `bg-white` | Text on black, backgrounds | `#fff` or `white` |
| **Neutral Gray** | `text-neutral-600` | Secondary text (disclaimers, hints) | `oklch(0.556 0 0)` |

### Usage Rules

- **Black (#000)**: Always used for primary buttons, form borders, main text, and visual hierarchy anchors
- **White (#fff)**: Always used for backgrounds and text on dark surfaces
- **Neutral-600**: Used exclusively for secondary text like disclaimers, legal footer, helper text
- **No other colors**: Auth pages should never include brand colors, gradients, or accent colors

### Color Contrast

All text meets WCAG AA standards:
- Black text on white background: 21:1 contrast ratio
- White text on black background: 21:1 contrast ratio
- Neutral-600 text on white: 7.5:1 contrast ratio (AA standard)

## Spacing System

Auth UI follows a **4px grid spacing scale**:

```
4px   (1 unit) - Minimal gaps, micro-spacing
8px   (2 units) - Button padding, small gaps
16px  (4 units) - Form element spacing, medium gaps
24px  (6 units) - Section spacing
32px  (8 units) - Major sections
48px  (12 units) - Large vertical gaps
64px  (16 units) - Maximum spacing between major areas
```

### Tailwind Spacing Classes

Use Tailwind's spacing scale which maps to the 4px grid:

```
p-2 = 8px    (padding)
p-4 = 16px   (padding)
p-6 = 24px   (padding)
gap-2 = 8px  (gaps)
gap-4 = 16px (gaps)
my-8 = 32px  (margin-y)
```

### Common Patterns

- **Form fields**: 16px (gap-4) vertical spacing between fields
- **Form sections**: 24px (gap-6) between logical groups
- **Button groups**: 8px (gap-2) horizontal spacing between buttons
- **Page padding**: 16px (px-4) on mobile, 24px (px-6) on desktop
- **Max width container**: 448px (max-w-md in Tailwind)

## Typography

### Font Stack

All auth UI uses the system sans-serif font stack defined in globals:

```css
font-family: var(--font-sans, system-ui, sans-serif);
```

Fonts loaded:
- Inter (primary, `--font-inter`)
- Roboto (fallback, `--font-roboto`)
- Open Sans (fallback, `--font-open-sans`)
- Poppins (fallback, `--font-poppins`)
- Montserrat (fallback, `--font-montserrat`)

### Type Scale

| Level | Size | Weight | Usage | Tailwind |
|-------|------|--------|-------|----------|
| **Display** | 24px | 600 | Form titles, heading | `text-2xl font-semibold` |
| **Body** | 16px | 400 | Form text, descriptions | `text-base font-normal` |
| **Label** | 14px | 500 | Form labels | `text-sm font-medium` |
| **Caption** | 12px | 400 | Helper text, disclaimers | `text-xs font-normal` |

### Usage

- **Form titles**: "Sign In", "Create Account" → Display level
- **Form descriptions**: "Welcome back" → Body level
- **Form labels**: "Email", "Password" → Label level
- **Helper text**: "Must be at least 8 characters" → Caption level
- **Legal footer**: "By continuing, you agree to..." → Caption level

## Components

### AuthShell

The container component for all authentication pages. Provides consistent layout structure.

**Location**: `/home/natty/linkedin-automation/apps/web/components/auth/AuthShell.tsx`

**Structure**:
```
┌─────────────────────────────────────┐
│ LinkReach                           │  Header (brand)
├─────────────────────────────────────┤
│                                     │
│       (Centered auth form)          │  Main content area
│                                     │
├─────────────────────────────────────┤
│ Legal footer with links             │  Footer
└─────────────────────────────────────┘
```

**Layout**:
- **Header**: Brand name top-left (absolute positioning, top-8 left-8)
- **Main**: Full-height flex container, content centered both axes
- **Content**: Max-width 448px (max-w-md), responsive padding
- **Footer**: Fixed position at bottom with legal links

**CSS**:
```tsx
<div className="min-h-screen bg-white flex flex-col">
  <header className="absolute top-8 left-8">
    <span className="text-xl font-semibold text-black">LinkReach</span>
  </header>

  <main className="flex-1 flex items-center justify-center px-4">
    <div className="w-full max-w-md">
      {children}
    </div>
  </main>

  <footer className="py-8 px-4 text-center">
    {/* Legal links */}
  </footer>
</div>
```

**Props**:
```tsx
interface AuthShellProps {
  children: ReactNode;
}
```

**Usage**:
```tsx
import { AuthShell } from '@/components/auth/AuthShell';

export default function SignInPage() {
  return (
    <AuthShell>
      {/* Auth form content */}
    </AuthShell>
  );
}
```

### AuthForm Pattern

While custom forms can be built, Clerk-provided components (SignIn, SignUp) are recommended for consistency and security. When building custom forms:

**Components Used**:
- `Button`: For form submission and secondary actions
- `Input`: For email, password, and text inputs
- `Label`: For form field labels (from shadcn/ui)

**Structure**:
```tsx
<form className="space-y-4">
  {/* Google OAuth button */}
  <Button variant="secondary" className="w-full">
    Sign in with Google
  </Button>

  {/* Divider */}
  <div className="relative">
    <div className="absolute inset-0 flex items-center">
      <div className="w-full border-t border-black"></div>
    </div>
    <div className="relative flex justify-center text-sm">
      <span className="bg-white px-2 text-neutral-600">or</span>
    </div>
  </div>

  {/* Email input */}
  <div className="space-y-2">
    <Label htmlFor="email">Email</Label>
    <Input
      id="email"
      type="email"
      placeholder="you@example.com"
      required
    />
  </div>

  {/* Submit button */}
  <Button type="submit" className="w-full">
    Continue
  </Button>
</form>
```

## Button Styles

### Primary Button

Used for main form submissions and critical actions.

**Styles**:
```css
background: black (#000)
text: white (#fff)
border: black (#000)
padding: 8px 16px (Tailwind: px-4 py-2)
border-radius: 6px (rounded-md)
```

**Tailwind Classes**:
```tsx
<Button className="bg-black text-white border-black hover:bg-gray-900">
  Continue
</Button>
```

**States**:
- **Default**: Black background, white text
- **Hover**: Slightly darker black (bg-gray-900)
- **Focus**: Visible focus ring (focus-visible:ring-black)
- **Disabled**: Reduced opacity (disabled:opacity-50)

### Secondary Button

Used for alternative actions like OAuth providers.

**Styles**:
```css
background: white (#fff)
text: black (#000)
border: 1px black (#000)
padding: 8px 16px (Tailwind: px-4 py-2)
border-radius: 6px (rounded-md)
```

**Tailwind Classes**:
```tsx
<Button variant="secondary" className="border-black">
  Sign in with Google
</Button>
```

**States**:
- **Default**: White background, black text, black border
- **Hover**: Light gray background (bg-gray-50)
- **Focus**: Visible focus ring (focus-visible:ring-black)
- **Disabled**: Reduced opacity (disabled:opacity-50)

### Button Sizing

| Size | Height | Padding | Usage |
|------|--------|---------|-------|
| **Default** | 36px | 8px 16px | Form buttons, primary actions |
| **Small** | 32px | 6px 12px | Secondary actions (if needed) |
| **Large** | 40px | 8px 32px | Full-width call-to-actions |

For auth forms, use default (36px) for normal actions and large for full-width submissions.

## Input Styles

### Standard Text Input

All form inputs use consistent styling.

**Styles**:
```css
border: 1px black (#000)
border-radius: 6px (rounded-md)
padding: 8px 12px (px-3 py-1)
background: white (#fff)
font-size: 14px (text-sm)
```

**Tailwind Classes**:
```tsx
<input
  className="border border-black rounded-md px-3 py-1 text-sm focus:ring-black focus:outline-none"
  type="email"
  placeholder="you@example.com"
/>
```

Or use the `Input` component:
```tsx
import { Input } from '@/components/ui/input';

<Input
  type="email"
  placeholder="you@example.com"
  className="border-black"
/>
```

**States**:
- **Default**: Black border, white background
- **Focus**: Ring focus (focus-visible:ring-1 focus-visible:ring-black)
- **Disabled**: Reduced opacity (disabled:opacity-50)
- **Error**: Border stays black, error message in red below (handle via validation)

### Input Types

Supported input types for auth:
- `email`: Email addresses
- `password`: Password fields (masked input)
- `text`: General text input
- `tel`: Phone numbers (if needed)

### Placeholder Text

Placeholder text uses neutral-600:
```tsx
<Input
  placeholder="you@example.com"
  className="placeholder:text-neutral-600"
/>
```

## Form Labels

Labels must be properly associated with inputs for accessibility.

**Structure**:
```tsx
import { Label } from '@/components/ui/label';

<div className="space-y-2">
  <Label htmlFor="email" className="text-sm font-medium">
    Email Address
  </Label>
  <Input id="email" type="email" />
</div>
```

**Styling**:
- Font size: 14px (text-sm)
- Font weight: 500 (font-medium)
- Text color: Black
- Spacing below: 8px (gap-2 or space-y-2)

**Required Fields**:
```tsx
<Label htmlFor="email">
  Email Address <span className="text-red-600">*</span>
</Label>
```

## Accessibility

### Keyboard Navigation

All interactive elements must be keyboard-accessible:

- **Tab order**: Logical left-to-right, top-to-bottom flow
- **Focus visible**: All buttons and inputs show visible focus ring (black)
- **Enter key**: Form submission on Enter
- **Escape key**: Can be used to close modals or dismiss errors (if implemented)

**Focus ring CSS** (built-in):
```css
focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black
```

### Labels & ARIA

Every form input must have an associated label:

```tsx
<Label htmlFor="email">Email Address</Label>
<Input id="email" type="email" aria-describedby="email-hint" />
<p id="email-hint" className="text-xs text-neutral-600">
  We'll never share your email
</p>
```

### ARIA Attributes

Use appropriate ARIA attributes:

```tsx
<button
  aria-label="Sign in with Google"
  aria-busy={isLoading}
  disabled={isLoading}
>
  {isLoading ? 'Signing in...' : 'Sign in with Google'}
</button>
```

### Error Messages

Error messages should be clearly associated with fields:

```tsx
<div className="space-y-2">
  <Label htmlFor="password">Password</Label>
  <Input
    id="password"
    type="password"
    aria-invalid={hasError}
    aria-describedby="password-error"
  />
  {hasError && (
    <p id="password-error" className="text-sm text-red-600">
      Password must be at least 8 characters
    </p>
  )}
</div>
```

### Reduced Motion

Respect user's motion preferences:

```css
@media (prefers-reduced-motion: reduce) {
  .animate-fade-in {
    animation: none;
    opacity: 1;
  }
}
```

## Routes

### Sign In Page

**Route**: `/sign-in`

**Path**: `/home/natty/linkedin-automation/apps/web/app/(auth)/sign-in/[[...sign-in]]/page.tsx`

**Purpose**: User authentication with existing account

**Features**:
- Email/password sign-in
- Google OAuth option
- Link to sign-up if new user
- Password recovery option

**Implementation**:
```tsx
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn afterSignInUrl="/dashboard" />
    </div>
  );
}
```

### Sign Up Page

**Route**: `/sign-up`

**Path**: `/home/natty/linkedin-automation/apps/web/app/(auth)/sign-up/[[...sign-up]]/page.tsx`

**Purpose**: Create a new account

**Features**:
- Email/password signup
- Google OAuth option
- Link to sign-in for existing users
- Email verification flow

**Implementation**:
```tsx
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp afterSignUpUrl="/dashboard" />
    </div>
  );
}
```

### Protected Routes

All dashboard and authenticated pages should redirect to `/sign-in` if user is not authenticated. This is handled by Clerk middleware.

## Implementation Checklist

When building auth pages or components:

- [ ] Page uses `AuthShell` wrapper component
- [ ] All text and borders use black (#000) only
- [ ] Secondary text uses neutral-600 only
- [ ] Spacing follows 4px grid (8px, 16px, 24px, etc.)
- [ ] All form fields have associated `<Label>` elements
- [ ] Buttons use correct variant (primary or secondary)
- [ ] All inputs have proper `id` and `htmlFor` attributes
- [ ] Focus states show visible black ring
- [ ] Forms submit on Enter key
- [ ] Error messages are displayed clearly
- [ ] Page is responsive on mobile/tablet/desktop
- [ ] All colors pass WCAG AA contrast requirements
- [ ] No animations for users with reduced motion preference
- [ ] Legal footer is present with links to Terms/Privacy
- [ ] Brand logo/name is visible top-left

## Related Files

- **Components**:
  - `/home/natty/linkedin-automation/apps/web/components/auth/AuthShell.tsx`
  - `/home/natty/linkedin-automation/apps/web/components/ui/button.tsx`
  - `/home/natty/linkedin-automation/apps/web/components/ui/input.tsx`
  - `/home/natty/linkedin-automation/apps/web/components/ui/label.tsx`

- **Styles**:
  - `/home/natty/linkedin-automation/apps/web/app/globals.css`

- **Pages**:
  - `/home/natty/linkedin-automation/apps/web/app/(auth)/sign-in/[[...sign-in]]/page.tsx`
  - `/home/natty/linkedin-automation/apps/web/app/(auth)/sign-up/[[...sign-up]]/page.tsx`

- **Providers**:
  - `/home/natty/linkedin-automation/apps/web/components/providers.tsx` (Clerk integration)

## Examples

### Complete Sign-In Form

```tsx
import { AuthShell } from '@/components/auth/AuthShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

export default function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <AuthShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-black">Sign In</h1>
          <p className="text-sm text-neutral-600 mt-1">
            Welcome back to LinkReach
          </p>
        </div>

        <Button variant="secondary" className="w-full border-black">
          Continue with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-black"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-2 text-neutral-600">or</span>
          </div>
        </div>

        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-black"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-black"
            />
          </div>

          <Button type="submit" className="w-full">
            Sign In
          </Button>
        </form>

        <p className="text-center text-sm text-neutral-600">
          Don't have an account?{' '}
          <a href="/sign-up" className="text-black underline hover:no-underline">
            Sign up
          </a>
        </p>
      </div>
    </AuthShell>
  );
}
```

### Custom Text Input with Error

```tsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

export function EmailInput() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError('');
  };

  const validate = () => {
    if (!email) {
      setError('Email is required');
      return false;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email');
      return false;
    }
    return true;
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="email">Email Address</Label>
      <Input
        id="email"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={handleChange}
        onBlur={validate}
        aria-invalid={!!error}
        aria-describedby={error ? 'email-error' : undefined}
        className="border-black"
      />
      {error && (
        <p id="email-error" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
```

## Design System Tokens

Quick reference for common values:

```
Colors:
  Primary: black (#000)
  Secondary: white (#fff)
  Text Muted: neutral-600

Spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px

Typography:
  Display: 24px / 600
  Body: 16px / 400
  Label: 14px / 500
  Caption: 12px / 400

Radius:
  md: 6px (rounded-md)

Sizing:
  Max width: 448px (max-w-md)
  Button height: 36px (default)
  Input height: 36px

Transitions:
  Default: 150ms ease-in-out
```

---

## Part 2: Landing Page Design System

The landing/marketing pages use a **different design system** optimized for conversion and visual appeal.

### Philosophy

- **Modern SaaS aesthetic**: Soft gradients, rounded elements, engaging visuals
- **Flexible color palette**: Neutral grays with accent colors allowed
- **Marketing-focused**: Designed to convert visitors, not for daily app use

### Color Palette (Landing Only)

| Color | Usage | Tailwind |
|-------|-------|----------|
| Neutral-900 | Primary text | `text-neutral-900` |
| Neutral-600 | Secondary text | `text-neutral-600` |
| Neutral-200/300 | Borders | `border-neutral-200` |
| White | Backgrounds | `bg-white` |
| Accent colors | CTAs, highlights | As needed for marketing |

### Allowed Elements (Landing Only)

- `rounded-full` for buttons and pills
- Gradient backgrounds and accents
- Decorative elements (noise textures, glows)
- Larger typography (up to 60px for heroes)
- Shadow effects

### Boundary Rules

| Element | App (Auth + Dashboard) | Landing |
|---------|------------------------|---------|
| Buttons | `rounded-md`, black/white | `rounded-full`, flexible |
| Borders | `border-black` | `border-neutral-*` |
| Colors | Black, white, neutral-600 only | Full neutral palette + accents |
| Typography max | 24px | 60px |
| Decorations | None | Allowed |

---

## Support

For questions or issues regarding the design system, refer to:
- App components: `apps/web/components/auth/`, `apps/web/components/dashboard/`
- Landing components: `apps/web/components/landing/`
- Global styles: `apps/web/app/globals.css`
- Tailwind configuration for spacing and sizing scale
