import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Ban, Plus, Unlock } from 'lucide-react'
import { describeError } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { useAuth } from '@/features/auth/AuthProvider'
import { useBlockedDates, useUnblockDate } from '@/features/reservations/api'
import { Button, Card, ConfirmDialog, EmptyState, PageHeader, Segmented, Spinner, Table, useToast } from '@/components/ui'
import BlockDateModal from './BlockDateModal'

export default function BlockedDatesPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const toast = useToast()
  const canEdit = Boolean(user?.is_staff)
  const [upcoming, setUpcoming] = useState(true)
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState(null)
  const { data = [], isLoading } = useBlockedDates({ upcoming })
  const unblock = useUnblockDate()

  const columns = [
    { key: 'date', header: t('reservations.date'), render: (b) => <span className="font-semibold">{formatDate(b.date, { dateStyle: 'full' })}</span> },
    { key: 'reason', header: t('blocked.reason'), render: (b) => <span className="text-muted">{b.reason || '—'}</span> },
  ]
  if (canEdit) {
    columns.push({
      key: 'actions',
      header: <span className="sr-only">{t('common.actions')}</span>,
      align: 'end',
      render: (b) => <Button size="sm" variant="secondary" icon={Unlock} onClick={() => setRemoving(b)}>{t('blocked.unblock')}</Button>,
    })
  }

  return (
    <>
      <PageHeader
        title={t('blocked.title')}
        description={canEdit ? undefined : t('catalog.readOnly')}
        actions={canEdit && <Button variant="danger" icon={Plus} onClick={() => setAdding(true)}>{t('blocked.add')}</Button>}
      />
      <Card>
        <div className="border-b border-line p-4">
          <Segmented
            label={t('reservations.period')}
            options={[['upcoming', t('reservations.periods.upcoming')], ['all', t('reservations.periods.all')]]}
            value={upcoming ? 'upcoming' : 'all'}
            onChange={(v) => setUpcoming(v === 'upcoming')}
          />
        </div>
        {isLoading ? (
          <div className="grid place-items-center py-16 text-gold"><Spinner className="h-6 w-6" /></div>
        ) : (
          <Table caption={t('blocked.title')} columns={columns} rows={data} empty={<EmptyState icon={Ban} title={t('blocked.empty')} description={t('blocked.emptyText')} />} />
        )}
      </Card>

      <BlockDateModal open={adding} onClose={() => setAdding(false)} />
      <ConfirmDialog
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        tone="warning"
        loading={unblock.isPending}
        onConfirm={() =>
          unblock.mutate(removing.id, {
            onSuccess: () => toast.success(t('blocked.removed')),
            onError: (e) => toast.error(t(describeError(e).messageKey)),
            onSettled: () => setRemoving(null),
          })
        }
        title={t('blocked.unblockTitle', { date: removing ? formatDate(removing.date) : '' })}
        description={t('blocked.unblockText')}
        confirmLabel={t('blocked.unblock')}
        cancelLabel={t('blocked.keep')}
      />
    </>
  )
}
