import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Archive, ArchiveRestore, Heart, PartyPopper, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import { describeError, fieldError } from '@/lib/api'
import { formatMoney, localName } from '@/lib/format'
import { useAuth } from '@/features/auth/AuthProvider'
import { Badge, Button, Card, EmptyState, Field, Input, Modal, PageHeader, Spinner, Table, useToast } from '@/components/ui'
import { useCatalog, useSaveCatalogItem } from './api'

/**
 * One page for both catalogs. Items are never deleted: "Archive" hides
 * them from the reservation form but keeps old reservations intact.
 *   kind="occasions" -> price field is default_price
 *   kind="services"  -> price field is price
 */
const CONFIG = {
  'event-types': { priceKey: null, icon: Heart, i18n: 'eventTypes' }, // no price: wedding, engagement...
  occasions: { priceKey: 'default_price', icon: PartyPopper, i18n: 'occasions' },
  services: { priceKey: 'price', icon: Sparkles, i18n: 'services' },
}

export default function CatalogPage({ kind }) {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const toast = useToast()
  const canEdit = Boolean(user?.is_staff)
  const { priceKey, icon, i18n: ns } = CONFIG[kind]
  const { data = [], isLoading } = useCatalog(kind)
  const save = useSaveCatalogItem(kind)
  const [editing, setEditing] = useState(null)

  const toggleActive = (item) =>
    save.mutate(
      { id: item.id, is_active: !item.is_active },
      {
        onSuccess: () => toast.success(t(item.is_active ? 'catalog.archived' : 'catalog.restored')),
        onError: (e) => toast.error(t(describeError(e).messageKey)),
      },
    )

  const [first, second] = i18n.language === 'ar' ? ['name_ar', 'name_fr'] : ['name_fr', 'name_ar']
  const columns = [
    {
      key: 'name',
      header: t('catalog.name'),
      render: (item) => (
        <div className={item.is_active ? '' : 'opacity-60'}>
          <p className="font-semibold">{item[first]}</p>
          <p className="text-sm text-muted"><bdi lang={second.slice(-2)}>{item[second]}</bdi></p>
        </div>
      ),
    },
    priceKey && { key: 'price', header: t(`${ns}.price`), align: 'end', render: (item) => <PriceSummary kind={kind} item={item} /> },
    {
      key: 'status',
      header: t('common.status'),
      render: (item) => <Badge tone={item.is_active ? 'brand' : 'neutral'}>{t(item.is_active ? 'catalog.active' : 'catalog.inactive')}</Badge>,
    },
  ].filter(Boolean)
  if (canEdit) {
    columns.push({
      key: 'actions',
      header: <span className="sr-only">{t('common.actions')}</span>,
      align: 'end',
      render: (item) => (
        <div className="flex justify-end gap-1">
          <Button size="icon" variant="ghost" icon={Pencil} aria-label={t('common.edit')} onClick={() => setEditing(item)} />
          <Button
            size="icon"
            variant="ghost"
            icon={item.is_active ? Archive : ArchiveRestore}
            aria-label={t(item.is_active ? 'catalog.archive' : 'catalog.restore')}
            title={t(item.is_active ? 'catalog.archive' : 'catalog.restore')}
            onClick={() => toggleActive(item)}
          />
        </div>
      ),
    })
  }

  return (
    <>
      <PageHeader
        title={t(`${ns}.title`)}
        description={canEdit ? t(`${ns}.subtitle`) : t('catalog.readOnly')}
        actions={canEdit && <Button icon={Plus} onClick={() => setEditing({})}>{t(`${ns}.new`)}</Button>}
      />
      <Card>
        {isLoading ? (
          <div className="grid place-items-center py-16 text-gold"><Spinner className="h-6 w-6" /></div>
        ) : (
          <Table
            caption={t(`${ns}.title`)}
            columns={columns}
            rows={data}
            empty={
              <EmptyState
                icon={icon}
                title={t(`${ns}.empty`)}
                description={t(`${ns}.emptyText`)}
                action={canEdit && <Button icon={Plus} onClick={() => setEditing({})}>{t(`${ns}.new`)}</Button>}
              />
            }
          />
        )}
      </Card>
      <CatalogFormModal kind={kind} item={editing} onClose={() => setEditing(null)} />
    </>
  )
}


