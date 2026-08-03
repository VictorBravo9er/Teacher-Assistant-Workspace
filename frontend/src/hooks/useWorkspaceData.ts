import { useState, useEffect } from 'react';
import { classService } from '../services/classService';
import { templateService } from '../services/templateService';
import { ClassModel, Template } from '../types/main';
import { secureStorage } from '../lib/storage';
import { useAuth } from '../contexts/AuthContext';

const CACHE_KEY_CLASSES = 'edu_rag_classes_cache';
const CACHE_KEY_TEMPLATES = 'edu_rag_templates_cache';

export function useWorkspaceData() {
  const { session } = useAuth();
  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFromCache = <T>(key: string): T | null => {
    return secureStorage.getCachedItemWithTTL<T>(key);
  };

  const saveToCache = <T>(key: string, data: T) => {
    secureStorage.setCachedItemWithTTL(key, data);
  };


  const loadData = async (forceRefresh = false) => {
    if (!session?.user) {
      setClasses([]);
      setTemplates([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let loadedClasses = !forceRefresh ? fetchFromCache<ClassModel[]>(CACHE_KEY_CLASSES) : null;
      let loadedTemplates = !forceRefresh ? fetchFromCache<Template[]>(CACHE_KEY_TEMPLATES) : null;

      if (!loadedClasses) {
        loadedClasses = await classService.fetchClasses();
        saveToCache(CACHE_KEY_CLASSES, loadedClasses);
      }
      
      if (!loadedTemplates) {
        loadedTemplates = await templateService.fetchTemplates();
        saveToCache(CACHE_KEY_TEMPLATES, loadedTemplates);
      }

      setClasses(loadedClasses);
      setTemplates(loadedTemplates);
    } catch (err: any) {
      console.error("Error loading workspace data:", err);
      setError(err.message || "Failed to load workspace data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user]);

  // Expose a method to manually mutate cache when user edits data
  const mutateClasses = (newClasses: ClassModel[]) => {
    setClasses(newClasses);
    saveToCache(CACHE_KEY_CLASSES, newClasses);
  };

  const mutateTemplates = (newTemplates: Template[]) => {
    setTemplates(newTemplates);
    saveToCache(CACHE_KEY_TEMPLATES, newTemplates);
  };

  return { 
    classes, 
    templates, 
    loading, 
    error, 
    mutateClasses, 
    mutateTemplates,
    refresh: () => loadData(true)
  };
}
