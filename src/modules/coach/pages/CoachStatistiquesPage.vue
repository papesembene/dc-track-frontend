<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CoachLayout from '@/modules/coach/layouts/CoachLayout.vue'
import {
  getCoachStatistiques,
  type CoachPromotionOption,
  type CoachStatistiques,
} from '@/modules/coach/api/coach.api'
import PageLoadingState from '@/shared/components/PageLoadingState.vue'

const loading = ref(true)
const hasLoaded = ref(false)
const error = ref<string | null>(null)
const selectedPromotionId = ref('')
const stats = ref<CoachStatistiques | null>(null)

const promotions = computed<CoachPromotionOption[]>(() => {
  return stats.value?.scope.availablePromotions ?? []
})

const activePromotion = computed(() => {
  return promotions.value.find((promotion) => promotion.estActive) ?? null
})

const statutRows = computed(() => {
  if (!stats.value) return []

  return [
    { label: 'En emploi', value: stats.value.parStatut.EN_EMPLOI, color: 'bg-emerald-500' },
    { label: 'En stage', value: stats.value.parStatut.EN_STAGE, color: 'bg-[#009682]' },
    { label: 'Recherche', value: stats.value.parStatut.RECHERCHE_EMPLOI, color: 'bg-amber-400' },
    { label: 'Projet perso', value: stats.value.parStatut.PROJET_PERSO, color: 'bg-[#F16E00]' },
    { label: 'Études', value: stats.value.parStatut.POURSUITE_ETUDES, color: 'bg-slate-500' },
  ]
})

const maxValue = computed(() => Math.max(...statutRows.value.map((row) => row.value), 1))

const barWidth = (value: number) => {
  // Une valeur nulle doit produire une barre vide, pas une largeur minimale artificielle.
  if (value <= 0 || maxValue.value <= 0) return '0%'

  return `${Math.max(5, Math.round((value / maxValue.value) * 100))}%`
}

async function loadStats() {
  loading.value = true
  error.value = null

  try {
    const data = await getCoachStatistiques({
      promotionId: selectedPromotionId.value || undefined,
    })
    stats.value = data
    selectedPromotionId.value = data.scope.selectedPromotion?.id ?? selectedPromotionId.value
  } catch (e: any) {
    error.value = e.message || 'Erreur lors du chargement des statistiques coach'
  } finally {
    loading.value = false
    hasLoaded.value = true
  }
}

onMounted(loadStats)
</script>

<template>
  <CoachLayout title="Statistiques (Coach)" active-menu="statistiques">
    <div class="space-y-5">
      <div v-if="error" class="rounded-2xl bg-red-50 p-4 text-red-600">
        {{ error }}
      </div>

      <div v-if="!hasLoaded" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <PageLoadingState compact message="Chargement du périmètre coach..." />
      </div>

      <div v-else class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-sm font-semibold text-slate-900">
              Référentiel : {{ stats?.scope.referentiel.nom || '—' }}
            </p>
            <p class="mt-1 text-sm text-slate-500">
              Les statistiques restent limitées au référentiel du coach et à la promotion consultée.
            </p>
            <div
              class="mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
              :class="
                activePromotion
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              "
            >
              <span
                class="h-2 w-2 rounded-full"
                :class="activePromotion ? 'bg-emerald-500' : 'bg-amber-500'"
              ></span>
              {{
                loading
                  ? 'Chargement de la promotion active...'
                  : activePromotion
                    ? `Promotion active : ${activePromotion.nom} (${activePromotion.annee})`
                    : 'Aucune promotion active détectée'
              }}
            </div>
          </div>

          <div class="w-full max-w-xs">
            <label class="mb-2 block text-sm font-medium text-slate-700">Promotion consultée</label>
            <select
              v-model="selectedPromotionId"
              class="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-orange-400"
              @change="loadStats"
            >
              <option v-if="promotions.length === 0" value="">
                {{ loading ? 'Chargement des promotions...' : 'Aucune promotion disponible' }}
              </option>
              <option v-for="promotion in promotions" :key="promotion.id" :value="promotion.id">
                {{ promotion.nom }} ({{ promotion.annee }}){{ promotion.estActive ? ' · Active' : '' }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <div v-if="loading" class="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <PageLoadingState compact message="Chargement des statistiques..." />
      </div>

      <template v-else-if="stats">
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs uppercase tracking-wide text-slate-400">Apprenants</p>
            <p class="mt-2 text-3xl font-bold text-slate-900">{{ stats.totalApprenants }}</p>
          </article>
          <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs uppercase tracking-wide text-slate-400">Situations</p>
            <p class="mt-2 text-3xl font-bold text-slate-900">{{ stats.totalSituations }}</p>
          </article>
          <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs uppercase tracking-wide text-slate-400">Validées</p>
            <p class="mt-2 text-3xl font-bold text-emerald-600">{{ stats.validees }}</p>
          </article>
          <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs uppercase tracking-wide text-slate-400">Taux d'insertion</p>
            <p class="mt-2 text-3xl font-bold text-orange-500">{{ stats.tauxInsertion }}%</p>
          </article>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 class="text-base font-bold text-slate-900">Répartition par statut</h2>
          <div class="mt-5 space-y-4">
            <div v-for="row in statutRows" :key="row.label">
              <div class="mb-1 flex items-center justify-between text-sm">
                <span class="font-medium text-slate-700">{{ row.label }}</span>
                <span class="text-slate-500">{{ row.value }}</span>
              </div>
              <div class="h-2 rounded-full bg-slate-100">
                <div :class="['h-2 rounded-full', row.color]" :style="{ width: barWidth(row.value) }"></div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </CoachLayout>
</template>
