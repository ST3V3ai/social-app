/**
 * Calendar integration utilities
 * Handles ICS generation with update support and subscription feeds
 */

export interface CalendarEvent {
  id: string;
  slug: string;
  title: string;
  description?: string;
  startTime: string | Date;
  endTime?: string | Date;
  timezone: string;
  location?: string;
  url?: string;
  organizerName?: string;
  organizerEmail?: string;
  status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
  sequence?: number;
  lastModified?: Date;
}

/**
 * Escape special characters for ICS format
 */
export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Format date for ICS (UTC format: YYYYMMDDTHHMMSSZ)
 */
export function formatIcsDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * Generate ICS file content for a single event
 * Supports updates via SEQUENCE and LAST-MODIFIED fields
 */
export function generateIcsFile(event: CalendarEvent): string {
  const now = new Date();
  const sequence = event.sequence ?? 0;
  const lastModified = event.lastModified ?? now;
  const status = event.status ?? 'CONFIRMED';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Gather//Gather Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Gather Event',
    'X-WR-TIMEZONE:' + event.timezone,
    'BEGIN:VEVENT',
    `UID:${event.id}@gather.app`,
    `DTSTAMP:${formatIcsDate(now)}`,
    `DTSTART:${formatIcsDate(event.startTime)}`,
  ];

  if (event.endTime) {
    lines.push(`DTEND:${formatIcsDate(event.endTime)}`);
  }

  lines.push(
    `SUMMARY:${escapeIcsText(event.title)}`,
    `STATUS:${status}`,
    `SEQUENCE:${sequence}`,
    `LAST-MODIFIED:${formatIcsDate(lastModified)}`
  );

  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeIcsText(event.location)}`);
  }

  if (event.url) {
    lines.push(`URL:${event.url}`);
  }

  if (event.organizerName && event.organizerEmail) {
    lines.push(
      `ORGANIZER;CN=${escapeIcsText(event.organizerName)}:mailto:${event.organizerEmail}`
    );
  }

  lines.push(
    'END:VEVENT',
    'END:VCALENDAR'
  );

  return lines.join('\r\n');
}

/**
 * Generate ICS calendar subscription feed for multiple events
 * This allows calendar apps to subscribe and receive updates automatically
 */
export function generateIcsSubscription(
  events: CalendarEvent[],
  calendarName: string = 'Gather Events'
): string {
  const now = new Date();

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Gather//Gather Events Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:' + escapeIcsText(calendarName),
    'X-WR-CALDESC:Events from Gather',
    'X-PUBLISHED-TTL:PT1H', // Refresh every hour
  ];

  // Add each event
  for (const event of events) {
    const sequence = event.sequence ?? 0;
    const lastModified = event.lastModified ?? now;
    const status = event.status ?? 'CONFIRMED';

    lines.push(
      'BEGIN:VEVENT',
      `UID:${event.id}@gather.app`,
      `DTSTAMP:${formatIcsDate(now)}`,
      `DTSTART:${formatIcsDate(event.startTime)}`
    );

    if (event.endTime) {
      lines.push(`DTEND:${formatIcsDate(event.endTime)}`);
    }

    lines.push(
      `SUMMARY:${escapeIcsText(event.title)}`,
      `STATUS:${status}`,
      `SEQUENCE:${sequence}`,
      `LAST-MODIFIED:${formatIcsDate(lastModified)}`
    );

    if (event.description) {
      lines.push(`DESCRIPTION:${escapeIcsText(event.description)}`);
    }

    if (event.location) {
      lines.push(`LOCATION:${escapeIcsText(event.location)}`);
    }

    if (event.url) {
      lines.push(`URL:${event.url}`);
    }

    if (event.organizerName && event.organizerEmail) {
      lines.push(
        `ORGANIZER;CN=${escapeIcsText(event.organizerName)}:mailto:${event.organizerEmail}`
      );
    }

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

/**
 * Generate Google Calendar URL
 * This creates a link to add the event directly to Google Calendar
 */
export function getGoogleCalendarUrl(event: CalendarEvent): string {
  const startDate = formatIcsDate(event.startTime);
  const endDate = event.endTime
    ? formatIcsDate(event.endTime)
    : formatIcsDate(
        new Date(
          new Date(event.startTime).getTime() + 60 * 60 * 1000
        ).toISOString()
      );

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${startDate}/${endDate}`,
    ctz: event.timezone,
  });

  if (event.description) {
    params.append('details', event.description);
  }

  if (event.location) {
    params.append('location', event.location);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate Outlook Calendar URL
 * This creates a link to add the event to Outlook.com calendar
 */
export function getOutlookCalendarUrl(event: CalendarEvent): string {
  const startDate = new Date(event.startTime).toISOString();
  const endDate = event.endTime
    ? new Date(event.endTime).toISOString()
    : new Date(
        new Date(event.startTime).getTime() + 60 * 60 * 1000
      ).toISOString();

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: startDate,
    enddt: endDate,
  });

  if (event.description) {
    params.append('body', event.description);
  }

  if (event.location) {
    params.append('location', event.location);
  }

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generate Office 365 Calendar URL
 */
export function getOffice365CalendarUrl(event: CalendarEvent): string {
  const startDate = new Date(event.startTime).toISOString();
  const endDate = event.endTime
    ? new Date(event.endTime).toISOString()
    : new Date(
        new Date(event.startTime).getTime() + 60 * 60 * 1000
      ).toISOString();

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: startDate,
    enddt: endDate,
  });

  if (event.description) {
    params.append('body', event.description);
  }

  if (event.location) {
    params.append('location', event.location);
  }

  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Generate Yahoo Calendar URL
 */
export function getYahooCalendarUrl(event: CalendarEvent): string {
  const startDate = formatIcsDate(event.startTime);
  const endDate = event.endTime
    ? formatIcsDate(event.endTime)
    : formatIcsDate(
        new Date(
          new Date(event.startTime).getTime() + 60 * 60 * 1000
        ).toISOString()
      );

  // Calculate duration in hours
  const duration = event.endTime
    ? Math.round(
        (new Date(event.endTime).getTime() -
          new Date(event.startTime).getTime()) /
          (1000 * 60 * 60)
      )
    : 1;

  const params = new URLSearchParams({
    v: '60',
    title: event.title,
    st: startDate,
    dur: duration.toString().padStart(2, '0') + '00',
  });

  if (event.description) {
    params.append('desc', event.description);
  }

  if (event.location) {
    params.append('in_loc', event.location);
  }

  return `https://calendar.yahoo.com/?${params.toString()}`;
}
