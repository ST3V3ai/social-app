# Mobile Support & Visual Testing

## Overview

Gather is a fully responsive web application with comprehensive mobile support. This document outlines the mobile features, visual testing infrastructure, and app flow documentation.

## Mobile Support Features

### Responsive Design

The application uses Tailwind CSS with mobile-first breakpoints to ensure a polished experience across all devices:

- **Breakpoints:**
  - Mobile: < 640px
  - Tablet: 640px - 1024px
  - Desktop: > 1024px

- **Responsive Components:**
  - Adaptive navigation (mobile hamburger menu, desktop nav bar)
  - Flexible grid layouts (1 column on mobile, 2-3 columns on desktop)
  - Responsive typography (scales based on viewport)
  - Touch-optimized buttons and interactive elements
  - Optimized spacing and padding for different screen sizes

### Mobile-Optimized Pages

All pages are fully responsive:

#### Public Pages
- **Homepage** - Hero section with trending/upcoming events
- **Explore** - Event discovery with grid layout
- **Login/Register** - Simplified forms for mobile
- **About/Help/Terms/Privacy** - Readable content layout

#### Authenticated Pages
- **Create Event** - Mobile-friendly form layout
- **My Events** - Event management dashboard
- **Settings** - User preferences
- **Notifications** - Activity feed
- **Event Details** - Event information and RSVP
- **User Profiles** - User information and events

#### Admin Pages
- **Admin Dashboard** - Analytics and overview
- **User Management** - User administration
- **Event Management** - Event moderation
- **Reports** - Content moderation

## Visual Testing Infrastructure

### Setup

We use Playwright for automated screenshot generation and visual regression testing.

**Installation:**
```bash
npm install
npm run playwright:install
```

### Running Visual Tests

**Generate screenshots for all pages:**
```bash
npm run test:screenshots
```

**Run all visual tests:**
```bash
npm run test:visual
```

**Run tests with UI mode:**
```bash
npm run test:visual:ui
```

### Screenshot Organization

Screenshots are automatically generated in both mobile and desktop viewports:

```
screenshots/
├── Mobile Chrome/           # Pixel 5 viewport (393x851)
│   ├── homepage.png
│   ├── explore.png
│   ├── login.png
│   ├── register.png
│   ├── create-event.png
│   ├── my-events.png
│   ├── settings.png
│   ├── notifications.png
│   ├── about.png
│   ├── help.png
│   ├── terms.png
│   ├── privacy.png
│   ├── mobile-menu-open.png
│   ├── event-cards.png
│   └── form-inputs.png
│
└── Desktop Chrome/          # Desktop viewport (1280x720)
    ├── homepage.png
    ├── explore.png
    ├── login.png
    ├── register.png
    ├── create-event.png
    ├── my-events.png
    ├── settings.png
    ├── notifications.png
    ├── about.png
    ├── help.png
    ├── terms.png
    ├── privacy.png
    ├── event-cards.png
    └── form-inputs.png
```

## App Flow Documentation

### User Journey: New User Registration to Event Creation

1. **Homepage (Mobile & Desktop)**
   - Landing page with hero section
   - Display of trending and upcoming events
   - Call-to-action buttons for sign up

2. **Register Page (Mobile & Desktop)**
   - User registration form
   - Name, email, password fields
   - Mobile-optimized input fields

3. **Login Page (Mobile & Desktop)**
   - Email and password authentication
   - "Remember me" option
   - Password recovery link

4. **Explore Page (Mobile & Desktop)**
   - Event discovery grid
   - Responsive card layout
   - Search and filter options

5. **Event Details (Mobile & Desktop)**
   - Full event information
   - RSVP functionality
   - Location and time details
   - Attendee list

6. **Create Event (Mobile & Desktop)**
   - Multi-field event creation form
   - Date/time pickers
   - Location input
   - Description editor
   - Privacy settings

7. **My Events (Mobile & Desktop)**
   - User's created events
   - Event management actions
   - Quick edit access

8. **Settings (Mobile & Desktop)**
   - Profile management
   - Password change
   - Notification preferences
   - Account settings

### Admin Journey

1. **Admin Dashboard (Mobile & Desktop)**
   - System overview
   - User statistics
   - Event analytics

2. **User Management (Mobile & Desktop)**
   - User list
   - User actions (verify, ban, delete)
   - Search functionality

3. **Event Management (Mobile & Desktop)**
   - Event moderation
   - Event approval/rejection
   - Event editing

4. **Reports (Mobile & Desktop)**
   - Content moderation
   - Report handling
   - User/event reports

## Testing Strategy

### Visual Regression Testing

Visual tests run automatically for:
- All public pages
- All authenticated pages (with login flow)
- Responsive components
- Mobile-specific interactions (menu, forms, etc.)

### Test Configuration

- **Mobile Device:** Pixel 5 (393x851 viewport)
- **Desktop Device:** Standard Chrome (1280x720 viewport)
- **Full Page Screenshots:** Enabled for all pages
- **Component Screenshots:** For specific UI elements

### CI/CD Integration

Visual tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Install dependencies
  run: npm ci
  
- name: Install Playwright browsers
  run: npm run playwright:install

- name: Run visual tests
  run: npm run test:screenshots
```

## Best Practices

### Mobile Development

1. **Touch Targets:** Minimum 44x44px for all interactive elements
2. **Responsive Images:** Use next/image for optimized loading
3. **Performance:** Lazy load content below the fold
4. **Navigation:** Clear, accessible mobile menu
5. **Forms:** Large input fields, clear labels

### Visual Testing

1. **Consistency:** Always test both mobile and desktop
2. **State Testing:** Test different UI states (empty, loading, error, success)
3. **Interactions:** Screenshot before and after user interactions
4. **Accessibility:** Ensure text is readable at all sizes

## Maintenance

### Updating Screenshots

When UI changes are intentional, regenerate baseline screenshots:

```bash
npm run test:screenshots
```

Review generated screenshots in the `screenshots/` directory and commit if they represent the desired state.

### Adding New Pages

To add visual tests for new pages:

1. Create a new test file in `tests/visual/`
2. Add test cases for the new page
3. Include both mobile and desktop viewports
4. Run tests to generate screenshots
5. Update this documentation

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [Next.js Mobile Optimization](https://nextjs.org/docs/app/building-your-application/optimizing)
