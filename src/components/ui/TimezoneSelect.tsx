'use client';

import { useState, useMemo, useRef, useEffect } from 'react';

// Comprehensive timezone list with friendly names
const TIMEZONE_DATA = [
  // Americas
  { value: 'America/New_York', label: 'Eastern Time', region: 'Americas' },
  { value: 'America/Chicago', label: 'Central Time', region: 'Americas' },
  { value: 'America/Denver', label: 'Mountain Time', region: 'Americas' },
  { value: 'America/Los_Angeles', label: 'Pacific Time', region: 'Americas' },
  { value: 'America/Phoenix', label: 'Arizona', region: 'Americas' },
  { value: 'America/Anchorage', label: 'Alaska', region: 'Americas' },
  { value: 'Pacific/Honolulu', label: 'Hawaii', region: 'Americas' },
  { value: 'America/Toronto', label: 'Toronto', region: 'Americas' },
  { value: 'America/Vancouver', label: 'Vancouver', region: 'Americas' },
  { value: 'America/Mexico_City', label: 'Mexico City', region: 'Americas' },
  { value: 'America/Sao_Paulo', label: 'São Paulo', region: 'Americas' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires', region: 'Americas' },
  { value: 'America/Lima', label: 'Lima', region: 'Americas' },
  { value: 'America/Bogota', label: 'Bogotá', region: 'Americas' },
  // Europe
  { value: 'Europe/London', label: 'London', region: 'Europe' },
  { value: 'Europe/Paris', label: 'Paris', region: 'Europe' },
  { value: 'Europe/Berlin', label: 'Berlin', region: 'Europe' },
  { value: 'Europe/Madrid', label: 'Madrid', region: 'Europe' },
  { value: 'Europe/Rome', label: 'Rome', region: 'Europe' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam', region: 'Europe' },
  { value: 'Europe/Zurich', label: 'Zurich', region: 'Europe' },
  { value: 'Europe/Stockholm', label: 'Stockholm', region: 'Europe' },
  { value: 'Europe/Dublin', label: 'Dublin', region: 'Europe' },
  { value: 'Europe/Lisbon', label: 'Lisbon', region: 'Europe' },
  { value: 'Europe/Warsaw', label: 'Warsaw', region: 'Europe' },
  { value: 'Europe/Athens', label: 'Athens', region: 'Europe' },
  { value: 'Europe/Moscow', label: 'Moscow', region: 'Europe' },
  { value: 'Europe/Istanbul', label: 'Istanbul', region: 'Europe' },
  // Asia
  { value: 'Asia/Tokyo', label: 'Tokyo', region: 'Asia' },
  { value: 'Asia/Shanghai', label: 'Shanghai / Beijing', region: 'Asia' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong', region: 'Asia' },
  { value: 'Asia/Singapore', label: 'Singapore', region: 'Asia' },
  { value: 'Asia/Seoul', label: 'Seoul', region: 'Asia' },
  { value: 'Asia/Taipei', label: 'Taipei', region: 'Asia' },
  { value: 'Asia/Bangkok', label: 'Bangkok', region: 'Asia' },
  { value: 'Asia/Jakarta', label: 'Jakarta', region: 'Asia' },
  { value: 'Asia/Manila', label: 'Manila', region: 'Asia' },
  { value: 'Asia/Kolkata', label: 'India (IST)', region: 'Asia' },
  { value: 'Asia/Dubai', label: 'Dubai', region: 'Asia' },
  { value: 'Asia/Tel_Aviv', label: 'Tel Aviv', region: 'Asia' },
  // Australia & Pacific
  { value: 'Australia/Sydney', label: 'Sydney', region: 'Pacific' },
  { value: 'Australia/Melbourne', label: 'Melbourne', region: 'Pacific' },
  { value: 'Australia/Brisbane', label: 'Brisbane', region: 'Pacific' },
  { value: 'Australia/Perth', label: 'Perth', region: 'Pacific' },
  { value: 'Pacific/Auckland', label: 'Auckland', region: 'Pacific' },
  { value: 'Pacific/Fiji', label: 'Fiji', region: 'Pacific' },
  // Africa
  { value: 'Africa/Johannesburg', label: 'Johannesburg', region: 'Africa' },
  { value: 'Africa/Cairo', label: 'Cairo', region: 'Africa' },
  { value: 'Africa/Lagos', label: 'Lagos', region: 'Africa' },
  { value: 'Africa/Nairobi', label: 'Nairobi', region: 'Africa' },
];

function getTimezoneOffset(timezone: string): string {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(now);
    const offsetPart = parts.find(p => p.type === 'timeZoneName');
    if (offsetPart) {
      return offsetPart.value.replace('GMT', 'GMT ').replace('+', '+').trim();
    }
    return '';
  } catch {
    return '';
  }
}

interface TimezoneSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function TimezoneSelect({ value, onChange, className = '' }: TimezoneSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute offsets and filter
  const timezoneOptions = useMemo(() => {
    return TIMEZONE_DATA.map(tz => ({
      ...tz,
      offset: getTimezoneOffset(tz.value),
    }));
  }, []);

  const filteredOptions = useMemo(() => {
    if (!search) return timezoneOptions;
    const searchLower = search.toLowerCase();
    return timezoneOptions.filter(tz =>
      tz.label.toLowerCase().includes(searchLower) ||
      tz.value.toLowerCase().includes(searchLower) ||
      tz.region.toLowerCase().includes(searchLower) ||
      tz.offset.toLowerCase().includes(searchLower)
    );
  }, [search, timezoneOptions]);

  // Group by region
  const groupedOptions = useMemo(() => {
    const groups: Record<string, typeof filteredOptions> = {};
    filteredOptions.forEach(tz => {
      if (!groups[tz.region]) groups[tz.region] = [];
      groups[tz.region].push(tz);
    });
    return groups;
  }, [filteredOptions]);

  const selectedTz = timezoneOptions.find(tz => tz.value === value);
  const displayValue = selectedTz
    ? `${selectedTz.label} (${selectedTz.offset})`
    : value;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            setTimeout(() => inputRef.current?.focus(), 10);
          }
        }}
        className="w-full flex items-center justify-between rounded-lg border border-gray-300 px-3 py-2 text-left text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      >
        <span>{displayValue}</span>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-hidden">
          <div className="p-2 border-b">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search timezones..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="overflow-y-auto max-h-60">
            {Object.keys(groupedOptions).length === 0 ? (
              <div className="px-3 py-4 text-center text-gray-500 text-sm">
                No timezones found
              </div>
            ) : (
              Object.entries(groupedOptions).map(([region, tzList]) => (
                <div key={region}>
                  <div className="px-3 py-1.5 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-0">
                    {region}
                  </div>
                  {tzList.map(tz => (
                    <button
                      key={tz.value}
                      type="button"
                      onClick={() => {
                        onChange(tz.value);
                        setIsOpen(false);
                        setSearch('');
                      }}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-indigo-50 flex justify-between items-center ${
                        value === tz.value ? 'bg-indigo-50 text-indigo-700' : 'text-gray-900'
                      }`}
                    >
                      <span>{tz.label}</span>
                      <span className="text-gray-500 text-xs font-mono">{tz.offset}</span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
