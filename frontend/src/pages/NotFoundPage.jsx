import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Compass } from 'lucide-react'
import { Card, EmptyState } from '@/components/ui'

export default function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <Card>
      <EmptyState
        icon={Compass}
        title={t('notFound.title')}
        description={t('notFound.text')}
        action={<Link to="/" className="font-semibold text-brand underline-offset-4 hover:underline dark:text-gold">{t('notFound.home')}</Link>}
      />
    </Card>
  )
}
