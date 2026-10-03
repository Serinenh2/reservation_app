import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Plus, Printer, Trash2, Search, Users } from 'lucide-react'
import { formatMoney } from '@/lib/format'
import {
  Badge, Button, Card, ConfirmDialog, EmptyState, Field, Input, PageHeader, Select,
  StatCard, StatusBadge, Switch, Table, Textarea, TotalBox, useToast,
} from '@/components/ui'

/** Living documentation of the design system. Every example is a real component. */
export default function DesignSystemPage() {
  const { t } = useTranslation()
  return (
    <>
      <PageHeader title={t('ds.title')} description={t('ds.subtitle')} />
      <div className="space-y-6">
        <Colors />
        <Typography />
        <Buttons />
        <Badges />
        <Forms />
        <Feedback />
        <ChartSample />
      </div>
    </>
  )
}

function Swatch({ name, token, text = 'text-white' }) {
  return (
    <div className="overflow-hidden rounded-control border border-line">
      <div className={`flex h-16 items-end p-2 ${token} ${text}`}>
        <span className="text-xs font-semibold opacity-90">{name}</span>
      </div>
      <p className="bg-surface px-2 py-1.5 text-xs text-muted" dir="ltr">{token.replace('bg-', '')}</p>
    </div>
  )
}

function Colors() {
  const { t } = useTranslation()
  return (
    <Card>
      <Card.Header title={t('ds.colors')} />
      <Card.Body className="space-y-6">
        <section>
          <h3 className="mb-3 text-sm font-semibold text-muted">{t('ds.brandColors')}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            <Swatch name="Velvet" token="bg-brand" />
            <Swatch name="Velvet soft" token="bg-brand-soft" text="text-ink" />
            <Swatch name="Fetla" token="bg-gold" />
            <Swatch name="Fetla soft" token="bg-gold-soft" text="text-ink" />
            <Swatch name="Sidebar" token="bg-sidebar" />
          </div>
        </section>
        <section>
          <h3 className="mb-3 text-sm font-semibold text-muted">{t('ds.surfaceColors')}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            <Swatch name="Background" token="bg-bg" text="text-ink" />
            <Swatch name="Surface" token="bg-surface" text="text-ink" />
            <Swatch name="Sunken" token="bg-sunken" text="text-ink" />
            <Swatch name="Line" token="bg-line" text="text-ink" />
            <Swatch name="Muted" token="bg-muted" />
            <Swatch name="Ink" token="bg-ink" text="text-bg" />
          </div>
        </section>
        <section>
          <h3 className="mb-1 text-sm font-semibold text-muted">{t('ds.statusColors')}</h3>
          <p className="mb-3 text-sm text-subtle">{t('ds.statusNote')}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Swatch name={t('status.confirmed')} token="bg-success" />
            <Swatch name={t('status.pending')} token="bg-warning" />
            <Swatch name={t('status.blocked')} token="bg-danger" />
            <Swatch name={t('status.cancelled')} token="bg-neutral" />
          </div>
        </section>
      </Card.Body>
    </Card>
  )
}

function Typography() {
  const { t } = useTranslation()
  const scale = [
    ['3xl', '38', 'text-3xl font-extrabold tracking-tight'],
    ['2xl', '30', 'text-2xl font-bold tracking-tight'],
    ['xl', '24', 'text-xl font-bold'],
    ['lg', '20', 'text-lg font-semibold'],
    ['md', '17', 'text-md font-semibold'],
    ['base', '15', 'text-base'],
    ['sm', '13', 'text-sm text-muted'],
  ]
  return (
    <Card>
      <Card.Header title={t('ds.typography')} description="Manrope · IBM Plex Sans Arabic" />
      <Card.Body className="divide-y divide-line p-0">
        {scale.map(([name, px, cls]) => (
          <div key={name} className="flex items-baseline gap-4 px-5 py-3">
            <span className="w-16 shrink-0 text-xs text-subtle" dir="ltr">{name} · {px}px</span>
            <span className={`${cls} min-w-0 truncate`}>{name === 'base' || name === 'sm' ? t('ds.bodySample') : t('ds.typeSample')}</span>
          </div>
        ))}
        <div className="grid gap-4 px-5 py-4 md:grid-cols-2">
          <p lang="fr" style={{ fontFamily: 'var(--font-latin)' }} className="text-lg">Fiançailles · 250 invités · 180 000 DA</p>
          <p lang="ar" dir="rtl" style={{ fontFamily: 'var(--font-arabic)' }} className="text-lg">خطوبة · 250 ضيفاً · 180,000 دج</p>
        </div>
      </Card.Body>
    </Card>
  )
}

function Buttons() {
  const { t } = useTranslation()
  return (
    <Card>
      <Card.Header title={t('ds.buttons')} />
      <Card.Body className="flex flex-wrap items-center gap-3">
        <Button icon={Plus}>{t('dashboard.createFirst')}</Button>
        <Button variant="secondary" icon={Printer}>{t('common.print')}</Button>
        <Button variant="ghost">{t('common.back')}</Button>
        <Button variant="danger" icon={Trash2}>{t('common.delete')}</Button>
        <Button variant="gold">{t('common.confirm')}</Button>
        <Button loading>{t('common.saving')}</Button>
        <Button disabled>{t('common.save')}</Button>
        <Button size="sm" variant="secondary">{t('common.edit')}</Button>
        <Button size="icon" variant="secondary" icon={Search} aria-label={t('common.search')} />
      </Card.Body>
    </Card>
  )
}

