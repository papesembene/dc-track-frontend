<script setup lang="ts">
defineProps<{
  icon: 'graduation' | 'briefcase' | 'check' | 'trend'
  value: string
  label: string
  iconBg: string
  iconColor: string
}>()
</script>

<template>
  <article class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-orange-100 hover:shadow-md">
    <div :class="['mb-5 flex h-11 w-11 items-center justify-center rounded-lg', iconBg]">
      <!-- graduation cap -->
      <svg v-if="icon === 'graduation'" :class="['h-5 w-5', iconColor]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
        <path d="M6 12v5c3 3 9 3 12 0v-5"/>
      </svg>
      <!-- briefcase -->
      <svg v-else-if="icon === 'briefcase'" :class="['h-5 w-5', iconColor]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/>
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
      </svg>
      <!-- check circle -->
      <svg v-else-if="icon === 'check'" :class="['h-5 w-5', iconColor]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <polyline points="9 12 11.5 14.5 15.5 10"/>
      </svg>
      <!-- trend chart -->
      <svg v-else :class="['h-5 w-5', iconColor]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="4 4 4 20 20 20"/>
        <polyline points="7 14 11 10 14 13 19 7"/>
      </svg>
    </div>
    <p class="text-3xl font-bold text-gray-900">{{ value }}</p>
    <p class="mt-1 text-sm text-gray-500">{{ label }}</p>
  </article>
</template>
