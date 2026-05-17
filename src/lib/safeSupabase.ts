import { supabase } from "@/integrations/supabase/client";
import { ApiError } from "@/types/api";
import logger from "@/lib/logger";
import { normalizeSupabaseError } from "@/lib/normalizeSupabaseError";

export type SafeResult<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: ApiError };

export async function safeSelect<T>(
  queryBuilder: ReturnType<typeof supabase.from>,
  options?: { fallback?: T; context?: string }
): Promise<SafeResult<T[]>> {
  try {
    const { data, error } = await queryBuilder;
    if (error) {
      const normalized = normalizeSupabaseError(error, options?.context);
      logger.supabase.warn("safeSelect", normalized.message, { code: error.code, context: options?.context });
      return { success: false, data: null, error: normalized };
    }
    return { success: true, data: (data ?? []) as T[], error: null };
  } catch (err) {
    const normalized = normalizeSupabaseError(err, options?.context);
    logger.supabase.error("safeSelect", normalized.message, { context: options?.context });
    return { success: false, data: null, error: normalized };
  }
}

export async function safeSelectSingle<T>(
  queryBuilder: ReturnType<typeof supabase.from>,
  options?: { context?: string }
): Promise<SafeResult<T>> {
  try {
    const { data, error } = await queryBuilder;
    if (error) {
      const normalized = normalizeSupabaseError(error, options?.context);
      logger.supabase.warn("safeSelectSingle", normalized.message, { code: error.code, context: options?.context });
      return { success: false, data: null, error: normalized };
    }
    return { success: true, data: data as T, error: null };
  } catch (err) {
    const normalized = normalizeSupabaseError(err, options?.context);
    logger.supabase.error("safeSelectSingle", normalized.message, { context: options?.context });
    return { success: false, data: null, error: normalized };
  }
}

export async function safeInsert<T>(
  queryBuilder: ReturnType<typeof supabase.from>,
  options?: { context?: string }
): Promise<SafeResult<T>> {
  try {
    const { data, error } = await queryBuilder;
    if (error) {
      const normalized = normalizeSupabaseError(error, options?.context);
      logger.supabase.warn("safeInsert", normalized.message, { code: error.code, context: options?.context });
      return { success: false, data: null, error: normalized };
    }
    if (!data) {
      return { success: false, data: null, error: new ApiError("Insert returned no data", 500, "DB_INSERT_EMPTY") };
    }
    return { success: true, data: data as T, error: null };
  } catch (err) {
    const normalized = normalizeSupabaseError(err, options?.context);
    logger.supabase.error("safeInsert", normalized.message, { context: options?.context });
    return { success: false, data: null, error: normalized };
  }
}

export async function safeUpdate<T>(
  queryBuilder: ReturnType<typeof supabase.from>,
  options?: { context?: string }
): Promise<SafeResult<T>> {
  try {
    const { data, error } = await queryBuilder;
    if (error) {
      const normalized = normalizeSupabaseError(error, options?.context);
      logger.supabase.warn("safeUpdate", normalized.message, { code: error.code, context: options?.context });
      return { success: false, data: null, error: normalized };
    }
    if (!data) {
      return { success: false, data: null, error: new ApiError("Update returned no data", 500, "DB_UPDATE_EMPTY") };
    }
    return { success: true, data: data as T, error: null };
  } catch (err) {
    const normalized = normalizeSupabaseError(err, options?.context);
    logger.supabase.error("safeUpdate", normalized.message, { context: options?.context });
    return { success: false, data: null, error: normalized };
  }
}
