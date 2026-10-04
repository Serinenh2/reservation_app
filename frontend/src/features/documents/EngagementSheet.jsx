import { forwardRef } from 'react'
import { intro, num } from './engagement'

/**
 * "تعهد و إلتزام" as printed: A4 portrait (794 × 1123 px at 96 dpi), right-to-left.
 * Fixed colors and fonts (paper, not the app theme); the PDF captures this element.
 */
const EngagementSheet = forwardRef(function EngagementSheet({ data }, ref) {
  const font = { fontFamily: "'IBM Plex Sans Arabic', 'Manrope Variable', Arial, sans-serif" }

  // A filled value on a dotted line; an empty one is just the dotted line.
  // dir="auto" + isolate: a French address or a phone number keeps its own order inside the Arabic line.
  const Value = ({ children, grow }) => (
    <span style={{ flex: grow ? 1 : '0 1 auto', minWidth: 110, borderBottom: '1.5px dotted #555', padding: '0 6px 3px', fontWeight: 500, textAlign: 'right' }}>
      <bdi dir="auto" style={{ unicodeBidi: 'isolate' }}>{children || '\u00a0'}</bdi>
    </span>
  )

  return (
    <div
      ref={ref}
      dir="rtl"
      style={{ ...font, width: 794, height: 1123, background: '#fff', color: '#111', padding: '48px 56px', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', fontSize: 15, lineHeight: 1.6 }}
    >
      <h1 style={{ textAlign: 'center', fontSize: 30, fontWeight: 700, margin: '0 0 26px', textDecoration: 'underline', textUnderlineOffset: 8 }}>تعهد و إلتزام</h1>

      {data.fields.map((line, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-end', gap: 10, margin: '0 0 12px' }}>
          {line.map(([label, value], j) => (
            <span key={label} style={{ display: 'flex', alignItems: 'flex-end', gap: 8, flex: j === 0 ? 1.4 : 1, minWidth: 0 }}>
              {j > 0 && <span style={{ color: '#666' }}>/</span>}
              <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{label} :</span>
              <Value grow>{value}</Value>
            </span>
          ))}
        </div>
      ))}

      <p style={{ textAlign: 'center', fontWeight: 700, fontSize: 17, margin: '22px 0 16px' }}>{intro(data.venue)}</p>

      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {data.rules.map((rule, i) => (
          <li key={i} style={{ display: 'flex', gap: 8, margin: '0 0 5px' }}>
            <span style={{ fontWeight: 700, minWidth: 26 }}>{num(i)}.</span>
            <span>{rule}</span>
          </li>
        ))}
      </ol>

      <p style={{ fontWeight: 700, fontSize: 19, color: '#9b2c4a', margin: '18px 0 6px' }}>ملاحظة هامة :</p>
      {data.notes.map((note, i) => (
        <p key={i} style={{ display: 'flex', gap: 8, margin: '0 0 4px', fontWeight: 600 }}>
          <span style={{ minWidth: 26 }}>{num(i)}.</span>
          <span>{note}</span>
        </p>
      ))}

      <p style={{ textAlign: 'center', margin: '22px 0 0' }}>تقبلوا منا كل الاحترام و التقدير</p>

      {/* Signatures: client (right) and management (left); the remaining height is left empty for them. */}
      <div style={{ flex: 1, minHeight: 140, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 18 }}>
        <span style={{ fontWeight: 700, width: 220, textAlign: 'center' }}>إمضاء الزبون</span>
        <span style={{ fontWeight: 700, width: 220, textAlign: 'center' }}>الإدارة</span>
      </div>
    </div>
  )
})

export default EngagementSheet
