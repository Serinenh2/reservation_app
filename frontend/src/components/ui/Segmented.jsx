import { cn } from '@/lib/cn'

/** Small button group used as a filter (one choice). */
export default function Segmented({ label, options, value, onChange }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-control border border-line bg-sunken/60 p-0.5">
      {options.map(([key, text]) => (
        <button
          key={key || 'all'}
          type="button"
          role="radio"
          aria-checked={value === key}
          onClick={() => onChange(key)}
          className={cn(
            'rounded-[6px] px-3 py-1.5 text-sm font-semibold transition-colors',
            value === key ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
          )}
        >
          {text}
        </button>
      ))}
    </div>
  )
}
