import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ClipboardList, Mail, MapPin, Pencil, Phone, Search, StickyNote, UserPlus, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { formatMoney } from '@/lib/format'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { Button, Input, Spinner } from '@/components/ui'
import ClientFormModal from './ClientFormModal'
import { useClient, useClients } from './api'

/**
 * Pick an existing client (search by name or phone) or create one
 * on the spot. value = the selected client object or null.
 */
export default function ClientPicker({ value, onChange, invalid, id, ...aria }) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const debounced = useDebouncedValue(search.trim())
  const { data, isFetching } = useClients({ search: debounced })
  const results = debounced ? data?.results || [] : []

  if (value) return <SelectedClient client={value} onChange={onChange} />

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute z-10 start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden />
          <Input
            id={id}
            type="search"
            invalid={invalid}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('clients.searchPlaceholder')}
            className="ps-9"
            autoComplete="off"
            {...aria}
          />
          {isFetching && debounced && <Spinner className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />}
        </div>
        <Button variant="secondary" icon={UserPlus} onClick={() => setCreating(true)}>{t('clients.new')}</Button>
      </div>

      {debounced && (
        <ul className="max-h-64 overflow-y-auto rounded-control border border-line bg-surface" role="listbox" aria-label={t('clients.title')}>
          {results.length === 0 && !isFetching && <li className="px-3 py-3 text-sm text-muted">{t('clients.noMatch')}</li>}
          {results.map((c) => (
            <li key={c.id} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => onChange(c)}
                className={cn('flex w-full items-center justify-between gap-3 px-3 py-2.5 text-start hover:bg-sunken focus:bg-sunken focus:outline-none')}
              >
                <span className="truncate font-medium">{c.full_name}</span>
                <span dir="ltr" className="tabular text-sm text-muted">{c.phone}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <ClientFormModal
        open={creating}
        client={search && !/\d/.test(search) ? { full_name: search } : search ? { phone: search } : null}
        onClose={() => setCreating(false)}
        onSaved={onChange}
      />
    </div>
  )
}

/**
 * The chosen client with all their details. Loads the full record because
 * the reservation only carries id, name and phone.
 */
function SelectedClient({ client, onChange }) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const { data } = useClient(client.id)
  const c = { ...client, ...data }
  const owed = Math.max(0, Number(c.total_amount || 0) - Number(c.paid_amount || 0))

  return (
    <div className="rounded-control border border-line bg-sunken/50">
      <div className="flex flex-wrap items-start justify-between gap-2 px-4 pt-3">
        <Link to={`/clients/${c.id}`} className="text-md font-semibold hover:underline">{c.full_name}</Link>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(true)}>{t('common.edit')}</Button>
          <Button size="sm" variant="ghost" icon={X} onClick={() => onChange(null)}>{t('clients.change')}</Button>
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-2 px-4 pb-3 pt-2 text-base sm:grid-cols-2">
        <Detail icon={Phone} label={t('clients.phone')}><span dir="ltr" className="tabular">{c.phone}</span></Detail>
        {c.phone_alt && <Detail icon={Phone} label={t('clients.phoneAlt')}><span dir="ltr" className="tabular">{c.phone_alt}</span></Detail>}
        {c.email && <Detail icon={Mail} label={t('clients.email')}><span className="break-all">{c.email}</span></Detail>}
        {c.address && <Detail icon={MapPin} label={t('clients.address')}>{c.address}</Detail>}
        {data && (
          <Detail icon={ClipboardList} label={t('clients.reservations')}>
            {t('clients.since', { count: c.reservation_count })}
            {owed > 0 && <span className="ms-2 text-sm font-semibold text-warning">{t('clients.owes', { amount: formatMoney(owed) })}</span>}
          </Detail>
        )}
        {c.notes && (
          <Detail icon={StickyNote} label={t('clients.notes')} className="sm:col-span-2">
            <span className="whitespace-pre-line">{c.notes}</span>
          </Detail>
        )}
      </dl>

      <ClientFormModal open={editing} client={c} onClose={() => setEditing(false)} onSaved={onChange} />
    </div>
  )
}

function Detail({ icon: Icon, label, children, className }) {
  return (
    <div className={cn('flex min-w-0 gap-2.5', className)}>
      <Icon className="mt-1 h-4 w-4 shrink-0 text-subtle" aria-hidden />
      <div className="min-w-0">
        <dt className="text-sm text-muted">{label}</dt>
        <dd>{children}</dd>
      </div>
    </div>
  )
}
