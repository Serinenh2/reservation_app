import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, UserRound } from 'lucide-react'
import { formatDate, formatMoney, formatNumber, toISODate } from '@/lib/format'
import { Badge, Button, Card, EmptyState, PageHeader, Segmented, Spinner, Table } from '@/components/ui'
import EmployeeFormModal from './EmployeeFormModal'
import { useEmployees } from './api'
import { EmployeeAvatar, isCurrent, useSeniorityText } from './shared'

export default function EmployeesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const seniorityText = useSeniorityText()
  const [status, setStatus] = useState('current')
  const [adding, setAdding] = useState(false)
  const month = toISODate(new Date()).slice(0, 7) // absences of the current month
  const { data = [], isLoading } = useEmployees({ status, month })

  const columns = [
    {
      key: 'name',
      header: t('employees.name'),
      render: (e) => (
        <div className="flex items-center gap-3">
          <EmployeeAvatar employee={e} className="h-10 w-10 text-sm" />
          <div className="min-w-0">
            <p className="truncate font-semibold">{e.full_name}</p>
            <p className="truncate text-sm text-muted">{e.position || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'hire_date',
      header: t('employees.hireDate'),
      render: (e) => (
        <div>
          <p>{formatDate(e.hire_date, { dateStyle: 'medium' })}</p>
          <p className="text-sm text-muted">{seniorityText(e.hire_date, e.end_date)}</p>
        </div>
      ),
    },
    {
      key: 'absences',
      header: t('employees.absencesThisMonth'),
      align: 'end',
      render: (e) => (
        <span className={e.absences_in_month ? 'font-semibold text-warning' : 'text-muted'}>{formatNumber(e.absences_in_month || 0)}</span>
      ),
    },
    { key: 'salary', header: t('employees.salary'), align: 'end', render: (e) => formatMoney(e.monthly_salary) },
    {
      key: 'status',
      header: t('common.status'),
      render: (e) => <Badge tone={isCurrent(e) ? 'brand' : 'neutral'}>{t(isCurrent(e) ? 'employees.current' : 'employees.former')}</Badge>,
    },
  ]

  return (
    <>
      <PageHeader
        title={t('employees.title')}
        description={t('employees.subtitle')}
        actions={<Button icon={Plus} onClick={() => setAdding(true)}>{t('employees.new')}</Button>}
      />
      <Card>
        <div className="border-b border-line p-4">
          <Segmented
            label={t('common.status')}
            options={[['current', t('employees.currentPlural')], ['former', t('employees.formerPlural')], ['', t('reservations.allStatuses')]]}
            value={status}
            onChange={setStatus}
          />
        </div>
        {isLoading ? (
          <div className="grid place-items-center py-16 text-gold"><Spinner className="h-6 w-6" /></div>
        ) : (
          <Table
            caption={t('employees.title')}
            columns={columns}
            rows={data}
            onRowClick={(e) => navigate(`/employees/${e.id}`)}
            empty={
              <EmptyState
                icon={UserRound}
                title={t('employees.empty')}
                description={t('employees.emptyText')}
                action={<Button icon={Plus} onClick={() => setAdding(true)}>{t('employees.new')}</Button>}
              />
            }
          />
        )}
      </Card>
      <EmployeeFormModal open={adding} onClose={() => setAdding(false)} onSaved={(e) => navigate(`/employees/${e.id}`)} />
    </>
  )
}
