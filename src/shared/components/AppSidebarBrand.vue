<script setup lang="ts">
import { computed, toRefs } from "vue"

const props = defineProps<{
  compact?: boolean
  light?: boolean
}>()

const { compact } = toRefs(props)

const logoSrc = computed(() =>
  compact.value
    ? "/sonatel-icon.svg"
    : "https://res.cloudinary.com/drxouwbms/image/upload/v1743507686/image_27_qtiin4.png",
)
</script>

<template>
  <div class="flex items-center justify-center">
    <img
      :src="logoSrc"
      alt="Orange Digital Center - Sonatel"
      :class="compact ? 'h-9 w-9' : 'h-12 w-auto'"
      class="shrink-0 object-contain"
    />
  </div>
</template>
