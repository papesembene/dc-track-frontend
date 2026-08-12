<script setup lang="ts">
export interface BreakdownItem {
  label: string
  count: number
  unit: string
  colorClass: string
}

const props = defineProps<{
  title: string
  items: BreakdownItem[]
}>()

const maxCount = Math.max(...props.items.map(i => i.count))

const barWidth = (count: number) => `${Math.round((count / maxCount) * 100)}%`
</script>

<template>
  <div class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
    <h3 class="mb-4 text-base font-bold text-gray-900">{{ title }}</h3>
    <div class="mb-5 border-t border-gray-100"></div>
    <div class="space-y-5">
      <div v-for="item in items" :key="item.label">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-semibold text-gray-800">{{ item.label }}</span>
          <span class="text-sm text-gray-400">{{ item.count }} {{ item.unit }}</span>
        </div>
        <div class="h-2 w-full rounded-full bg-slate-100">
          <div
            :class="['h-2 rounded-full transition-all duration-500', item.colorClass]"
            :style="{ width: barWidth(item.count) }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>
