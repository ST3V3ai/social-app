# Social Sharing and Calendar Integration

This document describes the social media sharing and calendar integration features added to the Gather event platform.

## Overview

The platform now supports comprehensive social media sharing and calendar integration with the following features:

1. **Multi-Platform Social Sharing**: Share events to WhatsApp, Telegram, Messenger, X (Twitter), Bluesky, Reddit, Discord, Slack, LinkedIn, and Email
2. **Advanced Calendar Integration**: Add events to Google Calendar, Outlook, Office 365, Yahoo Calendar, and download .ics files
3. **Rich Social Previews**: OpenGraph and Twitter Card meta tags for embedded images and event details
4. **Calendar Update Support**: ICS files with SEQUENCE and LAST-MODIFIED fields for proper event updates

## Social Sharing Features

### Supported Platforms

The ShareButton component provides easy sharing to:

- **WhatsApp** - Share with pre-filled message
- **Telegram** - Share with event details
- **Messenger** - Share via Facebook Messenger
- **X (Twitter)** - Tweet with event link
- **Bluesky** - Post to Bluesky social network
- **Reddit** - Submit to Reddit
- **Discord** - Copy formatted message for Discord
- **Slack** - Share to Slack workspace
- **LinkedIn** - Share to professional network
- **Email** - Send via default email client
- **Native Share** - Uses device's native share functionality when available
- **Copy Link** - Copy event URL to clipboard

### Usage

```tsx
import { ShareButton } from '@/components/events';

<ShareButton 
  title="My Event"
  description="Event description"
  imageUrl="https://example.com/cover.jpg"
  url="https://example.com/event"
/>
```

### Implementation Details

The sharing functionality is implemented in `src/lib/social-share.ts` with functions for each platform:

- `getWhatsAppShareUrl()` - Generate WhatsApp share link
- `getTelegramShareUrl()` - Generate Telegram share link
- `getTwitterShareUrl()` - Generate X/Twitter share link
- `getBlueskyShareUrl()` - Generate Bluesky share link
- `getRedditShareUrl()` - Generate Reddit submit link
- `getSlackShareUrl()` - Generate Slack share link
- `getEmailShareUrl()` - Generate mailto link
- `copyToClipboard()` - Copy text to clipboard
- `shareNative()` - Use Web Share API

## Calendar Integration Features

### Supported Calendar Services

The AddToCalendar component supports:

- **Google Calendar** - Direct link or OAuth sync (if configured)
- **Outlook.com** - Add to Outlook web calendar
- **Office 365** - Add to Office 365 calendar
- **Yahoo Calendar** - Add to Yahoo calendar
- **.ics Download** - Universal calendar file format

### Event Update Support

ICS files now include:

- **UID**: Unique identifier for the event (`{eventId}@gather.app`)
- **SEQUENCE**: Incremental counter that increases with each update
- **LAST-MODIFIED**: Timestamp of last modification
- **STATUS**: Event status (CONFIRMED, TENTATIVE, CANCELLED)

This allows calendar apps to properly handle event updates when users re-download the .ics file.

### Usage

```tsx
import { AddToCalendar } from '@/components/events';

<AddToCalendar event={eventData} />
```

### Implementation Details

Calendar utilities are in `src/lib/calendar.ts`:

- `generateIcsFile()` - Generate ICS file content with update support
- `getGoogleCalendarUrl()` - Generate Google Calendar add link
- `getOutlookCalendarUrl()` - Generate Outlook.com add link
- `getOffice365CalendarUrl()` - Generate Office 365 add link
- `getYahooCalendarUrl()` - Generate Yahoo Calendar add link
- `escapeIcsText()` - Escape special characters for ICS format
- `formatIcsDate()` - Format dates for ICS (UTC format)

## OpenGraph Meta Tags

Event pages now include comprehensive OpenGraph and Twitter Card meta tags:

