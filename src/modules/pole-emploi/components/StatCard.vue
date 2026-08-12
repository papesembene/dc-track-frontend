<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  valueClass?: string
  iconBgClass?: string
}>()
</script>

<template>
  <article class="group relative overflow-hidden rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-100 hover:shadow-md">
    <span class="absolute inset-x-0 top-0 h-1 bg-[#F16E00] opacity-0 transition-opacity duration-200 group-hover:opacity-100"></span>
    <div class="flex items-center justify-between gap-4">
    <div>
      <p class="text-xs font-semibold uppercase tracking-wide text-gray-500">{{ label }}</p>
      <p :class="['mt-1.5 text-3xl font-bold', valueClass ?? 'text-gray-900']">{{ value }}</p>
    </div>
    <div :class="['flex h-11 w-11 shrink-0 items-center justify-center rounded-lg', iconBgClass ?? 'bg-gray-100']">
      <slot />
    </div>
    </div>
  </article>
</template>