function Badges() {
  const { t } = useTranslation()
  return (
    <Card>
      <Card.Header title={t('ds.badges')} />
      <Card.Body className="flex flex-wrap gap-2">
        <StatusBadge status="confirmed" />
        <StatusBadge status="pending" />
        <StatusBadge status="blocked" />
        <StatusBadge status="cancelled" />
        <StatusBadge status="available" />
        <Badge tone="success">{t('payment.paid')}</Badge>
        <Badge tone="warning">{t('payment.partial')}</Badge>
        <Badge tone="neutral">{t('payment.unpaid')}</Badge>
      </Card.Body>
    </Card>
  )
}

function Forms() {
  const { t } = useTranslation()
  const [on, setOn] = useState(true)
  return (
    <Card>
      <Card.Header title={t('ds.forms')} />
      <Card.Body className="grid gap-4 md:grid-cols-2">
        <Field label={t('ds.sampleName')}>
          <Input defaultValue="Sarah Benali" />
        </Field>
        <Field label={t('ds.samplePhone')} error={t('ds.sampleError')}>
          <Input type="tel" defaultValue="0550 12" />
        </Field>
        <Field label={t('ds.sampleOccasion')}>
          <Select defaultValue="wedding">
            <option value="wedding">{t('ds.occWedding')}</option>
            <option value="dinner">{t('ds.occDinner')}</option>
            <option value="engagement">{t('ds.occEngagement')}</option>
          </Select>
        </Field>
        <Field label={t('settings.minPayment')} hint={t('settings.minPaymentHint')}>
          <Input type="number" defaultValue={20000} suffix={t('common.currency')} />
        </Field>
        <Field label={t('ds.sampleNotes')} optional className="md:col-span-2">
          <Textarea />
        </Field>
        <div className="flex items-center gap-3">
          <Switch id="ds-switch" checked={on} onChange={setOn} />
          <label htmlFor="ds-switch" className="text-base">{t('settings.multipleEvents')}</label>
        </div>
        <TotalBox label={t('ds.totalToPay')} amount={180000} />
      </Card.Body>
    </Card>
  )
}

function Feedback() {
  const { t } = useTranslation()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const rows = [
    { id: 1, name: 'Sarah Benali', phone: '0550 12 34 56', total: 200000, status: 'confirmed' },
    { id: 2, name: 'Yacine Haddad', phone: '0661 98 76 54', total: 85000, status: 'pending' },
  ]
  return (
    <Card>
      <Card.Header title={t('ds.feedback')} />
      <Card.Body className="space-y-6">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => toast.success(t('ds.toastSuccessMsg'))}>{t('ds.toastSuccess')}</Button>
          <Button variant="secondary" onClick={() => toast.error(t('ds.toastErrorMsg'))}>{t('ds.toastError')}</Button>
          <Button variant="secondary" onClick={() => setOpen(true)}>{t('ds.openDialog')}</Button>
        </div>
        <ConfirmDialog
          open={open}
          onClose={() => setOpen(false)}
          onConfirm={() => setOpen(false)}
          title={t('ds.dialogTitle')}
          description={t('ds.dialogText')}
          confirmLabel={t('ds.dialogConfirm')}
          cancelLabel={t('ds.dialogKeep')}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label={t('dashboard.totalAmount')} value={formatMoney(285000)} tone="gold" />
          <StatCard label={t('dashboard.paidAmount')} value={formatMoney(70000)} tone="success" />
          <StatCard label={t('dashboard.remainingAmount')} value={formatMoney(215000)} tone="warning" />
        </div>
        <div className="overflow-hidden rounded-panel border border-line">
          <Table
            caption={t('nav.clients')}
            columns={[
              { key: 'name', header: t('ds.sampleName') },
              { key: 'phone', header: t('ds.samplePhone'), render: (r) => <span dir="ltr">{r.phone}</span> },
              { key: 'status', header: t('common.status'), render: (r) => <StatusBadge status={r.status} /> },
              { key: 'total', header: t('dashboard.totalAmount'), align: 'end', render: (r) => formatMoney(r.total) },
            ]}
            rows={rows}
          />
        </div>
        <div className="rounded-panel border border-dashed border-line">
          <EmptyState icon={Users} title={t('ds.emptyTitle')} description={t('ds.emptyText')} />
        </div>
      </Card.Body>
    </Card>
  )
}

function ChartSample() {
  const { t, i18n } = useTranslation()
  const months = t('ds.months').split(',')
  const values = [420000, 380000, 610000, 540000, 880000, 1020000]
  // In Arabic, months read right-to-left, so the time axis is reversed.
  const data = months.map((m, i) => ({ month: m, total: values[i] }))
  const rtl = i18n.language === 'ar'
  return (
    <Card>
      <Card.Header title={t('ds.chart')} description={t('ds.chartNote')} />
      <Card.Body>
        <div className="h-64" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(var(--c-gold))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="rgb(var(--c-gold))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgb(var(--c-line))" />
              <XAxis dataKey="month" reversed={rtl} tickLine={false} axisLine={false} tick={{ fill: 'rgb(var(--c-muted))', fontSize: 12 }} />
              <YAxis orientation={rtl ? 'right' : 'left'} tickLine={false} axisLine={false} width={56} tick={{ fill: 'rgb(var(--c-muted))', fontSize: 12 }} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip
                formatter={(v) => [formatMoney(v), t('dashboard.totalAmount')]}
                contentStyle={{ background: 'rgb(var(--c-surface))', border: '1px solid rgb(var(--c-line))', borderRadius: 10, color: 'rgb(var(--c-ink))' }}
              />
              <Area type="monotone" dataKey="total" stroke="rgb(var(--c-gold))" strokeWidth={2} fill="url(#goldFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card.Body>
    </Card>
  )
}
