'use client';

import { TooltipRenderProps } from 'react-joyride';
import { X } from 'lucide-react';

export function TourTooltip({
  continuous,
  index,
  step,
  size,
  backProps,
  closeProps,
  primaryProps,
  skipProps,
  tooltipProps,
  isLastStep,
}: TooltipRenderProps) {
  return (
    <div
      {...tooltipProps}
      className="bg-[#242836] border border-white/10 rounded-lg shadow-2xl max-w-[320px] p-6 relative"
    >
      {/* Header with close/skip buttons */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 pr-8">
          {step.title && (
            <h3 className="text-white font-semibold text-lg leading-tight">
              {step.title}
            </h3>
          )}
        </div>

        <div className="flex items-center gap-2 absolute top-4 right-4">
          {/* Skip button */}
          {index > 0 && (
            <button
              {...skipProps}
              className="text-gray-500 hover:text-white transition-colors text-sm font-medium"
            >
              Skip
            </button>
          )}

          {/* Close button */}
          <button
            {...closeProps}
            className="text-gray-500 hover:text-white transition-colors p-1"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {step.content && (
        <div className="text-gray-400 text-sm leading-relaxed mb-6">
          {step.content}
        </div>
      )}

      {/* Progress indicator */}
      <div className="text-gray-500 text-xs mb-4">
        Step {index + 1} of {size}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        {/* Back button */}
        {index > 0 && (
          <button
            {...backProps}
            className="flex-1 px-4 py-2 bg-transparent border border-white/20 text-white rounded-md hover:bg-white/10 transition-colors text-sm font-medium"
          >
            Back
          </button>
        )}

        {/* Primary button (Next/Finish) */}
        {continuous && (
          <button
            {...primaryProps}
            className="flex-1 px-4 py-2 bg-[#d4a84b] text-[#1a1d29] rounded-md hover:bg-[#e5b95c] transition-colors text-sm font-semibold"
          >
            {isLastStep ? 'Finish' : 'Next'}
          </button>
        )}
      </div>
    </div>
  );
}
