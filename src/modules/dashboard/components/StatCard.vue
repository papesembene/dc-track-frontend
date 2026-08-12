<script setup lang="ts">
defineProps<{
  label: string
  value: string
  iconBg: string
  valueClass?: string
  subtitle?: string
  subtitleClass?: string
}>()
</script>

<template>
  <article class="group relative overflow-hidden rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-100 hover:shadow-md">
    <span class="absolute inset-x-0 top-0 h-1 bg-[#F16E00] opacity-0 transition-opacity duration-200 group-hover:opacity-100"></span>
    <div class="flex items-start justify-between gap-4">
      <div class="min-w-0">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-500">{{ label }}</p>
        <p :class="['mt-2 text-3xl font-bold leading-none tracking-tight', valueClass || 'text-gray-900']">{{ value }}</p>
        <p v-if="subtitle" :class="['mt-2 flex items-center gap-1 text-xs font-medium', subtitleClass || 'text-emerald-600']">{{ subtitle }}</p>
      </div>
      <div :class="['flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105', iconBg]">
        <slot name="icon" />
      </div>
    </div>
  </article>
</template>
