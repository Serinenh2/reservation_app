import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ClipboardList, Mail, MapPin, Pencil, Phone, Plus, Users } from 'lucide-react'
import { formatMoney } from '@/lib/format'
import { Button, Card, EmptyState, FullPageSpinner, PageHeader, Pagination, StatCard } from '@/components/ui'
import ReservationTable from '@/features/reservations/ReservationTable'
import { useReservations } from '@/features/reservations/api'
import ClientFormModal from './ClientFormModal'
import { useClient } from './api'

/** Contact details + every reservation of this client (history). */
export default function ClientDetailPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(false)
  const { data: client, isLoading, isError } = useClient(id)
  const { data: history } = useReservations({ client: id, page }, { enabled: Boolean(client) })

  if (isLoading) return <FullPageSpinner />
  if (isError || !client) return <Card><EmptyState icon={Users} title={t('clients.notFound')} /></Card>

  const rows = history?.results || []
  const remaining = Math.max(0, Number(client.total_amount) - Number(client.paid_amount))

  return (
    <>
      <PageHeader
        title={client.full_name}
        description={t('clients.since', { count: client.reservation_count })}
        actions={
          <>
            <Button variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>{t('common.edit')}</Button>
            <Button icon={Plus} onClick={() => navigate(`/reservations/new?client=${client.id}`)}>{t('dashboard.createFirst')}</Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="self-start">
          <Card.Header title={t('clients.contact')} />
          <ul className="space-y-3 p-5">
            <Contact icon={Phone}><span dir="ltr" className="tabular">{client.phone}</span></Contact>
            {client.phone_alt && <Contact icon={Phone}><span dir="ltr" className="tabular">{client.phone_alt}</span></Contact>}
            {client.email && <Contact icon={Mail}><a href={`mailto:${client.email}`} className="hover:underline">{client.email}</a></Contact>}
            {client.address && <Contact icon={MapPin}>{client.address}</Contact>}
          </ul>
          {client.notes && <p className="whitespace-pre-line border-t border-line px-5 py-4 text-base text-muted">{client.notes}</p>}
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label={t('reservations.total')} value={formatMoney(client.total_amount)} tone="gold" />
            <StatCard label={t('reservations.paid')} value={formatMoney(client.paid_amount)} tone="success" />
            <StatCard label={t('reservations.remaining')} value={formatMoney(remaining)} tone="warning" />
          </div>
          <Card>
            <Card.Header title={t('clients.history')} />
            <ReservationTable
              rows={rows}
              showClient={false}
              empty={<EmptyState icon={ClipboardList} title={t('clients.noReservations')} />}
            />
            <Pagination page={page} count={history?.count || 0} onChange={setPage} />
          </Card>
        </div>
      </div>

      <ClientFormModal open={editing} client={client} onClose={() => setEditing(false)} />
    </>
  )
}

function Contact({ icon: Icon, children }) {
  return (
    <li className="flex items-center gap-3">
      <Icon className="h-4 w-4 shrink-0 text-subtle" aria-hidden />
      <span className="min-w-0 break-words">{children}</span>
    </li>
  )
}
