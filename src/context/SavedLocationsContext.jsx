import { createContext, useContext, useEffect, useState } from 'react';

// Basic localStorage-backed "saved locations" list. This is a placeholder —
// swap this out for a real API call once there's a backend endpoint for it
// (e.g. POST /api/saved-locations). The shape (array of site ids) should stay
// the same so the rest of the UI doesn't need to change.

const SavedLocationsContext = createContext(null);

export function SavedLocationsProvider({ children }) {
  const [savedIds, setSavedIds] = useState(() => {
    try {
      const raw = localStorage.getItem('teramatch-saved');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('teramatch-saved', JSON.stringify(savedIds));
  }, [savedIds]);

  const isSaved = (id) => savedIds.includes(id);

  const toggleSaved = (id) => {
    setSavedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <SavedLocationsContext.Provider value={{ savedIds, isSaved, toggleSaved }}>
      {children}
    </SavedLocationsContext.Provider>
  );
}

export function useSavedLocations() {
  const ctx = useContext(SavedLocationsContext);
  if (!ctx) throw new Error('useSavedLocations must be used inside <SavedLocationsProvider>');
  return ctx;
}
