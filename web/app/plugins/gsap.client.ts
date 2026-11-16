import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import Lenis from 'lenis'

/**
 * Registers GSAP plugins and wires Lenis smooth scrolling into ScrollTrigger.
 * Lenis is skipped entirely for users who prefer reduced motion.
 */
export default defineNuxtPlugin(() => {
  gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, ScrambleTextPlugin)

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  let lenis: Lenis | null = null

  if (!reduceMotion) {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true })
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add((time) => lenis?.raf(time * 1000))
    gsap.ticker.lagSmoothing(0)
  }

  // Webfonts change line heights — recalculate trigger positions once they land
  document.fonts?.ready.then(() => ScrollTrigger.refresh())
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true })

  return { provide: { lenis } }
})
