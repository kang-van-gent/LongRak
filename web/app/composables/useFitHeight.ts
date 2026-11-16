import type { Ref } from 'vue'

/**
 * Pinned scenes are exactly one viewport tall, so on short screens (small
 * phones, landscape phones) their content could be cut off. This scales the
 * `content` element down — never up — until it fits inside `box` (minus the
 * box's vertical padding). Re-runs whenever the box or the content resizes.
 *
 * The scale is applied to a wrapper that GSAP never animates, so it composes
 * with the scene's own transforms.
 */
export function useFitHeight(box: Ref<HTMLElement | null>, content: Ref<HTMLElement | null>, minScale = 0.6) {
  let ro: ResizeObserver | undefined

  const fit = () => {
    const b = box.value
    const c = content.value
    if (!b || !c) return
    const cs = getComputedStyle(b)
    const available = b.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
    const needed = c.offsetHeight // layout height, unaffected by transforms
    const scale = needed > available ? Math.max(minScale, available / needed) : 1
    c.style.transform = scale < 1 ? `scale(${scale.toFixed(4)})` : ''
    c.style.transformOrigin = 'center center'
  }

  onMounted(() => {
    fit()
    ro = new ResizeObserver(fit)
    if (box.value) ro.observe(box.value)
    if (content.value) ro.observe(content.value)
    document.fonts?.ready.then(fit)
  })
  onBeforeUnmount(() => ro?.disconnect())
}
