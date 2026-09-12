import {
  StudentSubmission,
  AttendanceRecord,
  PerformanceTier,
} from '@/types/main';

/**
 * Calculates attendance percentage from an array of attendance records.
 * Present and Excused count as positive attendance.
 * Returns a number between 0 and 100.
 */
export function calculateAttendanceRate(records?: AttendanceRecord[]): number {
  if (!records || records.length === 0) return 100;
  const positiveCount = records.filter(
    (r) => r.status === 'Present' || r.status === 'Excused'
  ).length;
  return Math.round((positiveCount / records.length) * 100);
}

/**
 * Calculates overall weighted average score percentage for a student based on submissions.
 * Returns a number between 0 and 100.
 */
export function calculateAverageScore(
  submissions?: StudentSubmission[],
  fallbackScore?: number
): number {
  if (fallbackScore !== undefined && fallbackScore !== null) {
    return fallbackScore;
  }
  if (!submissions || submissions.length === 0) {
    return 80; // Baseline default
  }

  const evaluated = submissions.filter(
    (s) => s.score !== undefined && s.score !== null
  );

  if (evaluated.length === 0) {
    return 80;
  }

  const sumPct = evaluated.reduce((acc, sub) => {
    const max = sub.maxScore || sub.max_score || parseFloat(sub.grade || '100') || 100;
    return acc + (sub.score || 0) / (max > 0 ? max : 100);
  }, 0);

  return Math.round((sumPct / evaluated.length) * 100);
}

/**
 * Categorizes a score percentage into a standard Performance Tier.
 */
export function getPerformanceTier(score: number): PerformanceTier {
  if (score >= 90) return 'High';
  if (score >= 65) return 'Average';
  return 'At Risk';
}

/**
 * Maps performance indicators / tiers to Tailwind CSS classes for badges and dots.
 */
export function getPerformanceStyles(perf?: string): {
  bg: string;
  text: string;
  dot: string;
} {
  const normalized = (perf || 'average').toLowerCase();
  switch (normalized) {
    case 'excellent':
    case 'high':
    case 'top':
      return {
        bg: 'bg-success/15 border-success/30',
        text: 'text-success',
        dot: 'bg-success',
      };
    case 'good':
      return {
        bg: 'bg-secondary/15 border-secondary/30',
        text: 'text-secondary',
        dot: 'bg-secondary',
      };
    case 'critical':
    case 'poor':
    case 'low':
    case 'at risk':
    case 'needs-attention':
      return {
        bg: 'bg-error/15 border-error/30',
        text: 'text-error',
        dot: 'bg-error',
      };
    case 'average':
    default:
      return {
        bg: 'bg-warning/15 border-warning/30',
        text: 'text-warning',
        dot: 'bg-warning',
      };
  }
}

/**
 * Maps a submission status to Tailwind badge styles.
 */
export function getSubmissionStatusBadge(status?: string): string {
  switch ((status || 'assigned').toLowerCase()) {
    case 'graded':
      return 'bg-success/15 text-success border-success/30';
    case 'evaluated':
      return 'bg-primary/15 text-primary border-primary/30';
    case 'submitted':
      return 'bg-secondary/15 text-secondary border-secondary/30';
    case 'pending':
      return 'bg-warning/10 text-warning border-warning/20';
    default:
      return 'bg-warning/15 text-warning border-warning/30';
  }
}
