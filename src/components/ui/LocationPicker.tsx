'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from './Input';

interface Location {
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
}

interface LocationPickerProps {
  value?: string;
  location?: Location | null;
  onChange: (locationString: string, location?: Location) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

// Google Maps types (minimal declarations to avoid needing @types/google.maps)
interface GooglePlace {
  name?: string;
  formatted_address?: string;
  place_id?: string;
  geometry?: {
    location: {
      lat: () => number;
      lng: () => number;
    };
  };
}

interface GoogleAutocomplete {
  addListener: (event: string, callback: () => void) => void;
  getPlace: () => GooglePlace | undefined;
}

declare global {
  interface Window {
    google?: {
      maps: {
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            options?: { types?: string[]; fields?: string[] }
          ) => GoogleAutocomplete;
        };
      };
    };
    initGoogleMapsCallback?: () => void;
  }
}

// Check if Google Maps API key is available
const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export function LocationPicker({
  value = '',
  location,
  onChange,
  placeholder = 'Search for a location...',
  disabled = false,
  error,
}: LocationPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<GoogleAutocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [inputValue, setInputValue] = useState(value);

  // Load Google Maps script
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      // No API key - fall back to simple text input
      return;
    }

    if (window.google?.maps?.places) {
      setIsLoaded(true);
      return;
    }

    // Check if script is already loading
    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      window.initGoogleMapsCallback = () => setIsLoaded(true);
      return;
    }

    // Load the script
    window.initGoogleMapsCallback = () => setIsLoaded(true);
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=initGoogleMapsCallback`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      window.initGoogleMapsCallback = undefined;
    };
  }, []);

  // Initialize autocomplete
  const initAutocomplete = useCallback(() => {
    if (!inputRef.current || !window.google?.maps?.places || autocompleteRef.current) {
      return;
    }

    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['establishment', 'geocode'],
      fields: ['name', 'formatted_address', 'geometry', 'place_id'],
    });

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      if (place?.geometry?.location) {
        const newLocation: Location = {
          name: place.name || '',
          address: place.formatted_address || '',
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          placeId: place.place_id,
        };
        const displayValue = place.name || place.formatted_address || '';
        setInputValue(displayValue);
        onChange(displayValue, newLocation);
      }
    });
  }, [onChange]);

  useEffect(() => {
    if (isLoaded) {
      initAutocomplete();
    }
  }, [isLoaded, initAutocomplete]);

  // Update input value when prop changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    // Only call onChange for the text value - full location comes from autocomplete
    onChange(newValue);
  };

  // Fallback to simple text input if no API key
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div>
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          error={error}
        />
        <p className="mt-1 text-xs text-gray-500">
          Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable location search
        </p>
      </div>
    );
  }

  return (
    <div>
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={isLoaded ? placeholder : 'Loading...'}
        disabled={disabled || !isLoaded}
        error={error}
      />
      {location && (
        <div className="mt-1 text-xs text-gray-500">
          📍 {location.address}
        </div>
      )}
    </div>
  );
}
