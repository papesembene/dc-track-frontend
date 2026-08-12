<script setup lang="ts">
defineProps<{
  title: string
  subtitle: string
  iconBgClass?: string
}>()
</script>

<template>
  <article class="group flex cursor-pointer items-center gap-4 rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-50/40 hover:shadow-md">
    <div :class="['flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105', iconBgClass ?? 'bg-orange-50']">
      <slot />
    </div>
    <div>
      <p class="text-sm font-bold text-gray-900">{{ title }}</p>
      <p class="mt-0.5 text-sm text-gray-500">{{ subtitle }}</p>
    </div>
    <svg class="ml-auto h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-[#F16E00]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  </article>
</template>
