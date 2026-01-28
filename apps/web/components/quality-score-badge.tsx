/**
 * Quality Score Badge Component
 *
 * Displays a message quality score with color coding:
 * - Green (80+): Good quality
 * - Yellow (60-79): Acceptable quality
 * - Red (<60): Needs improvement
 */

import { cn } from '@/lib/utils';

interface QualityScoreBadgeProps {
  score: number;
  className?: string;
  showLabel?: boolean;
}

/**
 * Determines the color scheme based on quality score.
 * @param score - Quality score (0-100)
 * @returns Object with background and text color classes
 */
function getScoreColors(score: number): { bg: string; text: string } {
  if (score >= 80) {
    return { bg: 'bg-green-100', text: 'text-green-800' };
  }
  if (score >= 60) {
    return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
  }
  return { bg: 'bg-red-100', text: 'text-red-800' };
}

/**
 * Returns a label describing the quality level.
 * @param score - Quality score (0-100)
 * @returns Quality level label
 */
function getScoreLabel(score: number): string {
  if (score >= 80) {
    return 'Good';
  }
  if (score >= 60) {
    return 'OK';
  }
  return 'Low';
}

/**
 * Quality score badge that shows score with color-coded background.
 *
 * @example
 * ```tsx
 * <QualityScoreBadge score={85} /> // Green badge showing "85"
 * <QualityScoreBadge score={65} showLabel /> // Yellow badge showing "65 OK"
 * <QualityScoreBadge score={45} showLabel /> // Red badge showing "45 Low"
 * ```
 */
export function QualityScoreBadge({
  score,
  className,
  showLabel = false,
}: QualityScoreBadgeProps) {
  const colors = getScoreColors(score);
  const label = getScoreLabel(score);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        colors.bg,
        colors.text,
        className
      )}
    >
      {score}
      {showLabel && <span className="font-normal">({label})</span>}
    </span>
  );
}

export { getScoreColors, getScoreLabel };