```html
<meta property="og:title" content="Event Title" />
<meta property="og:description" content="Event description..." />
<meta property="og:image" content="https://example.com/cover.jpg" />
<meta property="og:url" content="https://example.com/event" />
<meta property="og:type" content="website" />
<meta property="og:event:start_time" content="2024-01-01T10:00:00Z" />
<meta property="og:event:end_time" content="2024-01-01T12:00:00Z" />
<meta property="og:event:location" content="Venue Name" />
<meta property="og:event:organizer" content="Organizer Name" />
```

This ensures rich previews when sharing event links on social media platforms.

## API Endpoints

### Download ICS File

```
GET /api/events/{id}/ics
```

Downloads an .ics file for the event with full update support.

**Parameters:**
- `id` - Event ID or slug

**Response:**
- Content-Type: `text/calendar; charset=utf-8`
- Content-Disposition: `attachment; filename="{slug}.ics"`

**Features:**
- Proper UID for calendar app recognition
- SEQUENCE field for update tracking
- LAST-MODIFIED timestamp
- STATUS field (CONFIRMED/TENTATIVE/CANCELLED)
- Support for both online and physical events
- Timezone information

## Technical Implementation

### File Structure

```
src/
├── lib/
│   ├── social-share.ts      # Social media sharing utilities
│   └── calendar.ts           # Calendar integration utilities
├── components/events/
│   ├── ShareButton.tsx       # Social sharing dropdown component
│   └── AddToCalendar.tsx     # Calendar integration dropdown component
└── app/
    ├── e/[slug]/page.tsx     # Event page with metadata
    └── api/events/[id]/ics/
        └── route.ts          # ICS file generation endpoint
```

### Key Features

1. **Dropdown Menus**: Both components use elegant dropdown menus with backdrop and smooth transitions
2. **Icons**: Platform-specific icons (emoji-based for simplicity)
3. **Error Handling**: Graceful fallbacks for unsupported features
4. **Accessibility**: Keyboard navigation and proper ARIA labels
5. **Mobile-Friendly**: Responsive design with touch-friendly targets

### Testing

To test the social sharing features:

1. Navigate to any event page
2. Click the "Share" button
3. Select a platform to test the share URL
4. Verify the link opens correctly and includes event details

To test calendar integration:

1. Navigate to any event page
2. Click "Add to Calendar"
3. Select a calendar service
4. Verify the event is added with correct details
5. Update the event and verify SEQUENCE increments

## Best Practices

### For Social Sharing

- Keep event titles concise (under 100 characters)
- Use high-quality cover images (1200x630px recommended)
- Include descriptive text in event descriptions
- Test share previews using platform-specific tools

### For Calendar Integration

- Always include start and end times
- Specify timezone explicitly
- Provide complete location information
- Update events by incrementing SEQUENCE
- Use STATUS field for cancelled events

## Troubleshooting

### Share Links Not Working

- Verify the event URL is publicly accessible
- Check that OpenGraph meta tags are properly rendered
- Test with platform-specific debugging tools

### Calendar Events Not Updating

- Ensure SEQUENCE field increments on updates
- Verify LAST-MODIFIED timestamp is current
- Check that UID remains consistent across updates
- Some calendar apps require manual refresh

### Images Not Showing in Previews

- Verify cover image URL is accessible
- Check image dimensions (1200x630px recommended)
- Ensure HTTPS is used for images
- Test with Facebook Sharing Debugger or Twitter Card Validator

## Future Enhancements

Potential improvements for future releases:

1. **Calendar Subscription Feeds**: Allow users to subscribe to event updates
2. **Instagram Sharing**: Add Instagram story sharing (requires native app)
3. **Analytics**: Track which platforms are most used for sharing
4. **Custom Share Messages**: Allow event creators to customize share text
5. **RSVP Integration**: Include RSVP buttons in social previews
6. **Reminder Notifications**: Send calendar reminders for events
7. **Multiple Calendar Sync**: Keep events synced across multiple calendars

## Support

For issues or questions about social sharing or calendar integration:

1. Check this documentation first
2. Review the source code in `src/lib/` for implementation details
3. Test with platform-specific debugging tools
4. Report bugs with specific platform and browser information
