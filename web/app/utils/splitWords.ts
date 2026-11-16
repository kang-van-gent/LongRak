/**
 * Splits an element's text into word <span>s for scroll-lit text.
 * Thai has no spaces between words, so Intl.Segmenter('th') is used to find
 * word boundaries. Child elements (e.g. <em data-hl>) are preserved and their
 * words get the extra `hl` class. Screen readers get the original text.
 * Returns the word spans and a restore() that puts the original markup back.
 */
export function splitWords(el: HTMLElement) {
  const original = el.innerHTML
  const plain = el.textContent ?? ''
  const segmenter =
    typeof Intl !== 'undefined' && 'Segmenter' in Intl
      ? new Intl.Segmenter(document.documentElement.lang || 'th', { granularity: 'word' })
      : null

  const segments = (text: string) =>
    segmenter ? Array.from(segmenter.segment(text), (s) => s.segment) : text.split(/(\s+)/)

  const words: HTMLSpanElement[] = []
  const visual = document.createElement('span')
  visual.setAttribute('aria-hidden', 'true')

  const append = (text: string, highlight: boolean) => {
    for (const part of segments(text)) {
      if (!part) continue
      if (/^\s+$/.test(part)) {
        visual.append(document.createTextNode(part))
        continue
      }
      const span = document.createElement('span')
      span.className = highlight ? 'w hl' : 'w'
      span.textContent = part
      visual.append(span)
      words.push(span)
    }
  }

  el.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) append(node.textContent ?? '', false)
    else if (node instanceof HTMLElement) append(node.textContent ?? '', node.hasAttribute('data-hl'))
  })

  const sr = document.createElement('span')
  sr.className = 'sr-only'
  sr.textContent = plain

  el.replaceChildren(sr, visual)

  return {
    words,
    restore: () => {
      el.innerHTML = original
    },
  }
}