/** Price column: single price, or the tier grid / option list in short. */
function PriceSummary({ kind, item }) {
  const { t } = useTranslation()
  const rows =
    kind === 'occasions'
      ? item.tiers.map((tier) => [t('occasions.upTo', { count: tier.max_guests }), tier.price])
      : item.options.map((o) => [localName(o), o.price])
  if (rows.length === 0) return formatMoney(kind === 'occasions' ? item.default_price : item.price)
  return (
    <ul className="space-y-0.5 text-sm">
      {rows.map(([label, price]) => (
        <li key={label} className="flex justify-end gap-3">
          <span className="text-muted">{label}</span>
          <span className="tabular font-medium text-ink">{formatMoney(price)}</span>
        </li>
      ))}
    </ul>
  )
}

const newTier = () => ({ key: Math.random(), max_guests: '', price: '' })
const newOption = () => ({ key: Math.random(), name_fr: '', name_ar: '', price: '' })

function CatalogFormModal({ kind, item, onClose }) {
  const { t } = useTranslation()
  const toast = useToast()
  const { priceKey, i18n: ns } = CONFIG[kind]
  const isOccasion = kind === 'occasions'
  const save = useSaveCatalogItem(kind)
  const [form, setForm] = useState({})
  const [rows, setRows] = useState([]) // tiers (occasions) or options (services)
  const [errors, setErrors] = useState({})
  const open = item !== null

  useEffect(() => {
    if (open) {
      setForm({ name_fr: '', name_ar: '', ...(priceKey && { [priceKey]: '' }), ...item })
      const list = (isOccasion ? item?.tiers : item?.options) || []
      setRows(list.map((r) => ({ ...r, key: r.id ?? Math.random() })))
      setErrors({})
    }
  }, [open, item, priceKey, isOccasion])

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })
  const setRow = (index, key) => (e) => setRows(rows.map((r, i) => (i === index ? { ...r, [key]: e.target.value } : r)))
  const removeRow = (index) => setRows(rows.filter((_, i) => i !== index))
  const hasRows = rows.length > 0

  const validate = () => {
    const local = {}
    if (!form.name_fr?.trim()) local.name_fr = ['required']
    if (!form.name_ar?.trim()) local.name_ar = ['required']
    if (priceKey && !hasRows && (form[priceKey] === '' || Number(form[priceKey]) < 0)) local[priceKey] = ['min_value']
    const bad = rows.some((r) =>
      isOccasion
        ? !(Number(r.max_guests) >= 1) || r.price === '' || Number(r.price) < 0
        : !r.name_fr?.trim() || !r.name_ar?.trim() || r.price === '' || Number(r.price) < 0,
    )
    if (bad) local.rows = ['required']
    else if (isOccasion && new Set(rows.map((r) => Number(r.max_guests))).size !== rows.length) local.rows = ['duplicate']
    return local
  }

  const onSubmit = (e) => {
    e.preventDefault()
    const local = validate()
    if (Object.keys(local).length) return setErrors(local)

    const payload = { id: form.id, name_fr: form.name_fr, name_ar: form.name_ar }
    if (priceKey) payload[priceKey] = Number(form[priceKey]) || 0
    if (isOccasion) payload.tiers = rows.map((r) => ({ max_guests: Number(r.max_guests), price: Number(r.price) }))
    if (kind === 'services') payload.options = rows.map((r) => ({ ...(r.id && { id: r.id }), name_fr: r.name_fr, name_ar: r.name_ar, price: Number(r.price) }))

    save.mutate(payload, {
      onSuccess: () => {
        toast.success(t('catalog.saved'))
        onClose()
      },
      onError: (error) => {
        const { messageKey, fieldErrors } = describeError(error)
        const listError = fieldErrors.tiers || fieldErrors.options
        setErrors({ ...fieldErrors, rows: listError && (typeof listError[0] === 'string' ? listError : ['invalidValue']) })
        toast.error(t(messageKey))
      },
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size={priceKey ? 'lg' : 'sm'}
      title={item?.id ? t(`${ns}.edit`) : t(`${ns}.new`)}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>{t('common.cancel')}</Button>
          <Button type="submit" form="catalog-form" loading={save.isPending}>{t('common.save')}</Button>
        </>
      }
    >
      <form id="catalog-form" onSubmit={onSubmit} noValidate className="grid gap-5">
        <div className={priceKey ? 'grid gap-4 sm:grid-cols-2' : 'grid gap-4'}>
          <Field label={t('catalog.nameFr')} error={fieldError(t, errors, 'name_fr')}>
            <Input value={form.name_fr || ''} onChange={set('name_fr')} lang="fr" dir="ltr" autoFocus />
          </Field>
          <Field label={t('catalog.nameAr')} error={fieldError(t, errors, 'name_ar')}>
            <Input value={form.name_ar || ''} onChange={set('name_ar')} lang="ar" dir="rtl" />
          </Field>
        </div>

        {/* Price grid (occasions) or options (services) */}
        {priceKey && (
          <fieldset className="rounded-panel border border-line">
            <legend className="sr-only">{t(`${ns}.rowsTitle`)}</legend>
            <div className="border-b border-line px-4 py-3">
              <p className="font-semibold">{t(`${ns}.rowsTitle`)}</p>
              <p className="text-sm text-muted">{t(`${ns}.rowsHint`)}</p>
            </div>
            {hasRows && (
              <ul className="divide-y divide-line">
                {rows.map((row, i) => (
                  <li key={row.key} className="flex flex-wrap items-end gap-3 px-4 py-3">
                    {isOccasion ? (
                      <Field label={t('occasions.maxGuests')} className="min-w-[9rem] flex-1">
                        <Input type="number" min="1" step="10" value={row.max_guests} onChange={setRow(i, 'max_guests')} />
                      </Field>
                    ) : (
                      <>
                        <Field label={t('catalog.nameFr')} className="min-w-[9rem] flex-1">
                          <Input value={row.name_fr} onChange={setRow(i, 'name_fr')} lang="fr" dir="ltr" />
                        </Field>
                        <Field label={t('catalog.nameAr')} className="min-w-[9rem] flex-1">
                          <Input value={row.name_ar} onChange={setRow(i, 'name_ar')} lang="ar" dir="rtl" />
                        </Field>
                      </>
                    )}
                    <Field label={isOccasion ? t('occasions.tierPrice') : t('services.price')} className="min-w-[9rem] flex-1">
                      <Input type="number" min="0" step="1000" suffix={t('common.currency')} value={row.price} onChange={setRow(i, 'price')} />
                    </Field>
                    <Button size="icon" variant="ghost" icon={Trash2} aria-label={t('common.delete')} onClick={() => removeRow(i)} />
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Button size="sm" variant="secondary" icon={Plus} onClick={() => setRows([...rows, isOccasion ? newTier() : newOption()])}>
                {t(`${ns}.addRow`)}
              </Button>
              {errors.rows && <p className="text-sm font-medium text-danger" role="alert">{fieldError(t, errors, 'rows')}</p>}
            </div>
          </fieldset>
        )}

        {/* Single price: used only when there is no grid / no option */}
        {priceKey && !hasRows && (
          <Field label={t(`${ns}.price`)} hint={t(`${ns}.priceHint`)} error={fieldError(t, errors, priceKey)}>
            <Input type="number" min="0" step="1000" suffix={t('common.currency')} value={form[priceKey] ?? ''} onChange={set(priceKey)} />
          </Field>
        )}
      </form>
    </Modal>
  )
}
