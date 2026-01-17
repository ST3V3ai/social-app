'use client';

import { useState } from 'react';
import { Button, Input, Textarea, TimezoneSelect } from '@/components/ui';

interface EventFormData {
  title: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  timezone: string;
  isOnline: boolean;
  locationString: string;
  onlineUrl: string;
  privacy: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
  category: string;
  capacity: number | null;
  enableWaitlist: boolean;
  allowPlusOnes: boolean;
  maxPlusOnes: number;
  coverImageUrl: string;
}

interface EventFormProps {
  initialData?: Partial<EventFormData>;
  onSubmit: (data: EventFormData) => Promise<void>;
  submitLabel?: string;
  isLoading?: boolean;
}

// Categories must match API validation (lowercase with hyphens)
const CATEGORIES = [
  { value: 'community', label: 'Community' },
  { value: 'music', label: 'Music' },
  { value: 'arts', label: 'Arts' },
  { value: 'sports', label: 'Sports' },
  { value: 'food-drink', label: 'Food & Drink' },
  { value: 'networking', label: 'Networking' },
  { value: 'classes', label: 'Classes & Workshops' },
  { value: 'outdoors', label: 'Outdoors' },
  { value: 'games', label: 'Games' },
  { value: 'other', label: 'Other' },
];

export function EventForm({
  initialData,
  onSubmit,
  submitLabel = 'Create Event',
  isLoading = false,
}: EventFormProps) {
  const [formData, setFormData] = useState<EventFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    startDate: initialData?.startDate || '',
    startTime: initialData?.startTime || '',
    endDate: initialData?.endDate || '',
    endTime: initialData?.endTime || '',
    timezone: initialData?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    isOnline: initialData?.isOnline ?? false,
    locationString: initialData?.locationString || '',
    onlineUrl: initialData?.onlineUrl || '',
    privacy: initialData?.privacy || 'PUBLIC',
    category: initialData?.category || '',
    capacity: initialData?.capacity ?? null,
    enableWaitlist: initialData?.enableWaitlist ?? true,
    allowPlusOnes: initialData?.allowPlusOnes ?? true,
    maxPlusOnes: initialData?.maxPlusOnes ?? 1,
    coverImageUrl: initialData?.coverImageUrl || '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof EventFormData, string>>>({});

  const updateField = <K extends keyof EventFormData>(field: K, value: EventFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof EventFormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }
    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }
    if (!formData.isOnline && !formData.locationString.trim()) {
      newErrors.locationString = 'Location is required for in-person events';
    }
    if (formData.isOnline && !formData.onlineUrl.trim()) {
      newErrors.onlineUrl = 'Online URL is required for virtual events';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      await onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Cover Image */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Cover Image URL
        </label>
        <Input
          value={formData.coverImageUrl}
          onChange={(e) => updateField('coverImageUrl', e.target.value)}
          placeholder="https://example.com/image.jpg"
          helperText="Enter a URL for your event cover image"
        />
        {formData.coverImageUrl && (
          <div className="mt-2 rounded-lg overflow-hidden aspect-[16/9] bg-gray-100">
            <img
              src={formData.coverImageUrl}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
      </div>

      {/* Title */}
      <Input
        label="Event Title *"
        value={formData.title}
        onChange={(e) => updateField('title', e.target.value)}
        error={errors.title}
        placeholder="What's your event called?"
        maxLength={200}
      />

      {/* Description */}
      <Textarea
        label="Description"
        value={formData.description}
        onChange={(e) => updateField('description', e.target.value)}
        placeholder="Tell people about your event..."
        rows={4}
        maxLength={5000}
      />

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Category
        </label>
        <select
          value={formData.category}
          onChange={(e) => updateField('category', e.target.value)}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">Select a category</option>
          {CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>{cat.label}</option>
          ))}
        </select>
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date *
          </label>
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) => updateField('startDate', e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.startDate && (
            <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Time *
          </label>
          <input
            type="time"
            value={formData.startTime}
            onChange={(e) => updateField('startTime', e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.startTime && (
            <p className="mt-1 text-sm text-red-600">{errors.startTime}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={formData.endDate}
            onChange={(e) => updateField('endDate', e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Time
          </label>
          <input
            type="time"
            value={formData.endTime}
            onChange={(e) => updateField('endTime', e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Timezone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Timezone
        </label>
        <TimezoneSelect
          value={formData.timezone}
          onChange={(value) => updateField('timezone', value)}
        />
      </div>

      {/* Location */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={!formData.isOnline}
              onChange={() => updateField('isOnline', false)}
              className="w-4 h-4 text-indigo-600"
            />
            <span className="text-sm text-gray-700">In-Person</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              checked={formData.isOnline}
              onChange={() => updateField('isOnline', true)}
              className="w-4 h-4 text-indigo-600"
            />
            <span className="text-sm text-gray-700">Online</span>
          </label>
        </div>

        {formData.isOnline ? (
          <Input
            label="Online Event URL *"
            value={formData.onlineUrl}
            onChange={(e) => updateField('onlineUrl', e.target.value)}
            error={errors.onlineUrl}
            placeholder="https://zoom.us/j/..."
            type="url"
          />
        ) : (
          <Input
            label="Location *"
            value={formData.locationString}
            onChange={(e) => updateField('locationString', e.target.value)}
            error={errors.locationString}
            placeholder="Enter the venue or address"
          />
        )}
      </div>

      {/* Privacy */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Privacy
        </label>
        <div className="space-y-2">
          {(['PUBLIC', 'UNLISTED', 'PRIVATE'] as const).map((option) => (
            <label key={option} className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                checked={formData.privacy === option}
                onChange={() => updateField('privacy', option)}
                className="w-4 h-4 mt-0.5 text-indigo-600"
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  {option === 'PUBLIC' ? 'Public' : option === 'UNLISTED' ? 'Unlisted' : 'Private'}
                </span>
                <p className="text-xs text-gray-500">
                  {option === 'PUBLIC' && 'Anyone can find and join this event'}
                  {option === 'UNLISTED' && 'Only people with the link can see this event'}
                  {option === 'PRIVATE' && 'Only invited guests can see this event'}
                </p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Capacity & Options */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.capacity !== null}
              onChange={(e) => updateField('capacity', e.target.checked ? 50 : null)}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <span className="text-sm text-gray-700">Set capacity limit</span>
          </label>
        </div>

        {formData.capacity !== null && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Maximum Capacity"
              type="number"
              min={1}
              value={formData.capacity?.toString() || ''}
              onChange={(e) => updateField('capacity', parseInt(e.target.value) || null)}
            />
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={formData.enableWaitlist}
                  onChange={(e) => updateField('enableWaitlist', e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <span className="text-sm text-gray-700">Enable waitlist</span>
              </label>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.allowPlusOnes}
              onChange={(e) => updateField('allowPlusOnes', e.target.checked)}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <span className="text-sm font-medium text-gray-900">Allow plus-ones</span>
          </label>
          {formData.allowPlusOnes && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">Max:</span>
              <input
                type="number"
                min={1}
                max={10}
                value={formData.maxPlusOnes}
                onChange={(e) => updateField('maxPlusOnes', parseInt(e.target.value) || 1)}
                className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="submit" isLoading={isLoading} size="lg">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
