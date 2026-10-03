/**
 * Internationalization (i18n).
 * All visible text lives in locales/fr.json and locales/ar.json.
 * In a component:  const { t } = useTranslation();  t('nav.calendar')
 * Never write French or Arabic text directly inside components.
 */
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import fr from './locales/fr.json'
import ar from './locales/ar.json'

export const LANGUAGES = {
  fr: { dir: 'ltr', locale: 'fr-DZ' },
  ar: { dir: 'rtl', locale: 'ar-DZ' },
}

const saved = (() => {
  try {
    return localStorage.getItem('lang')
  } catch {
    return null
  }
})()

i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr }, ar: { translation: ar } },
  lng: saved && LANGUAGES[saved] ? saved : 'fr',
  fallbackLng: 'fr',
  interpolation: { escapeValue: false }, // React already escapes
})

/** Keeps <html lang dir> in sync so the whole layout flips for Arabic. */
function applyDocumentLanguage(lng) {
  const conf = LANGUAGES[lng] || LANGUAGES.fr
  document.documentElement.lang = lng
  document.documentElement.dir = conf.dir
  try {
    localStorage.setItem('lang', lng)
  } catch {
    /* storage unavailable: language just won't be remembered */
  }
}

applyDocumentLanguage(i18n.language)
i18n.on('languageChanged', applyDocumentLanguage)

export default i18n
