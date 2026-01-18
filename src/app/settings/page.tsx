'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers';
import { Button, Input, Card, PasswordStrengthIndicator } from '@/components/ui';
import Link from 'next/link';

interface ProfileData {
  displayName: string;
  bio: string;
  avatarUrl: string;
  locationCity: string;
  timezone: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const hasPassword = user?.hasPassword !== false;
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  
  const [formData, setFormData] = useState<ProfileData>({
    displayName: '',
    bio: '',
    avatarUrl: '',
    locationCity: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/settings');
      return;
    }

    if (user?.id) {
      fetchProfile();
    }
  }, [user, isAuthenticated, authLoading, router]);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/users/${user!.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setFormData({
          displayName: data.data.displayName || '',
          bio: data.data.bio || '',
          avatarUrl: data.data.avatarUrl || '',
          locationCity: data.data.location || '',
          timezone: data.data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`/api/users/${user!.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          displayName: formData.displayName || undefined,
          bio: formData.bio || undefined,
          avatarUrl: formData.avatarUrl || null,
          locationCity: formData.locationCity || null,
          timezone: formData.timezone || undefined,
        }),
      });

      if (response.ok) {
        setSuccess('Profile updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await response.json();
        setError(data.error?.message || 'Failed to update profile');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = (field: keyof ProfileData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updatePasswordField = (field: keyof typeof passwordData, value: string) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (hasPassword && !passwordData.currentPassword) {
      setPasswordError('Please provide your current password.');
      return;
    }

    if (!passwordData.newPassword) {
      setPasswordError('Please provide a new password.');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setIsPasswordSaving(true);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch('/api/users/me/password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (response.ok) {
        setPasswordSuccess('Password updated successfully.');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => setPasswordSuccess(''), 3000);
      } else {
        const data = await response.json();
        setPasswordError(data.error?.message || 'Failed to update password');
      }
    } catch {
      setPasswordError('Something went wrong. Please try again.');
    } finally {
      setIsPasswordSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Settings</h1>
          <p className="mt-2 text-gray-600">
            Manage your profile and preferences
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {success}
          </div>
        )}

        <Card padding="lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Profile Information</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <p className="text-gray-900 bg-gray-100 rounded-lg px-3 py-2">
                {user?.email}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Email cannot be changed
              </p>
            </div>

            <Input
              label="Display Name"
              value={formData.displayName}
              onChange={(e) => updateField('displayName', e.target.value)}
              placeholder="How you want to be known"
              maxLength={100}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bio
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => updateField('bio', e.target.value)}
                placeholder="Tell people a bit about yourself..."
                maxLength={500}
                rows={3}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="mt-1 text-sm text-gray-500 text-right">
                {formData.bio.length}/500
              </p>
            </div>

            <Input
              label="Avatar URL"
              value={formData.avatarUrl}
              onChange={(e) => updateField('avatarUrl', e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              type="url"
            />

            <Input
              label="City"
              value={formData.locationCity}
              onChange={(e) => updateField('locationCity', e.target.value)}
              placeholder="Where are you based?"
              maxLength={100}
            />

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/')}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isSaving}>
                Save Changes
              </Button>
            </div>
          </form>
        </Card>

        <Card padding="lg" className="mt-6">
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">
              {hasPassword ? 'Change Password' : 'Set Password'}
            </h2>

            {!hasPassword && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
                Your account doesn’t have a password yet. Set one to enable password sign-in.
              </div>
            )}

            {passwordError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
                {passwordSuccess}
              </div>
            )}

            {hasPassword && (
              <Input
                label="Current Password"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => updatePasswordField('currentPassword', e.target.value)}
                placeholder="Enter your current password"
              />
            )}

            <div>
              <Input
                label="New Password"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => updatePasswordField('newPassword', e.target.value)}
                placeholder="Choose a strong password"
              />
              <PasswordStrengthIndicator password={passwordData.newPassword} />
            </div>

            <Input
              label="Confirm New Password"
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => updatePasswordField('confirmPassword', e.target.value)}
              placeholder="Re-enter new password"
            />

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="submit" isLoading={isPasswordSaving}>
                {hasPassword ? 'Update Password' : 'Set Password'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
