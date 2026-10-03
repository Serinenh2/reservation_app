import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, Search, Trash2, Users } from 'lucide-react'
import { describeError } from '@/lib/api'
import { formatNumber } from '@/lib/format'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { Button, Card, ConfirmDialog, EmptyState, Input, PageHeader, Pagination, Spinner, Table, useToast } from '@/components/ui'
import ClientFormModal from './ClientFormModal'
import { useClients, useDeleteClient } from './api'

export default function ClientsPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const debounced = useDebouncedValue(search.trim())
  const { data, isLoading, isFetching } = useClients({ search: debounced, page })
  const remove = useDeleteClient()

  const [editing, setEditing] = useState(null) // null = closed, {} = new, client = edit
  const [deleting, setDeleting] = useState(null)

  const onDelete = () =>
    remove.mutate(deleting.id, {
      onSuccess: () => toast.success(t('clients.deleted')),
      onError: (e) => toast.error(t(describeError(e).messageKey)),
      onSettled: () => setDeleting(null),
    })

  const rows = data?.results || []
  const columns = [
    {
      key: 'full_name',
      header: t('clients.fullName'),
      render: (c) => (
        <Link to={`/clients/${c.id}`} className="font-semibold text-ink hover:text-brand hover:underline dark:hover:text-gold">
          {c.full_name}
        </Link>
      ),
    },
    { key: 'phone', header: t('clients.phone'), render: (c) => <span dir="ltr" className="tabular">{c.phone}</span> },
    { key: 'email', header: t('clients.email'), render: (c) => <span className="text-muted">{c.email || '—'}</span> },
    { key: 'reservation_count', header: t('clients.reservations'), align: 'end', render: (c) => formatNumber(c.reservation_count) },
    {
      key: 'actions',
      header: <span className="sr-only">{t('common.actions')}</span>,
      align: 'end',
      render: (c) => (
        <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost" icon={Pencil} aria-label={t('common.edit')} onClick={() => setEditing(c)} />
          <Button
            size="icon"
            variant="ghost"
            icon={Trash2}
            aria-label={t('common.delete')}
            disabled={c.reservation_count > 0}
            title={c.reservation_count > 0 ? t('errors.codes.client_has_reservations') : undefined}
            onClick={() => setDeleting(c)}
          />
        </div>
      ),
    },
  ]

  return (
    <>
      <PageHeader
        title={t('clients.title')}
        description={data ? t('clients.count', { count: data.count }) : t('common.loading')}
        actions={<Button icon={Plus} onClick={() => setEditing({})}>{t('clients.new')}</Button>}
      />

      <Card>
        <div className="flex items-center gap-3 border-b border-line p-4">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" aria-hidden />
            <Input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder={t('clients.searchPlaceholder')}
              aria-label={t('common.search')}
              className="ps-9"
            />
          </div>
          {isFetching && <Spinner className="h-4 w-4 text-subtle" />}
        </div>

        {isLoading ? (
          <div className="grid place-items-center py-16 text-gold"><Spinner className="h-6 w-6" /></div>
        ) : (
          <>
            <Table
              caption={t('clients.title')}
              columns={columns}
              rows={rows}
              empty={
                <EmptyState
                  icon={Users}
                  title={debounced ? t('clients.noMatch') : t('clients.empty')}
                  description={debounced ? t('clients.noMatchText') : t('clients.emptyText')}
                  action={!debounced && <Button icon={Plus} onClick={() => setEditing({})}>{t('clients.new')}</Button>}
                />
              }
            />
            <Pagination page={page} count={data?.count || 0} onChange={setPage} />
          </>
        )}
      </Card>

      <ClientFormModal open={editing !== null} client={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={onDelete}
        loading={remove.isPending}
        title={t('clients.deleteTitle', { name: deleting?.full_name })}
        description={t('clients.deleteText')}
        confirmLabel={t('clients.deleteConfirm')}
        cancelLabel={t('clients.deleteKeep')}
      />
    </>
  )
}
