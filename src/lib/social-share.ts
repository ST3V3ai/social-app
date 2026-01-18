/**
 * Social media sharing utilities
 * Generates platform-specific share URLs with proper encoding
 */

export interface ShareData {
  url: string;
  title: string;
  description?: string;
  imageUrl?: string;
  hashtags?: string[];
}

/**
 * WhatsApp sharing
 * Opens WhatsApp with pre-filled message
 */
export function getWhatsAppShareUrl(data: ShareData): string {
  const text = `${data.title}\n\n${data.url}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * Facebook Messenger sharing
 * Opens Messenger with link to share
 */
export function getMessengerShareUrl(data: ShareData): string {
  return `fb-messenger://share/?link=${encodeURIComponent(data.url)}`;
}

/**
 * Telegram sharing
 * Opens Telegram with pre-filled message
 */
export function getTelegramShareUrl(data: ShareData): string {
  const text = data.description
    ? `${data.title}\n\n${data.description}\n\n${data.url}`
    : `${data.title}\n\n${data.url}`;
  return `https://t.me/share/url?url=${encodeURIComponent(data.url)}&text=${encodeURIComponent(data.title)}`;
}

/**
 * X (Twitter) sharing
 * Opens X with pre-filled tweet
 */
export function getTwitterShareUrl(data: ShareData): string {
  const params = new URLSearchParams({
    url: data.url,
    text: data.title,
  });
  
  if (data.hashtags && data.hashtags.length > 0) {
    params.append('hashtags', data.hashtags.join(','));
  }
  
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

/**
 * Bluesky sharing
 * Opens Bluesky with pre-filled post
 */
export function getBlueskyShareUrl(data: ShareData): string {
  const text = `${data.title}\n\n${data.url}`;
  return `https://bsky.app/intent/compose?text=${encodeURIComponent(text)}`;
}

/**
 * Reddit sharing
 * Opens Reddit submit page
 */
export function getRedditShareUrl(data: ShareData): string {
  const params = new URLSearchParams({
    url: data.url,
    title: data.title,
  });
  
  return `https://reddit.com/submit?${params.toString()}`;
}

/**
 * Discord sharing
 * Copies a formatted message for Discord (Discord doesn't have direct URL share)
 * Returns the formatted text to be copied
 */
export function getDiscordShareText(data: ShareData): string {
  return `**${data.title}**\n\n${data.url}`;
}

/**
 * Slack sharing
 * Opens Slack with pre-filled message (requires Slack to be installed)
 */
export function getSlackShareUrl(data: ShareData): string {
  const text = `${data.title}\n${data.url}`;
  return `slack://sharing/share?text=${encodeURIComponent(text)}`;
}

/**
 * Email sharing
 * Opens default email client with pre-filled subject and body
 */
export function getEmailShareUrl(data: ShareData): string {
  const subject = data.title;
  const body = data.description
    ? `${data.description}\n\n${data.url}`
    : data.url;
  
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * LinkedIn sharing
 * Opens LinkedIn share dialog
 */
export function getLinkedInShareUrl(data: ShareData): string {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(data.url)}`;
}

/**
 * Copy to clipboard
 * Returns true if successful
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        return true;
      } finally {
        document.body.removeChild(textArea);
      }
    }
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}

/**
 * Native share (Web Share API)
 * Returns true if sharing was initiated
 */
export async function shareNative(data: ShareData): Promise<boolean> {
  try {
    if (navigator.share) {
      await navigator.share({
        title: data.title,
        text: data.description,
        url: data.url,
      });
      return true;
    }
    return false;
  } catch (err) {
    // User cancelled or error occurred
    console.error('Native share failed:', err);
    return false;
  }
}

/**
 * Get all available share options
 */
export interface ShareOption {
  id: string;
  name: string;
  icon: string;
  getUrl: (data: ShareData) => string | Promise<void>;
  requiresClipboard?: boolean;
}

export function getAllShareOptions(): ShareOption[] {
  return [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: 'whatsapp',
      getUrl: getWhatsAppShareUrl,
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: 'telegram',
      getUrl: getTelegramShareUrl,
    },
    {
      id: 'messenger',
      name: 'Messenger',
      icon: 'messenger',
      getUrl: getMessengerShareUrl,
    },
    {
      id: 'twitter',
      name: 'X (Twitter)',
      icon: 'twitter',
      getUrl: getTwitterShareUrl,
    },
    {
      id: 'bluesky',
      name: 'Bluesky',
      icon: 'bluesky',
      getUrl: getBlueskyShareUrl,
    },
    {
      id: 'reddit',
      name: 'Reddit',
      icon: 'reddit',
      getUrl: getRedditShareUrl,
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: 'linkedin',
      getUrl: getLinkedInShareUrl,
    },
    {
      id: 'discord',
      name: 'Discord',
      icon: 'discord',
      getUrl: async (data: ShareData) => {
        await copyToClipboard(getDiscordShareText(data));
      },
      requiresClipboard: true,
    },
    {
      id: 'slack',
      name: 'Slack',
      icon: 'slack',
      getUrl: getSlackShareUrl,
    },
    {
      id: 'email',
      name: 'Email',
      icon: 'email',
      getUrl: getEmailShareUrl,
    },
  ];
}
