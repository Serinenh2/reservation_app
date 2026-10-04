/**
 * Receipt ("Bon pour / وصل استلام"): the data, and the PDF / Word downloads.
 * Labels are bilingual like the paper form; values are in French.
 * The heavy libraries are loaded only when a download is clicked.
 */
import { amountInWords } from '@/lib/amountInWords'
import { formatMoney, formatTime, toISODate } from '@/lib/format'

const ddmmyyyy = (iso) => (iso ? iso.split('-').reverse().join('/') : '')

/** Everything printed on the receipt, from a reservation (+ the chosen amount). */
export function buildReceipt(r, amount, companyName) {
  const services = r.services.map((s) => (s.option_fr ? `${s.name_fr} (${s.option_fr})` : s.name_fr) + (s.quantity > 1 ? ` × ${s.quantity}` : ''))
  return {
    company: companyName || '',
    amount: formatMoney(amount, 'fr'),
    amountWords: amountInWords(amount),
    client: r.client.full_name,
    eventDate: ddmmyyyy(r.event_date),
    occasion: [r.event_type_fr, r.occasion_fr, ...services].filter(Boolean).join(' – '),
    men: r.guests_men || 0,
    children: r.guests_children || 0,
    women: r.guests_women || 0,
    start: formatTime(r.start_time),
    end: formatTime(r.end_time),
    issueDate: ddmmyyyy(toISODate(new Date())),
    fileName: `recu-${r.client.full_name.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}-${r.event_date}`,
  }
}

/** The rows of the form, in paper order: [French label, value, Arabic label]. */
export const receiptRows = (d) => [
  ['Mr / Mme', d.client, 'السيد(ة)'],
  ["La date d'événement", d.eventDate, 'تاريخ المناسبة'],
  ['Le montant en chiffre', d.amount, 'المبلغ بالأرقام (تسبيق)'],
  ['Le montant en lettre', d.amountWords, 'المبلغ بالأحرف'],
  ['Occasion', d.occasion, 'المناسبة'],
  ["Nombre d'invités", `Hommes : ${d.men}   ·   Femmes : ${d.women}${d.children ? `   ·   Enfants : ${d.children}` : ''}`, 'عدد الضيوف'],
  ['Horaire', `de ${d.start} à ${d.end}`, 'الوقت من ... إلى'],
]

export const RECEIPT_NOTE = 'ملاحظة : يعتبر هذا الإيصال دليلا على الدفع فقط.'

/**
 * PDF: the on-screen sheet is drawn by the browser (correct Arabic), then
 * put on one page. Receipt: A5 landscape; commitment: A4 portrait.
 */
export async function downloadPdf(element, fileName, { format = 'a5', orientation = 'landscape' } = {}) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
  // Scale 2.5 = about 240 dpi on A5: sharp when printed. JPEG keeps the file small.
  const canvas = await html2canvas(element, { scale: 2.5, backgroundColor: '#ffffff', useCORS: true })
  const pdf = new jsPDF({ orientation, unit: 'mm', format })
  const width = pdf.internal.pageSize.getWidth()
  const height = pdf.internal.pageSize.getHeight()
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, width, height)
  pdf.save(`${fileName}.pdf`)
}

/** Word (.docx): real text, editable before printing. Arabic cells are right-to-left. */
export async function downloadWord(d, fileName) {
  const {
    AlignmentType, BorderStyle, Document, Packer, PageOrientation, Paragraph, Table, TableCell, TableRow, TextRun, WidthType,
  } = await import('docx')

  const FONT = 'Arial' // has Arabic glyphs on every Windows computer
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  const noBorders = { top: none, bottom: none, left: none, right: none }
  const dotted = { ...noBorders, bottom: { style: BorderStyle.DOTTED, size: 6, color: '555555' } }

  const fr = (text, opts = {}) => new Paragraph({ children: [new TextRun({ text, font: FONT, size: 22, ...opts })] })
  const ar = (text, opts = {}) =>
    new Paragraph({ bidirectional: true, alignment: AlignmentType.RIGHT, children: [new TextRun({ text, font: FONT, size: 22, rightToLeft: true, ...opts })] })
  const cell = (children, width, borders = noBorders) =>
    new TableCell({ children: [children], width: { size: width, type: WidthType.PERCENTAGE }, borders, margins: { top: 90, bottom: 90 } })

  const line = (left, value, right, valueOpts = {}) =>
    new TableRow({ children: [cell(fr(`${left} :`, { bold: true }), 26), cell(fr(value, valueOpts), 48, dotted), cell(ar(`${right} :`, { bold: true }), 26)] })

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { ...noBorders, insideHorizontal: none, insideVertical: none },
    rows: [
      line('Bon pour', d.amount, 'وصل استلام', { bold: true, size: 28 }),
      ...receiptRows(d).map(([l, v, r]) => line(l, v, r)),
    ],
  })

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          // A5 given in portrait; the library swaps the sides for landscape.
          size: { orientation: PageOrientation.LANDSCAPE, width: 8391, height: 11906 },
          margin: { top: 567, bottom: 567, left: 709, right: 709 },
        },
      },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: d.company, font: FONT, size: 26, bold: true })] }),
        table,
        new Paragraph({ text: '' }),
        ar(RECEIPT_NOTE, { size: 20 }),
        new Paragraph({ spacing: { before: 200 }, children: [] }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: { ...noBorders, insideHorizontal: none, insideVertical: none },
          rows: [new TableRow({ children: [cell(fr(`Fait le ${d.issueDate}`, { size: 20 }), 50), cell(ar('الإدارة', { bold: true }), 50)] })],
        }),
        // Empty space under "الإدارة" for the stamp and signature (about 3.5 cm).
        new Paragraph({ spacing: { before: 1980 }, children: [] }),
      ],
    }],
  })

  saveDocx(await Packer.toBlob(doc), fileName)
}

export function saveDocx(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: `${fileName}.docx` })
  a.click()
  URL.revokeObjectURL(url)
}
