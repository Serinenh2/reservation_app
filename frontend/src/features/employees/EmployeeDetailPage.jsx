import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CalendarCheck, CalendarX, ChevronLeft, ChevronRight, Clock, ExternalLink, FileText, Pencil, Phone, Plus, Trash2, UserRound, Wallet,
} from 'lucide-react'
import { describeError, fieldError } from '@/lib/api'
import { formatDate, formatMoney, formatNumber, toISODate } from '@/lib/format'
import { LANGUAGES } from '@/i18n'
import {
  Badge, Button, Card, ConfirmDialog, EmptyState, Field, FullPageSpinner, Input, Modal, PageHeader, Select, useToast,
} from '@/components/ui'
import EmployeeFormModal from './EmployeeFormModal'
import { useAbsences, useAddAbsence, useAuthedFile, useDeleteAbsence, useDeleteEmployee, useDeleteEmployeeFile, useEmployee } from './api'
import { EmployeeAvatar, isCurrent, useSeniorityText } from './shared'

const KINDS = ['unjustified', 'justified', 'sick', 'leave']
const KIND_TONES = { unjustified: 'danger', justified: 'neutral', sick: 'warning', leave: 'brand' }

export default function EmployeeDetailPage() {
  const { id } = useParams()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const seniorityText = useSeniorityText()
  const { data: e, isLoading, isError } = useEmployee(id)
  const remove = useDeleteEmployee()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (isLoading) return <FullPageSpinner />
  if (isError || !e) {
    return (
      <Card>
        <EmptyState icon={UserRound} title={t('employees.notFound')} action={<Link to="/employees" className="font-semibold text-brand underline dark:text-gold">{t('employees.backToList')}</Link>} />
      </Card>
    )
  }

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-4">
            <EmployeeAvatar employee={e} className="h-14 w-14 text-lg" />
            <span>
              {e.full_name}
              <span className="mt-0.5 block text-base font-normal text-muted">{e.position || t('employees.noPosition')}</span>
            </span>
          </span>
        }
        actions={
          <>
            <Button variant="ghost" icon={Trash2} className="!text-danger hover:!bg-danger-soft" onClick={() => setDeleting(true)}>{t('common.delete')}</Button>
            <Button icon={Pencil} onClick={() => setEditing(true)}>{t('common.edit')}</Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <Card>
            <Card.Header title={t('employees.info')} actions={<Badge tone={isCurrent(e) ? 'brand' : 'neutral'}>{t(isCurrent(e) ? 'employees.current' : 'employees.former')}</Badge>} />
            <dl className="space-y-4 p-5">
              <Info icon={CalendarCheck} label={t('employees.hireDate')}>{formatDate(e.hire_date)}</Info>
              <Info icon={Clock} label={t('employees.seniority')}>{seniorityText(e.hire_date, e.end_date)}</Info>
              {e.end_date && <Info icon={CalendarX} label={t('employees.endDate')}>{formatDate(e.end_date)}</Info>}
              <Info icon={Wallet} label={t('employees.salary')}><span className="tabular">{formatMoney(e.monthly_salary)}</span></Info>
              {e.phone && <Info icon={Phone} label={t('clients.phone')}><span dir="ltr" className="tabular">{e.phone}</span></Info>}
            </dl>
            {e.notes && <p className="whitespace-pre-line border-t border-line px-5 py-4 text-base text-muted">{e.notes}</p>}
          </Card>
          <IdDocumentCard employee={e} onUpload={() => setEditing(true)} />
        </div>

        <div className="lg:col-span-2">
          <Absences employee={e} />
        </div>
      </div>

      <EmployeeFormModal open={editing} employee={e} onClose={() => setEditing(false)} />
      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        loading={remove.isPending}
        onConfirm={() =>
          remove.mutate(e.id, {
            onSuccess: () => {
              toast.success(t('employees.deleted'))
              navigate('/employees', { replace: true })
            },
            onError: (err) => {
              toast.error(t(describeError(err).messageKey))
              setDeleting(false)
            },
          })
        }
        title={t('employees.deleteTitle', { name: e.full_name })}
        description={t('employees.deleteText')}
        confirmLabel={t('employees.deleteConfirm')}
        cancelLabel={t('employees.keep')}
      />
    </>
  )
}

