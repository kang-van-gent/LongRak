export type Locale = 'th' | 'en'

/**
 * Co-located copy for a component: pass the Thai and English versions of the
 * same shape and get back the one for the current locale.
 * Keeping copy beside the markup keeps the emphasised (coloured) fragments of
 * headings easy to edit without HTML-in-JSON.
 */
export function useCopy<T>(dict: Record<Locale, T>) {
  const { locale } = useI18n()
  return computed<T>(() => dict[locale.value as Locale] ?? dict.th)
}
