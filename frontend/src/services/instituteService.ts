import { supabase } from '@/lib/supabase';
import { secureStorage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { sanitizeLocationInput } from '@/data/geography';

export interface InstituteSummary {
  id: string;
  name: string;
  type: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
}

const CACHE_KEY_INSTITUTES = 'edu_institutes_directory';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL

export const instituteService = {
  /**
   * Fetches all registered institutes with client-side TTL caching.
   */
  async fetchInstitutes(forceRefresh = false): Promise<InstituteSummary[]> {
    return logger.measure('CLASS_SERVICE', 'fetchInstitutes', async () => {
      if (!forceRefresh) {
        const cached = secureStorage.getCachedItemWithTTL<InstituteSummary[]>(CACHE_KEY_INSTITUTES);
        if (cached && Array.isArray(cached)) {
          logger.debug('CLASS_SERVICE', `Using cached institutes directory (${cached.length} entries)`);
          return cached;
        }
      }

      logger.info('CLASS_SERVICE', 'Fetching fresh institutes directory from database');
      const { data, error } = await supabase
        .from('institutes')
        .select('id, name, type, district, city, state, country')
        .order('name', { ascending: true });

      if (error) {
        logger.error('CLASS_SERVICE', 'Failed to fetch institutes from database', error);
        throw error;
      }

      const institutes: InstituteSummary[] = data || [];
      secureStorage.setCachedItemWithTTL(CACHE_KEY_INSTITUTES, institutes, CACHE_TTL_MS);
      logger.info('CLASS_SERVICE', `Cached ${institutes.length} institutes in local storage`);
      return institutes;
    });
  },

  /**
   * Creates a new institute, persists to Supabase, and updates local cache instantly.
   */
  async createInstitute(payload: Partial<InstituteSummary>): Promise<InstituteSummary> {
    return logger.measure('CLASS_SERVICE', 'createInstitute', async () => {
      const trimmedName = payload.name?.trim();
      if (!trimmedName) {
        throw new Error('Institute name is required.');
      }

      const insertPayload = {
        name: trimmedName,
        type: payload.type || null,
        district: payload.district ? sanitizeLocationInput(payload.district) : null,
        city: payload.city ? sanitizeLocationInput(payload.city) : null,
        state: payload.state ? sanitizeLocationInput(payload.state) : null,
        country: payload.country ? sanitizeLocationInput(payload.country) : null,
      };

      logger.info('CLASS_SERVICE', 'Registering new institute', insertPayload);
      const { data, error } = await supabase
        .from('institutes')
        .insert(insertPayload)
        .select('id, name, type, district, city, state, country')
        .single();

      if (error) {
        logger.error('CLASS_SERVICE', 'Failed to register institute', error);
        throw error;
      }

      // Update client cache with the newly created institute prepended
      try {
        const existing = secureStorage.getCachedItemWithTTL<InstituteSummary[]>(CACHE_KEY_INSTITUTES) || [];
        const updated = [data, ...existing.filter((item) => item.id !== data.id)];
        secureStorage.setCachedItemWithTTL(CACHE_KEY_INSTITUTES, updated, CACHE_TTL_MS);
        logger.debug('CLASS_SERVICE', 'Updated local institutes cache with newly created institute');
      } catch (cacheErr) {
        logger.warn('CLASS_SERVICE', 'Failed to update local cache after institute creation', cacheErr);
      }

      return data;
    });
  },
};
