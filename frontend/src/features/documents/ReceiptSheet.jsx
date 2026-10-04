import { forwardRef } from 'react'
import { RECEIPT_NOTE, receiptRows } from './receipt'

/**
 * The receipt exactly as printed: A5 landscape (794 × 561 px at 96 dpi).
 * Fixed colors and fonts on purpose (paper, not the app theme). This element
 * is also what the PDF captures.
 */
const ReceiptSheet = forwardRef(function ReceiptSheet({ data }, ref) {
  const latin = { fontFamily: "'Manrope Variable', 'IBM Plex Sans Arabic', Arial, sans-serif" } // Arabic fallback for Arabic client names
  const arabic = { fontFamily: "'IBM Plex Sans Arabic', Arial, sans-serif" }
  const Row = ({ left, value, right, big }) => (
    <div style={{ display: 'grid', gridTemplateColumns: '170px 1fr 170px', alignItems: 'end', gap: 12, padding: '5px 0' }}>
      <span style={{ ...latin, fontWeight: 700, fontSize: 13 }}>{left} :</span>
      <span
        style={{
          ...latin,
          borderBottom: '1.5px dotted #555',
          padding: '0 6px 5px',
          fontSize: big ? 18 : 14,
          fontWeight: big ? 800 : 500,
          minHeight: 22,
          overflowWrap: 'anywhere',
        }}
      >
        {value}
      </span>
      <span dir="rtl" style={{ ...arabic, fontWeight: 700, fontSize: 14, textAlign: 'right' }}>{right} :</span>
    </div>
  )

  return (
    <div
      ref={ref}
      dir="ltr"
      style={{ width: 794, height: 561, background: '#fff', color: '#111', padding: '24px 40px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}
    >
      {data.company && <p style={{ ...latin, textAlign: 'center', fontWeight: 800, fontSize: 16, margin: '0 0 6px' }}>{data.company}</p>}
      <Row left="Bon pour" value={data.amount} right="وصل استلام" big />
      <div style={{ height: 4 }} />
      {receiptRows(data).map(([left, value, right]) => (
        <Row key={left} left={left} value={value} right={right} />
      ))}
      <p dir="rtl" style={{ ...arabic, fontSize: 13, margin: '10px 0 8px', textAlign: 'right' }}>{RECEIPT_NOTE}</p>
      {/* Footer takes all the remaining height: empty space under "الإدارة" for the stamp and signature. */}
      <div style={{ flex: 1, minHeight: 130, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ ...latin, fontSize: 12, color: '#444' }}>Fait le {data.issueDate}</span>
        <span dir="rtl" style={{ ...arabic, fontWeight: 700, fontSize: 15, width: 220, textAlign: 'center' }}>الإدارة</span>
      </div>
    </div>
  )
})

export default ReceiptSheet
