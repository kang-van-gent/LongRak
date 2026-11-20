import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { Ref } from 'vue'

export interface SceneContext {
  isMobile: boolean
}

/**
 * Builds a section's GSAP animations inside a scoped gsap.matchMedia().
 * - Selector strings inside `build` are scoped to the section root.
 * - Runs only when the user has not requested reduced motion; otherwise the
 *   section stays in its natural, fully visible state.
 * - Everything (tweens, ScrollTriggers, pins) is reverted on unmount.
 */
export function useScene(
  root: Ref<HTMLElement | null>,
  build: (el: HTMLElement, ctx: SceneContext) => void | (() => void),
) {
  let mm: gsap.MatchMedia | undefined

  onMounted(() => {
    const el = root.value
    if (!el) return
    mm = gsap.matchMedia(el)
    mm.add(
      {
        motion: '(prefers-reduced-motion: no-preference)',
        mobile: '(max-width: 767px)',
      },
      (c) => {
        const { motion, mobile } = c.conditions as { motion: boolean; mobile: boolean }
        if (!motion) return
        return build(el, { isMobile: mobile })
      },
    )
  })

  onBeforeUnmount(() => mm?.revert())
}

/**
 * A scrubbed timeline spanning the element's full pass through the viewport,
 * so a section animates IN as it arrives and OUT as it leaves (scrub: true both ways).
 */
export function inOutTimeline(trigger: Element | string, start = 'top 92%', end = 'bottom 8%') {
  return gsap.timeline({
    scrollTrigger: { trigger, start, end, scrub: true },
  })
}

/**
 * Smooth anchor scrolling through Lenis when available.
 * Pinned sections are targeted at their pin start. A section can also set
 * `data-anchor-progress="0.7"` to land at that point of its pinned timeline
 * instead (i.e. with the content already revealed).
 */
export function useSmoothScroll() {
  const { $lenis } = useNuxtApp()
  return (target: string, opts: { immediate?: boolean; offset?: number } = {}) => {
    const el = document.querySelector<HTMLElement>(target)
    if (!el) return
    const lenis = $lenis as { scrollTo: (t: HTMLElement | number, o?: object) => void; resize: () => void } | null
    // after a page change Lenis may still hold the previous page's height (and clamp to it)
    lenis?.resize()

    let dest: HTMLElement | number = el
    // A pinned section's element no longer sits where its scene begins once you have
    // scrolled past it (it rests at the END of its pin range, already animated out),
    // so always aim at the pin's start, plus an optional data-anchor-progress offset.
    const st = ScrollTrigger.getAll().find((t) => t.trigger === el && t.pin)
    if (st) {
      const progress = Number.parseFloat(el.dataset.anchorProgress ?? '0') || 0
      dest = st.start + (st.end - st.start) * progress
    }
    // The page top is always 0 — never "slightly below" because of rounding/offsets
    if (target === '#top') dest = 0

    const behavior = opts.immediate ? 'instant' : 'smooth'
    if (lenis) lenis.scrollTo(dest, opts.immediate ? { immediate: true, force: true } : { offset: opts.offset ?? 0, duration: 1.8 })
    else if (typeof dest === 'number') window.scrollTo({ top: dest, behavior })
    else dest.scrollIntoView({ behavior })
    history.replaceState(null, '', target)
  }
}
