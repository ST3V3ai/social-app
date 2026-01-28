'use client';

import { useState } from 'react';
import { Share2, ChevronDown, Copy, Check } from 'lucide-react';
import {
  getWhatsAppShareUrl,
  getMessengerShareUrl,
  getTelegramShareUrl,
  getTwitterShareUrl,
  getBlueskyShareUrl,
  getRedditShareUrl,
  getDiscordShareText,
  getSlackShareUrl,
  getEmailShareUrl,
  copyToClipboard,
  shareNative,
  type ShareData,
} from '@/lib/social-share';

interface ShareButtonProps {
  title: string;
  description?: string;
  imageUrl?: string;
  url?: string;
  className?: string;
}

export function ShareButton({ 
  title, 
  description, 
  imageUrl,
  url,
  className = '' 
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);

  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  
  const shareData: ShareData = {
    url: shareUrl,
    title,
    description,
    imageUrl,
  };

  const handleCopyLink = async () => {
    const success = await copyToClipboard(shareUrl);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    const success = await shareNative(shareData);
    if (success) {
      setIsOpen(false);
    }
  };

  const handlePlatformShare = (
    getUrl: (data: ShareData) => string,
    platformId?: string
  ) => {
    const url = getUrl(shareData);
    window.open(url, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  const handleDiscordShare = async () => {
    const text = getDiscordShareText(shareData);
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedPlatform('discord');
      setTimeout(() => setCopiedPlatform(null), 2000);
    }
  };

  // Social media platforms configuration
  const platforms = [
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: '💬',
      color: 'hover:bg-green-50 hover:text-green-600',
      getUrl: getWhatsAppShareUrl,
    },
    {
      id: 'telegram',
      name: 'Telegram',
      icon: '✈️',
      color: 'hover:bg-blue-50 hover:text-blue-600',
      getUrl: getTelegramShareUrl,
    },
    {
      id: 'messenger',
      name: 'Messenger',
      icon: '💬',
      color: 'hover:bg-blue-50 hover:text-blue-600',
      getUrl: getMessengerShareUrl,
    },
    {
      id: 'twitter',
      name: 'X (Twitter)',
      icon: '𝕏',
      color: 'hover:bg-gray-50 hover:text-gray-900',
      getUrl: getTwitterShareUrl,
    },
    {
      id: 'bluesky',
      name: 'Bluesky',
      icon: '🦋',
      color: 'hover:bg-blue-50 hover:text-blue-600',
      getUrl: getBlueskyShareUrl,
    },
    {
      id: 'reddit',
      name: 'Reddit',
      icon: '🤖',
      color: 'hover:bg-orange-50 hover:text-orange-600',
      getUrl: getRedditShareUrl,
    },
    {
      id: 'slack',
      name: 'Slack',
      icon: '💼',
      color: 'hover:bg-purple-50 hover:text-purple-600',
      getUrl: getSlackShareUrl,
    },
    {
      id: 'email',
      name: 'Email',
      icon: '📧',
      color: 'hover:bg-gray-50 hover:text-gray-700',
      getUrl: getEmailShareUrl,
    },
  ];

  return (
    <div className={`relative inline-block ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Share2 className="w-4 h-4" />
        Share
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-50">
            <div className="py-2">
              {/* Native Share (if available) */}
              {typeof navigator !== 'undefined' && navigator.share && (
                <>
                  <button
                    onClick={handleNativeShare}
                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <span className="text-lg">📱</span>
                    <span>Share via...</span>
                  </button>
                  <div className="border-t border-gray-100 my-2" />
                </>
              )}

              {/* Social Media Platforms */}
              {platforms.map((platform) => (
                <button
                  key={platform.id}
                  onClick={() => handlePlatformShare(platform.getUrl, platform.id)}
                  className={`flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors ${platform.color}`}
                >
                  <span className="text-lg">{platform.icon}</span>
                  <span>{platform.name}</span>
                </button>
              ))}

              {/* Discord (special handling - copy to clipboard) */}
              <button
                onClick={handleDiscordShare}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
              >
                <span className="text-lg">💬</span>
                <span>Discord</span>
                {copiedPlatform === 'discord' && (
                  <Check className="w-4 h-4 ml-auto text-green-600" />
                )}
              </button>

              <div className="border-t border-gray-100 my-2" />

              {/* Copy Link */}
              <button
                onClick={handleCopyLink}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-green-600">Link copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
