import { supabase } from './supabase';

/**
 * Utility to validate localStorage data against database state
 * Ensures localStorage doesn't contain stale data after database resets
 */

export interface ValidationResult<T> {
  isValid: boolean;
  localData: T | null;
  databaseData: T | null;
  shouldUseLocal: boolean;
  shouldUseDatabase: boolean;
}

export interface QuizAttemptData {
  score_percentage: number;
  passed: boolean;
  completed_at: string;
  quiz_slug: string;
}

export interface ChallengeCompletionData {
  completed: boolean;
  completed_at: string;
}

/**
 * Validates quiz attempt data from localStorage against database
 */
export async function validateQuizAttempt(quizSlug: string, localData: any): Promise<ValidationResult<QuizAttemptData>> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        isValid: false,
        localData: null,
        databaseData: null,
        shouldUseLocal: false,
        shouldUseDatabase: false
      };
    }

    // Fetch latest database attempt
    const { data: dbAttempts, error } = await supabase
      .from('user_quiz_attempts')
      .select('*')
      .eq('user_id', user.id)
      .eq('quiz_slug', quizSlug)
      .order('completed_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching quiz attempts from database:', error);
      // If database is unavailable, trust localStorage but mark as potentially stale
      return {
        isValid: true,
        localData: localData,
        databaseData: null,
        shouldUseLocal: true,
        shouldUseDatabase: false
      };
    }

    const databaseData = dbAttempts && dbAttempts.length > 0 ? dbAttempts[0] : null;

    // If no database data, localStorage might be valid (user hasn't taken quiz yet)
    if (!databaseData) {
      return {
        isValid: true,
        localData: localData,
        databaseData: null,
        shouldUseLocal: true,
        shouldUseDatabase: false
      };
    }

    // Compare timestamps - if database is newer, use database data
    const localTimestamp = localData?.completed_at ? new Date(localData.completed_at).getTime() : 0;
    const dbTimestamp = new Date(databaseData.completed_at).getTime();

    if (dbTimestamp > localTimestamp) {
      // Database has newer data
      return {
        isValid: true,
        localData: localData,
        databaseData: databaseData,
        shouldUseLocal: false,
        shouldUseDatabase: true
      };
    } else if (localTimestamp > dbTimestamp) {
      // localStorage has newer data - this shouldn't happen, but handle it
      console.warn('localStorage has newer quiz data than database - possible sync issue');
      return {
        isValid: false,
        localData: localData,
        databaseData: databaseData,
        shouldUseLocal: false,
        shouldUseDatabase: true
      };
    } else {
      // Timestamps match - data is in sync
      return {
        isValid: true,
        localData: localData,
        databaseData: databaseData,
        shouldUseLocal: true,
        shouldUseDatabase: true
      };
    }

  } catch (error) {
    console.error('Error validating quiz attempt:', error);
    // On error, default to localStorage but mark as potentially stale
    return {
      isValid: true,
      localData: localData,
      databaseData: null,
      shouldUseLocal: true,
      shouldUseDatabase: false
    };
  }
}

/**
 * Validates challenge completion data from localStorage against database
 */
export async function validateChallengeCompletion(challengeSlug: string, userId: string, localData: any): Promise<ValidationResult<ChallengeCompletionData>> {
  try {
    // For challenges, we don't have a specific database table yet
    // This would need to be implemented based on your challenge completion schema
    // For now, we'll assume localStorage is the source of truth for challenges

    return {
      isValid: true,
      localData: localData,
      databaseData: null,
      shouldUseLocal: true,
      shouldUseDatabase: false
    };

  } catch (error) {
    console.error('Error validating challenge completion:', error);
    return {
      isValid: true,
      localData: localData,
      databaseData: null,
      shouldUseLocal: true,
      shouldUseDatabase: false
    };
  }
}

/**
 * Validates viewed/completed item counts from localStorage against database
 */
export async function validateProgressCounts(courseSlug: string, userId: string, localViewedCount: number, localCompletedCount: number): Promise<ValidationResult<{ viewed: number; completed: number }>> {
  try {
    // Fetch actual progress from database
    const { data: progressData, error: progressError } = await supabase
      .from('user_progress')
      .select('lesson_id, completed_at')
      .eq('user_id', userId);

    if (progressError) {
      console.error('Error fetching progress from database:', progressError);
      return {
        isValid: true,
        localData: { viewed: localViewedCount, completed: localCompletedCount },
        databaseData: null,
        shouldUseLocal: true,
        shouldUseDatabase: false
      };
    }

    // Get unique lesson IDs that are completed
    const completedLessons = new Set(progressData?.filter(p => p.completed_at).map(p => p.lesson_id) || []);
    const viewedLessons = new Set(progressData?.map(p => p.lesson_id) || []);

    const databaseCounts = {
      viewed: viewedLessons.size,
      completed: completedLessons.size
    };

    return {
      isValid: true,
      localData: { viewed: localViewedCount, completed: localCompletedCount },
      databaseData: databaseCounts,
      shouldUseLocal: false, // Always prefer database for accuracy
      shouldUseDatabase: true
    };

  } catch (error) {
    console.error('Error validating progress counts:', error);
    return {
      isValid: true,
      localData: { viewed: localViewedCount, completed: localCompletedCount },
      databaseData: null,
      shouldUseLocal: true,
      shouldUseDatabase: false
    };
  }
}

/**
 * Clears all localStorage data related to a specific user to prevent stale data issues
 */
export function clearUserLocalStorage(userId: string): void {
  if (typeof window === 'undefined') return;

  const keysToRemove: string[] = [];

  // Find all user-specific keys
  Object.keys(localStorage).forEach(key => {
    if (key.includes(`_${userId}_`) ||
        key.startsWith(`quiz-${userId}`) ||
        key.startsWith(`challenge-completed-${userId}`) ||
        key.startsWith(`viewedItems_${userId}`) ||
        key.startsWith(`completedItems_${userId}`)) {
      keysToRemove.push(key);
    }
  });

  // Remove the keys
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log('Cleared stale localStorage key:', key);
  });

  if (keysToRemove.length > 0) {
    console.log(`Cleared ${keysToRemove.length} stale localStorage entries for user ${userId}`);
  }
}

/**
 * Validates and returns the best data source (localStorage vs database)
 */
export async function getValidatedData<T>(
  localData: T | null,
  validationFn: () => Promise<ValidationResult<T>>
): Promise<T | null> {
  const result = await validationFn();

  if (result.shouldUseDatabase && result.databaseData) {
    return result.databaseData;
  } else if (result.shouldUseLocal && result.localData) {
    return result.localData;
  }

  return null;
}
