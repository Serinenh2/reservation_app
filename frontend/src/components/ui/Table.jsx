import { cn } from '@/lib/cn'

/**
 * Simple, readable table. Wide tables scroll inside their own box.
 * <Table columns={[{key:'name', header:'Nom'}, {key:'total', header:'Total', align:'end', render:(row)=>...}]} rows={data} />
 */
export default function Table({ columns, rows, rowKey = 'id', empty, onRowClick, caption }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-base">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-line bg-sunken/60">
            {columns.map((col) => (
              <th key={col.key} scope="col" className={cn('whitespace-nowrap px-4 py-2.5 text-sm font-semibold text-muted', col.align === 'end' ? 'text-end' : 'text-start')}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>{empty}</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row[rowKey]}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn('border-b border-line last:border-0', onRowClick && 'cursor-pointer hover:bg-sunken/60')}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-3', col.align === 'end' ? 'tabular text-end' : 'text-start')}>
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
