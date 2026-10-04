import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ExternalLink, FileText, Trash2 } from 'lucide-react'
import { useAuthedFile } from '@/lib/useAuthedFile'
import { Button, Card, ConfirmDialog, useToast } from '@/components/ui'

/**
 * A private ID document (client or employee): image preview or PDF link,
 * loaded with the login token. Shared by the client and employee pages.
 *   path      API path of the file, e.g. /clients/12/id-document/
 *   type      'pdf' | 'image' | null (null = no document)
 *   version   changes when the file changes (reloads the preview)
 *   onUpload  opens the form to add one
 *   onRemove  returns a promise that deletes it
 */
export default function IdDocumentCard({ path, type, version, onUpload, onRemove, removing }) {
  const { t } = useTranslation()
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)
  const url = useAuthedFile(type ? path : null, version)

  return (
    <Card>
      <Card.Header
        title={t('employees.idDocument')}
        actions={type && <Button size="sm" variant="ghost" icon={Trash2} aria-label={t('employees.removeDocument')} onClick={() => setConfirming(true)} />}
      />
      <div className="p-5">
        {!type ? (
          <div className="text-center">
            <p className="text-base text-muted">{t('employees.noDocument')}</p>
            <Button size="sm" variant="secondary" className="mt-3" onClick={onUpload}>{t('employees.uploadDocument')}</Button>
          </div>
        ) : !url ? (
          <div className="h-32 animate-pulse rounded-control bg-sunken" />
        ) : type === 'pdf' ? (
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
        loading={removing}
        onConfirm={() =>
          onRemove()
            .then(() => toast.success(t('employees.documentRemoved')))
            .catch(() => toast.error(t('errors.generic')))
            .finally(() => setConfirming(false))
        }
        title={t('employees.removeDocumentTitle')}
        description={t('employees.removeDocumentText')}
        confirmLabel={t('employees.removeDocument')}
        cancelLabel={t('employees.keepDocument')}
      />
    </Card>
  )
}
