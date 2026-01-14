import { useState, useCallback, useEffect, createContext, useContext, ReactNode } from 'react';

export interface Tag {
  id: string;
  name: string;
  color?: string;
}

const STORAGE_KEY = 'sandoro-tags';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function getStoredTags(): Tag[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate that it's an array
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse stored tags:', e);
    // Clear corrupted data
    localStorage.removeItem(STORAGE_KEY);
  }
  return [];
}

interface TagsContextType {
  tags: Tag[];
  addTag: (name: string, color?: string) => Tag;
  removeTag: (id: string) => void;
  updateTag: (id: string, updates: Partial<Omit<Tag, 'id'>>) => void;
  getTagById: (id: string) => Tag | undefined;
  getTagByName: (name: string) => Tag | undefined;
}

const TagsContext = createContext<TagsContextType | null>(null);

export function TagsProvider({ children }: { children: ReactNode }) {
  const [tags, setTags] = useState<Tag[]>(getStoredTags);

  // Sync with localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tags));
  }, [tags]);

  // Listen for storage changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setTags(JSON.parse(e.newValue));
        } catch {
          // Ignore parse errors
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const addTag = useCallback((name: string, color?: string): Tag => {
    const newTag: Tag = {
      id: generateId(),
      name,
      color,
    };
    setTags((current) => [...current, newTag]);
    return newTag;
  }, []);

  const removeTag = useCallback((id: string) => {
    setTags((current) => current.filter((tag) => tag.id !== id));
  }, []);

  const updateTag = useCallback((id: string, updates: Partial<Omit<Tag, 'id'>>) => {
    setTags((current) =>
      current.map((tag) =>
        tag.id === id ? { ...tag, ...updates } : tag
      )
    );
  }, []);

  const getTagById = useCallback(
    (id: string): Tag | undefined => {
      return tags.find((tag) => tag.id === id);
    },
    [tags]
  );

  const getTagByName = useCallback(
    (name: string): Tag | undefined => {
      return tags.find((tag) => tag.name.toLowerCase() === name.toLowerCase());
    },
    [tags]
  );

  return (
    <TagsContext.Provider
      value={{
        tags,
        addTag,
        removeTag,
        updateTag,
        getTagById,
        getTagByName,
      }}
    >
      {children}
    </TagsContext.Provider>
  );
}

export function useTags(): TagsContextType {
  const context = useContext(TagsContext);
  if (!context) {
    throw new Error('useTags must be used within a TagsProvider');
  }
  return context;
}