function Info({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-subtle" aria-hidden />
      <div>
        <dt className="text-sm text-muted">{label}</dt>
        <dd className="mt-0.5 font-medium">{children}</dd>
      </div>
    </div>
  )
}

/** The ID document: image preview or PDF, opened from a private local link. */
function IdDocumentCard({ employee: e, onUpload }) {
  const { t } = useTranslation()
  const toast = useToast()
  const removeFile = useDeleteEmployeeFile(e.id)
  const [confirming, setConfirming] = useState(false)
  const url = useAuthedFile(e.has_id_document ? `/employees/${e.id}/id-document/` : null, e.updated_at)

  return (
    <Card>
      <Card.Header
        title={t('employees.idDocument')}
        actions={e.has_id_document && <Button size="sm" variant="ghost" icon={Trash2} aria-label={t('employees.removeDocument')} onClick={() => setConfirming(true)} />}
      />
      <div className="p-5">
        {!e.has_id_document ? (
          <div className="text-center">
            <p className="text-base text-muted">{t('employees.noDocument')}</p>
            <Button size="sm" variant="secondary" className="mt-3" onClick={onUpload}>{t('employees.uploadDocument')}</Button>
          </div>
        ) : !url ? (
          <div className="h-32 animate-pulse rounded-control bg-sunken" />
        ) : e.id_document_type === 'pdf' ? (
          <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-control border border-line p-3 hover:bg-sunken/60">
            <FileText className="h-8 w-8 text-danger" aria-hidden />
            <span className="flex-1 font-medium">{t('employees.openPdf')}</span>
            <ExternalLink className="h-4 w-4 text-subtle" aria-hidden />
          </a>
        ) : (
          <a href={url} target="_blank" rel="noreferrer" title={t('employees.openFull')}>
            <img src={url} alt={t('employees.idDocument')} className="max-h-64 w-full rounded-control border border-line object-contain" />
          </a>
        )}
      </div>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        loading={removeFile.isPending}
        onConfirm={() =>
          removeFile.mutate('id-document', {
            onSuccess: () => toast.success(t('employees.documentRemoved')),
            onSettled: () => setConfirming(false),
          })
        }
        title={t('employees.removeDocumentTitle')}
        description={t('employees.removeDocumentText')}
        confirmLabel={t('employees.removeDocument')}
        cancelLabel={t('employees.keepDocument')}
      />
    </Card>
  )
}

