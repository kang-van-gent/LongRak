<script setup lang="ts">
import { humbleicons, type HumbleIconName } from '~/utils/humbleicons'

/**
 * Inline Humbleicons SVG. Inline (not <img>) so paths can be animated:
 * DrawSVG on scroll, CSS micro-animations on hover.
 */
const props = withDefaults(
  defineProps<{
    name: HumbleIconName
    size?: number | string
    stroke?: number
  }>(),
  { size: 24, stroke: 2 },
)

const body = computed(() => humbleicons[props.name])
</script>

<template>
  <svg
    class="hicon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
    :style="{ '--icon-stroke': stroke }"
    v-html="body"
  />
</template>
