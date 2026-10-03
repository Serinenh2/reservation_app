import { cn } from '@/lib/cn'

/** A white panel. Use <Card.Header title actions> for a titled panel. */
export default function Card({ className, children, as: Tag = 'section', ...props }) {
  return (
    <Tag className={cn('rounded-panel border border-line bg-surface shadow-panel', className)} {...props}>
      {children}
    </Tag>
  )
}

Card.Header = function CardHeader({ title, description, actions, className }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4', className)}>
      <div className="min-w-0">
        <h2 className="text-md font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

Card.Body = function CardBody({ className, children }) {
  return <div className={cn('p-5', className)}>{children}</div>
}