/** Absences of one month, with the month picker and the count per type. */
function Absences({ employee: e }) {
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const [cursor, setCursor] = useState(() => toISODate(new Date()).slice(0, 7)) // "2026-10"
  const [adding, setAdding] = useState(false)
  const { data = [], isLoading } = useAbsences(e.id, cursor)
  const remove = useDeleteAbsence(e.id)

  const [y, m] = cursor.split('-').map(Number)
  const locale = (LANGUAGES[i18n.language] || LANGUAGES.fr).locale
  const monthLabel = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', numberingSystem: 'latn' }).format(new Date(y, m - 1, 1))
  const move = (delta) => {
    const d = new Date(y, m - 1 + delta, 1)
    setCursor(toISODate(d).slice(0, 7))
  }
  const counts = KINDS.map((k) => [k, data.filter((a) => a.kind === k).length]).filter(([, n]) => n)

  return (
    <Card>
      <Card.Header
        title={t('employees.absences')}
        actions={<Button size="sm" icon={Plus} onClick={() => setAdding(true)}>{t('employees.addAbsence')}</Button>}
      />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" icon={ChevronLeft} className="rtl:[&>svg]:-scale-x-100" aria-label={t('calendar.previous')} onClick={() => move(-1)} />
          <h3 className="min-w-[9rem] text-center font-semibold first-letter:uppercase" aria-live="polite">{monthLabel}</h3>
          <Button size="icon" variant="ghost" icon={ChevronRight} className="rtl:[&>svg]:-scale-x-100" aria-label={t('calendar.next')} onClick={() => move(1)} />
        </div>
        <p className="text-base">
          <span className="tabular text-xl font-bold">{formatNumber(data.length)}</span>{' '}
          <span className="text-muted">{t('employees.absenceDays', { count: data.length })}</span>
        </p>
      </div>
      {counts.length > 0 && (
        <div className="flex flex-wrap gap-2 border-b border-line px-5 py-3">
          {counts.map(([k, n]) => (
            <Badge key={k} tone={KIND_TONES[k]}>{t(`employees.kinds.${k}`)} · {formatNumber(n)}</Badge>
          ))}
        </div>
      )}
      {isLoading ? (
        <div className="h-24 animate-pulse" />
      ) : data.length === 0 ? (
        <EmptyState icon={CalendarCheck} title={t('employees.noAbsences')} className="py-10" />
      ) : (
        <ul className="divide-y divide-line">
          {data.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium first-letter:uppercase">{formatDate(a.date, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                {a.note && <p className="text-sm text-muted">{a.note}</p>}
              </div>
              <Badge tone={KIND_TONES[a.kind]}>{t(`employees.kinds.${a.kind}`)}</Badge>
              <Button
                size="icon"
                variant="ghost"
                icon={Trash2}
                aria-label={t('employees.removeAbsence')}
                onClick={() => remove.mutate(a.id, { onSuccess: () => toast.success(t('employees.absenceRemoved')) })}
              />
            </li>
          ))}
        </ul>
      )}
      <AbsenceModal open={adding} onClose={() => setAdding(false)} employee={e} month={cursor} />
    </Card>
  )
}

function AbsenceModal({ open, onClose, employee, month }) {
  const { t } = useTranslation()
  const toast = useToast()
  const add = useAddAbsence(employee.id)
  // Default date: today if it is in the month shown, otherwise the 1st of that month.
  const defaultDate = () => {
    const today = toISODate(new Date())
    return today.startsWith(month) ? today : `${month}-01`
  }
  const [form, setForm] = useState({ date: '', kind: 'unjustified', note: '' })
  const [errors, setErrors] = useState({})
  const [lastOpen, setLastOpen] = useState(false)
  if (open !== lastOpen) {
    setLastOpen(open)
    if (open) {
      setForm({ date: defaultDate(), kind: 'unjustified', note: '' })
      setErrors({})
    }
  }

  const onSubmit = (ev) => {
    ev.preventDefault()
    if (!form.date) return setErrors({ date: ['required'] })
    add.mutate(form, {
      onSuccess: () => {
        toast.success(t('employees.absenceAdded'))
        onClose()
      },
      onError: (error) => {
        const { messageKey, fieldErrors } = describeError(error)
        setErrors(fieldErrors)
        toast.error(fieldError(t, fieldErrors, 'date') || t(messageKey))
      },
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={t('employees.addAbsence')}
      description={employee.full_name}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={add.isPending}>{t('common.cancel')}</Button>
          <Button type="submit" form="absence-form" loading={add.isPending}>{t('common.save')}</Button>
        </>
      }
    >
      <form id="absence-form" onSubmit={onSubmit} noValidate className="grid gap-4">
        <Field label={t('reservations.date')} error={fieldError(t, errors, 'date')}>
          <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </Field>
        <Field label={t('employees.absenceKind')}>
          <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
            {KINDS.map((k) => <option key={k} value={k}>{t(`employees.kinds.${k}`)}</option>)}
          </Select>
        </Field>
        <Field label={t('payments.note')} optional>
          <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </Field>
      </form>
    </Modal>
  )
}
