import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, FileText, Upload } from 'lucide-react'
import { describeError, fieldError } from '@/lib/api'
import { toISODate } from '@/lib/format'
import { Button, Field, Input, Modal, Textarea, useToast } from '@/components/ui'
import { useSaveEmployee } from './api'
import { EmployeeAvatar } from './shared'

const EMPTY = { last_name: '', first_name: '', position: '', phone: '', hire_date: '', end_date: '', monthly_salary: '', notes: '' }
const PHOTO_TYPES = '.jpg,.jpeg,.png,.webp'
const DOC_TYPES = '.pdf,.jpg,.jpeg,.png,.webp'

/** Create or edit an employee, including photo and ID document. */
export default function EmployeeFormModal({ open, onClose, employee, onSaved }) {
  const { t } = useTranslation()
  const toast = useToast()
  const save = useSaveEmployee()
  const [form, setForm] = useState(EMPTY)
  const [photo, setPhoto] = useState(null) // new File, not yet uploaded
  const [idDocument, setIdDocument] = useState(null)
  const [errors, setErrors] = useState({})
  const photoInput = useRef(null)
  const docInput = useRef(null)

  useEffect(() => {
    if (open) {
      setForm(employee ? { ...EMPTY, ...employee, end_date: employee.end_date || '' } : { ...EMPTY, hire_date: toISODate(new Date()) })
      setPhoto(null)
      setIdDocument(null)
      setErrors({})
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Local preview of the chosen photo before saving.
  const [preview, setPreview] = useState(null)
  useEffect(() => {
    if (!photo) return setPreview(null)
    const url = URL.createObjectURL(photo)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const onSubmit = (e) => {
    e.preventDefault()
    const local = {}
    if (!form.last_name.trim()) local.last_name = ['required']
    if (!form.first_name.trim()) local.first_name = ['required']
    if (!form.hire_date) local.hire_date = ['required']
    if (form.end_date && form.hire_date && form.end_date < form.hire_date) local.end_date = ['end_before_start']
    if (form.monthly_salary === '' || Number(form.monthly_salary) < 0) local.monthly_salary = ['min_value']
    if (photo && photo.size > 5 * 1024 * 1024) local.photo = ['file_too_big']
    if (idDocument && idDocument.size > 10 * 1024 * 1024) local.id_document = ['file_too_big']
    if (Object.keys(local).length) return setErrors(local)

    const { last_name, first_name, position, phone, hire_date, end_date, monthly_salary, notes } = form
    save.mutate(
      {
        id: employee?.id,
        last_name, first_name, position, phone, hire_date, notes,
        end_date: end_date || null,
        monthly_salary: Number(monthly_salary),
        photo: photo || undefined,
        id_document: idDocument || undefined,
      },
      {
        onSuccess: (saved) => {
          toast.success(t('employees.saved'))
          onSaved?.(saved)
          onClose()
        },
        onError: (error) => {
          const { messageKey, fieldErrors } = describeError(error)
          setErrors(fieldErrors)
          toast.error(t(messageKey))
        },
      },
    )
  }

  const err = (key) => fieldError(t, errors, key)

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={employee?.id ? t('employees.edit') : t('employees.new')}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={save.isPending}>{t('common.cancel')}</Button>
          <Button type="submit" form="employee-form" loading={save.isPending}>{t('common.save')}</Button>
        </>
      }
    >
      <form id="employee-form" onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        {/* Photo */}
        <div className="flex items-center gap-4 sm:col-span-2">
          {preview ? (
            <img src={preview} alt="" className="h-20 w-20 rounded-full object-cover" />
          ) : employee?.id ? (
            <EmployeeAvatar employee={employee} className="h-20 w-20 text-xl" />
          ) : (
            <span className="grid h-20 w-20 place-items-center rounded-full bg-sunken text-subtle"><Camera className="h-7 w-7" aria-hidden /></span>
          )}
          <div>
            <input ref={photoInput} type="file" accept={PHOTO_TYPES} className="sr-only" onChange={(e) => setPhoto(e.target.files[0] || null)} />
            <Button size="sm" variant="secondary" icon={Camera} onClick={() => photoInput.current.click()}>
              {employee?.has_photo || photo ? t('employees.changePhoto') : t('employees.addPhoto')}
            </Button>
            <p className="mt-1 text-sm text-muted">{t('employees.photoHint')}</p>
            {err('photo') && <p className="text-sm font-medium text-danger" role="alert">{err('photo')}</p>}
          </div>
        </div>

        <Field label={t('employees.lastName')} error={err('last_name')}>
          <Input value={form.last_name} onChange={set('last_name')} autoFocus autoComplete="off" />
        </Field>
        <Field label={t('employees.firstName')} error={err('first_name')}>
          <Input value={form.first_name} onChange={set('first_name')} autoComplete="off" />
        </Field>
        <Field label={t('employees.position')} optional hint={t('employees.positionHint')}>
          <Input value={form.position} onChange={set('position')} />
        </Field>
        <Field label={t('clients.phone')} optional>
          <Input type="tel" value={form.phone} onChange={set('phone')} />
        </Field>
        <Field label={t('employees.hireDate')} error={err('hire_date')}>
          <Input type="date" value={form.hire_date} onChange={set('hire_date')} />
        </Field>
        <Field label={t('employees.endDate')} optional hint={t('employees.endDateHint')} error={err('end_date')}>
          <Input type="date" value={form.end_date} onChange={set('end_date')} />
        </Field>
        <Field label={t('employees.salary')} error={err('monthly_salary')}>
          <Input type="number" min="0" step="1000" suffix={t('common.currency')} value={form.monthly_salary} onChange={set('monthly_salary')} />
        </Field>

        {/* ID document */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold text-ink">{t('employees.idDocument')}</span>
          <input ref={docInput} type="file" accept={DOC_TYPES} className="sr-only" onChange={(e) => setIdDocument(e.target.files[0] || null)} />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" icon={Upload} onClick={() => docInput.current.click()}>
              {employee?.has_id_document || idDocument ? t('employees.replaceDocument') : t('employees.uploadDocument')}
            </Button>
            {idDocument ? (
              <span className="flex min-w-0 items-center gap-1.5 text-sm text-muted"><FileText className="h-4 w-4 shrink-0" aria-hidden /><span className="truncate">{idDocument.name}</span></span>
            ) : employee?.has_id_document ? (
              <span className="text-sm text-muted">{t('employees.documentOnFile')}</span>
            ) : null}
          </div>
          <p className="text-sm text-muted">{t('employees.documentHint')}</p>
          {err('id_document') && <p className="text-sm font-medium text-danger" role="alert">{err('id_document')}</p>}
        </div>

        <Field label={t('clients.notes')} optional className="sm:col-span-2">
          <Textarea value={form.notes} onChange={set('notes')} />
        </Field>
      </form>
    </Modal>
  )
}
