/**
 * Commitment document "تعهد و إلتزام" (A4, Arabic), filled from a
 * reservation and its client. Empty values print a dotted line to fill in
 * by hand. The text of the rules is the venue's paper form.
 */
import { formatTime } from '@/lib/format'
import { saveDocx } from './receipt'

const ddmmyyyy = (iso) => (iso ? iso.split('-').reverse().join('/') : '')
export const DOTS = '……………………'

export function buildEngagement(r, client, settings) {
  const women = r.guests_women || 0
  const men = r.guests_men || 0
  const children = r.guests_children || 0
  const time = `من ${formatTime(r.start_time)} إلى ${formatTime(r.end_time)}`
  const guests = women + men ? `نساء : ${women} / رجال : ${men}` : DOTS
  return {
    venue: settings?.company_name_ar || settings?.company_name || '',
    fields: [
      [['أنا الممضي أسفله السيد(ة)', client.full_name]],
      [['بطاقة التعريف رقم', client.id_card_number], ['الصادرة في', ddmmyyyy(client.id_card_issued_on)], ['بـ', client.id_card_issued_at]],
      [['العنوان', client.address], ['الهاتف', client.phone]],
      [['المناسبة', [r.event_type_ar, r.occasion_ar].filter(Boolean).join(' – ')], ['التاريخ', ddmmyyyy(r.event_date)]],
      [['العدد', women + men ? `${women + men} (${guests}${children ? ` / أطفال : ${children}` : ''})` : ''], ['الوقت', time]],
    ],
    // Rules 02 and 03 get the agreed values written in the parentheses.
    rules: [
      'ممنوع إستعمال الألعاب النارية والأسلحة داخل القاعة و خارجها (محيطها) (المفرقعات و البارود …)',
      `إحترام الوقت المتفق عليه (وقت الدخول و وقت الخروج من القاعة : ${time})`,
      `إحترام العدد المتفق عليه (عدد الضيوف نساء و رجال : ${guests})`,
      `احترام أعوان الامن والتنظيم (ركن السيارات والدراجات النارية ${DOTS})`,
      `المحافظة على العتاد ونظافة المكان (الكراسي / الطاولات / النباتات ${DOTS})`,
      `ممنوع في ساحة القاعة او موقف السيارات (موسيقى / غناء / الضجيج ${DOTS})`,
      `ممنوع كل نشاط داخل القاعة فيه نار او غاز مواد كيميائية (لهب … شموع … دخان ${DOTS})`,
      'يجب على الضيوف مراقبة أولادهم و تحمل مسؤولية تصرفاتهم',
      `احترام عدد الأطفال المتفق عليه مسبقا (${children ? `العدد : ${children}` : DOTS})`,
      'جميع الحلويات يجب ان تكون في علب صغيرة',
      'التصريح بكل الخدمات و البرنامج قبل يوم المناسبة بـ 10 أيام (فوتوغراف … زرنة … ماشطة …)',
      'على الزبون تسديد كل المبلغ المتبقى قبل 10 أيام من يوم المناسبة',
    ],
    notes: [
      'في حالة الغاء او تأجيل المناسبة يجب إعلام الإدارة قبل 20 يوم من تاريخ المناسبة',
      'يحق للإدارة الغاء بعض الخدمات في حالة عدم إلتزام الزبون و الضيوف بهذه الشروط',
    ],
    fileName: `engagement-${client.full_name.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}-${r.event_date}`,
  }
}

export const intro = (venue) => `أنا الممضي أسفله أتعهد و ألتزم باحترام شروط و قوانين قاعة الأفراح والمناسبات ${venue}`
export const num = (i) => String(i + 1).padStart(2, '0')

/** Word (.docx), A4 portrait, right-to-left. */
export async function downloadEngagementWord(d) {
  const { AlignmentType, BorderStyle, Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, UnderlineType, WidthType } = await import('docx')
  const FONT = 'Arial'
  const run = (text, opts = {}) => new TextRun({ text, font: FONT, size: 24, rightToLeft: true, ...opts })
  // Latin values (address, phone, name) are wrapped in invisible left-to-right
  // marks (LRE … PDF) so Word keeps "12 rue …" and "0550 12 34 56" in order.
  const isArabic = (text) => /[\u0600-\u06FF]/.test(text)
  const value = (text) => {
    if (!text) return run(DOTS)
    const shown = isArabic(text) ? text : `\u202A${text}\u202C`
    return run(` ${shown} `, { underline: { type: UnderlineType.DOTTED }, rightToLeft: isArabic(text) })
  }
  const para = (children, opts = {}) => new Paragraph({ bidirectional: true, alignment: AlignmentType.RIGHT, spacing: { after: 120 }, children, ...opts })

  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
  const signatures = () =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
      rows: [new TableRow({
        height: { value: 1900, rule: 'atLeast' }, // about 3.3 cm for signatures and stamp
        // Cells left to right: management on the left, client on the right.
        children: ['الإدارة', 'إمضاء الزبون'].map((label) =>
          new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, children: [para([run(label, { bold: true })], { alignment: AlignmentType.CENTER })] }),
        ),
      })],
    })

  const fieldLines = d.fields.map((line) =>
    para(line.flatMap(([label, v], i) => [run(`${i ? '   /   ' : ''}${label} : `, { bold: true }), value(v)])),
  )

  const doc = new Document({
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 850, bottom: 850, left: 1000, right: 1000 } } }, // A4
      children: [
        para([run('تعهد و إلتزام', { bold: true, size: 40, underline: { type: UnderlineType.SINGLE } })], { alignment: AlignmentType.CENTER, spacing: { after: 360 } }),
        ...fieldLines,
        para([run(intro(d.venue), { bold: true, size: 26 })], { alignment: AlignmentType.CENTER, spacing: { before: 240, after: 240 } }),
        ...d.rules.map((rule, i) => para([run(`${num(i)}. ${rule}`)], { spacing: { after: 80 } })),
        para([run('ملاحظة هامة :', { bold: true, size: 28, color: '9B2C4A' })], { spacing: { before: 280, after: 120 } }),
        ...d.notes.map((note, i) => para([run(`${num(i)}. ${note}`, { bold: true })], { spacing: { after: 80 } })),
        para([run('تقبلوا منا كل الاحترام و التقدير')], { alignment: AlignmentType.CENTER, spacing: { before: 400, after: 240 } }),
        // Signatures: client on the right, management on the left, with room below.
        signatures(),
      ],
    }],
  })
  saveDocx(await Packer.toBlob(doc), d.fileName)
}
