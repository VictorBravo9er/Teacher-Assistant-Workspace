import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { classService } from '@/services/classService';
import { templateService } from '@/services/templateService';
import { studentService } from '@/services/studentService';
import { ClassModel, Template, Student } from '@/types/main';
import { secureStorage } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

const CACHE_KEY_CLASSES = 'edu_rag_classes_cache';
const CACHE_KEY_TEMPLATES = 'edu_rag_templates_cache';
const CACHE_KEY_CLASS_STUDENTS_PREFIX = 'edu_rag_class_students_';
const TTL_MS = 5 * 60 * 1000; // 5 minutes bounded TTL

interface WorkspaceModificationsResponse {
  stale_components: string[];
  server_timestamps: Record<string, string>;
  is_wiped: boolean;
}

export function useWorkspaceData() {
  const { session } = useAuth();
  const [classes, setClasses] = useState<ClassModel[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isRevalidatingRef = useRef(false);

  const performFullFetch = useCallback(async () => {
    const [fetchedClasses, fetchedTemplates] = await Promise.all([
      classService.fetchClasses(),
      templateService.fetchTemplates(),
    ]);
    const nowIso = new Date().toISOString();
    secureStorage.setCachedItemWithTTL(CACHE_KEY_CLASSES, fetchedClasses, TTL_MS, nowIso);
    secureStorage.setCachedItemWithTTL(CACHE_KEY_TEMPLATES, fetchedTemplates, TTL_MS, nowIso);
    for (const c of fetchedClasses) {
      secureStorage.setCachedItemWithTTL(
        `${CACHE_KEY_CLASS_STUDENTS_PREFIX}${c.id}`,
        c.students || [],
        TTL_MS,
        nowIso
      );
    }
    setClasses(fetchedClasses);
    setTemplates(fetchedTemplates);
  }, []);

  const revalidateOrFetch = useCallback(async (forceRefresh = false) => {
    if (!session?.user) {
      setClasses([]);
      setTemplates([]);
      setLoading(false);
      return;
    }

    if (isRevalidatingRef.current) return;
    isRevalidatingRef.current = true;

    try {
      const classesCache = secureStorage.getCachedItemDetails<ClassModel[]>(CACHE_KEY_CLASSES);
      const templatesCache = secureStorage.getCachedItemDetails<Template[]>(CACHE_KEY_TEMPLATES);

      // If user has cached data and not forceRefresh, show cached data immediately (stale-while-revalidate)
      if (!forceRefresh && classesCache?.data && templatesCache?.data) {
        setClasses(classesCache.data);
        setTemplates(templatesCache.data);
        setLoading(false);

        // Check if any component's TTL has expired
        const anyExpired = classesCache.isExpired || templatesCache.isExpired;
        if (!anyExpired) {
          logger.info('WORKSPACE_DATA', 'Cache valid within TTL; skipping revalidation');
          return;
        }
      }

      // Collect client timestamps
      const clientTimestamps: Record<string, string> = {};
      if (classesCache?.lastModified && !forceRefresh) {
        clientTimestamps['classes_meta'] = classesCache.lastModified;
      }
      if (templatesCache?.lastModified && !forceRefresh) {
        clientTimestamps['templates'] = templatesCache.lastModified;
      }

      if (classesCache?.data && !forceRefresh) {
        for (const c of classesCache.data) {
          const studentCache = secureStorage.getCachedItemDetails<Student[]>(
            `${CACHE_KEY_CLASS_STUDENTS_PREFIX}${c.id}`
          );
          if (studentCache?.lastModified) {
            clientTimestamps[`class_students:${c.id}`] = studentCache.lastModified;
          }
        }
      }

      // Query granular modification check RPC
      const { data: modData, error: rpcError } = await supabase.rpc('check_workspace_modifications', {
        p_client_timestamps: clientTimestamps,
      });

      if (rpcError) {
        logger.warn('WORKSPACE_DATA', 'check_workspace_modifications RPC failed, fallback to full fetch', rpcError);
        await performFullFetch();
        return;
      }

      const checkResult = modData as unknown as WorkspaceModificationsResponse;
      logger.info('WORKSPACE_DATA', 'Revalidation check result:', checkResult);

      if (checkResult.is_wiped) {
        logger.info('WORKSPACE_DATA', 'Workspace wiped or empty in database; purging client cache');
        secureStorage.clearCache();
        setClasses([]);
        setTemplates([]);
        return;
      }

      const stale = new Set(checkResult.stale_components || []);
      const serverTimestamps = checkResult.server_timestamps || {};

      // If nothing is stale and we already have cached data:
      if (stale.size === 0 && classesCache?.data && templatesCache?.data && !forceRefresh) {
        logger.info('WORKSPACE_DATA', 'All cached components are up-to-date (304 unmodified). Bumping TTLs.');
        secureStorage.touchCachedItemTTL(CACHE_KEY_CLASSES, TTL_MS);
        secureStorage.touchCachedItemTTL(CACHE_KEY_TEMPLATES, TTL_MS);
        for (const c of classesCache.data) {
          secureStorage.touchCachedItemTTL(`${CACHE_KEY_CLASS_STUDENTS_PREFIX}${c.id}`, TTL_MS);
        }
        return;
      }

      let currentClasses = classesCache?.data ? [...classesCache.data] : null;
      let currentTemplates = templatesCache?.data ? [...templatesCache.data] : null;

      // 1. Templates slice
      if (!currentTemplates || stale.has('templates') || forceRefresh) {
        logger.info('WORKSPACE_DATA', 'Fetching templates (stale or missing)...');
        currentTemplates = await templateService.fetchTemplates();
        const tTimestamp = serverTimestamps['templates'] || new Date().toISOString();
        secureStorage.setCachedItemWithTTL(CACHE_KEY_TEMPLATES, currentTemplates, TTL_MS, tTimestamp);
        setTemplates(currentTemplates);
      } else {
        secureStorage.touchCachedItemTTL(CACHE_KEY_TEMPLATES, TTL_MS);
      }

      // 2. Classes slice
      if (!currentClasses || stale.has('classes_meta') || forceRefresh) {
        logger.info('WORKSPACE_DATA', 'Fetching all classes (classes_meta stale or missing)...');
        currentClasses = await classService.fetchClasses();
        const cTimestamp = serverTimestamps['classes_meta'] || new Date().toISOString();
        secureStorage.setCachedItemWithTTL(CACHE_KEY_CLASSES, currentClasses, TTL_MS, cTimestamp);

        for (const c of currentClasses) {
          const sTimestamp = serverTimestamps[`class_students:${c.id}`] || cTimestamp;
          secureStorage.setCachedItemWithTTL(
            `${CACHE_KEY_CLASS_STUDENTS_PREFIX}${c.id}`,
            c.students || [],
            TTL_MS,
            sTimestamp
          );
        }
        setClasses(currentClasses);
      } else {
        // Classes metadata is valid! Granularly update only stale rosters.
        let classesUpdated = false;

        for (const c of currentClasses) {
          const classKey = `class_students:${c.id}`;
          if (stale.has(classKey)) {
            logger.info('WORKSPACE_DATA', `Refetching student roster for class ${c.id}...`);
            const updatedStudents = await studentService.fetchStudentsForClass(c.id).catch(() => [] as Student[]);
            const sTimestamp = serverTimestamps[classKey] || new Date().toISOString();
            secureStorage.setCachedItemWithTTL(
              `${CACHE_KEY_CLASS_STUDENTS_PREFIX}${c.id}`,
              updatedStudents,
              TTL_MS,
              sTimestamp
            );
            c.students = updatedStudents;
            classesUpdated = true;
          } else {
            secureStorage.touchCachedItemTTL(`${CACHE_KEY_CLASS_STUDENTS_PREFIX}${c.id}`, TTL_MS);
          }
        }

        if (classesUpdated) {
          secureStorage.setCachedItemWithTTL(
            CACHE_KEY_CLASSES,
            currentClasses,
            TTL_MS,
            serverTimestamps['classes_meta'] || classesCache?.lastModified
          );
          setClasses([...currentClasses]);
        } else {
          secureStorage.touchCachedItemTTL(CACHE_KEY_CLASSES, TTL_MS);
        }
      }
    } catch (err: any) {
      logger.error('WORKSPACE_DATA', 'Error loading workspace data', err);
      setError(err.message || 'Failed to load workspace data.');
    } finally {
      setLoading(false);
      isRevalidatingRef.current = false;
    }
  }, [session?.user, performFullFetch]);

  useEffect(() => {
    revalidateOrFetch();

    const handleOnline = () => {
      logger.info('WORKSPACE_DATA', 'Network reconnected; revalidating workspace cache');
      revalidateOrFetch();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const classesCache = secureStorage.getCachedItemDetails<ClassModel[]>(CACHE_KEY_CLASSES);
        const templatesCache = secureStorage.getCachedItemDetails<Template[]>(CACHE_KEY_TEMPLATES);
        if (classesCache?.isExpired || templatesCache?.isExpired) {
          logger.info('WORKSPACE_DATA', 'Tab visible and cache expired; revalidating workspace cache');
          revalidateOrFetch();
        }
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session?.user, revalidateOrFetch]);

  const mutateClasses = (
    newClasses: ClassModel[] | ((prev: ClassModel[]) => ClassModel[])
  ) => {
    setClasses((prev) => {
      const resolved = typeof newClasses === 'function' ? newClasses(prev) : newClasses;
      const nowIso = new Date().toISOString();
      secureStorage.setCachedItemWithTTL(CACHE_KEY_CLASSES, resolved, TTL_MS, nowIso);
      for (const c of resolved) {
        secureStorage.setCachedItemWithTTL(
          `${CACHE_KEY_CLASS_STUDENTS_PREFIX}${c.id}`,
          c.students || [],
          TTL_MS,
          nowIso
        );
      }
      return resolved;
    });
  };

  const mutateTemplates = (
    newTemplates: Template[] | ((prev: Template[]) => Template[])
  ) => {
    setTemplates((prev) => {
      const resolved = typeof newTemplates === 'function' ? newTemplates(prev) : newTemplates;
      const nowIso = new Date().toISOString();
      secureStorage.setCachedItemWithTTL(CACHE_KEY_TEMPLATES, resolved, TTL_MS, nowIso);
      return resolved;
    });
  };

  return {
    classes,
    templates,
    loading,
    error,
    mutateClasses,
    mutateTemplates,
    refresh: () => revalidateOrFetch(true),
  };
}
