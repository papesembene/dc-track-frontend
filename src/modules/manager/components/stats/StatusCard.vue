<script setup lang="ts">
defineProps<{
  count: number
  label: string
  percentage: number
  color: 'blue' | 'orange' | 'green'
}>()

const colorMap = {
  blue:   { text: 'text-[#009682]',  bar: 'bg-[#009682]',  track: 'bg-teal-100' },
  orange: { text: 'text-[#F16E00]',  bar: 'bg-[#F16E00]',  track: 'bg-orange-100' },
  green:  { text: 'text-[#009682]',  bar: 'bg-[#009682]',  track: 'bg-teal-100' },
}
</script>

<template>
  <article class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
    <p :class="['text-4xl font-bold mb-1', colorMap[color].text]">{{ count }}</p>
    <p class="mb-4 text-sm font-medium text-gray-600">{{ label }}</p>
    <div :class="['h-1.5 w-full rounded-full', colorMap[color].track]">
      <div
        :class="['h-1.5 rounded-full transition-all duration-500', colorMap[color].bar]"
        :style="{ width: percentage + '%' }"
      ></div>
    </div>
    <p class="mt-2 text-xs text-gray-400">{{ percentage }}% du total</p>
  </article>
</template>
