<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import ManagerLayout from '@/modules/manager/layouts/ManagerLayout.vue'
import { getStatistiques, type StatistiquesGlobales } from '@/modules/manager/api/statistiques.api'
import {
  getPromotions,
  type PromotionItem,
  type PromotionWithReferentiels,
} from '@/modules/manager/api/promotions.api'
import PageLoadingState from '@/shared/components/PageLoadingState.vue'

type Segment = { label: string; value: number; color: string; bg: string }

// État
const stats = ref<StatistiquesGlobales | null>(null)
const activePromotion = ref<PromotionWithReferentiels | null>(null)
const promotionOptions = ref<PromotionItem[]>([])
const selectedPromotionId = ref('')
const isLoading = ref(true)
const hasLoaded = ref(false)
const error = ref<string | null>(null)

// Computed pour les segments de statut
const statutSegments = computed<Segment[]>(() => {
  if (!stats.value) return []
  const s = stats.value.parStatut
  
  return [
    {
      label: 'Validées',
      value: stats.value.validees,
      color: 'bg-emerald-500',
      bg: 'bg-emerald-50',
    },
    {
      label: 'En cours',
      value: (s.EN_STAGE || 0) + (s.EN_EMPLOI || 0),
      color: 'bg-blue-500',
      bg: 'bg-blue-50',
    },
    {
      label: 'En attente',
      value: stats.value.enAttente,
      color: 'bg-amber-400',
      bg: 'bg-amber-50',
    },
  ]
})

// Computed pour les données des référentiels (depuis l'API)
const referentiels = computed(() => {
  if (!stats.value?.parReferentiel) return []

  // On limite l'affichage aux referentiels de la promotion active
  // pour garder un perimetre manager coherent.
  const activeReferentielIds = new Set(
    (activePromotion.value?.referentiels ?? []).map(
      ({ referentielId }) => referentielId,
    ),
  )

  return stats.value.parReferentiel
    .filter(
      (referentiel) =>
        activeReferentielIds.size === 0 ||
        activeReferentielIds.has(referentiel.referentielId),
    )
    .map((r) => ({
    label: r.referentielNom,
    value: r.enEmploi,
    total: r.total,
  }))
})

// Calcul du max pour les barres
const maxStatut = computed(() => {
  return Math.max(...statutSegments.value.map((s) => s.value), 1)
})

// Fonctions utilitaires
const barWidth = (value: number, max: number) => {
  // Une valeur nulle doit produire une barre vide, pas une largeur minimale artificielle.
  if (value <= 0 || max <= 0) return '0%'

  return `${Math.max(5, Math.round((value / max) * 100))}%`
}

const pct = (value: number, total: number) =>
  total > 0 ? Math.round((value / total) * 100) : 0

// Chargement des données
async function loadStats() {
  isLoading.value = true
  error.value = null
  try {
    const activePromo =
      (promotionOptions.value.find(
        (promotion): promotion is PromotionWithReferentiels =>
          promotion.id === selectedPromotionId.value,
      ) as PromotionWithReferentiels | undefined) ??
      (promotionOptions.value.find(
        (promotion): promotion is PromotionWithReferentiels =>
          promotion.estActive === true,
      ) as PromotionWithReferentiels | undefined) ??
      null
    const statsData = await getStatistiques({
      promotionId: selectedPromotionId.value || activePromo?.id,
      includePromotions: false,
      includeReferentiels: true,
      includeSituationsRecentes: false,
      forceRefresh: true,
    })
    
    stats.value =
      statsData && typeof statsData === 'object' ? statsData : null
    activePromotion.value = activePromo
    hasLoaded.value = true
  } catch (e: any) {
    error.value = e.message || 'Erreur lors du chargement des statistiques'
    console.error('Erreur statistiques:', e)
  } finally {
    isLoading.value = false
  }
}

async function handlePromotionChange() {
  await loadStats()
}

onMounted(() => {
  ;(async () => {
    try {
      const promotionsData = await getPromotions({
        includeMetrics: false,
        forceRefresh: true,
      })
      promotionOptions.value = promotionsData.items
      activePromotion.value =
        (promotionsData.items.find(
          (promotion): promotion is PromotionWithReferentiels =>
            promotion.estActive === true,
        ) as PromotionWithReferentiels | undefined) ?? null
      selectedPromotionId.value = activePromotion.value?.id ?? ''
      await loadStats()
    } catch (e: any) {
      error.value = e.message || 'Erreur lors du chargement des statistiques'
      console.error('Erreur statistiques:', e)
      isLoading.value = false
    }
  })()
})
</script>

<template>
  <ManagerLayout title="Statistiques" active-menu="statistiques">
    <div class="space-y-5">
      <!-- Loading -->
      <PageLoadingState
        v-if="isLoading && !hasLoaded"
        message="Chargement des statistiques..."
      />

      <template v-else-if="stats">
        <!-- ── Active Promotion Banner ── -->
        <div v-if="activePromotion" class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-800">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                  <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                </svg>
              </div>
              <div>
                <p class="text-sm text-slate-500">Promotion active</p>
                <p class="text-lg font-bold">{{ activePromotion.nom }} ({{ activePromotion.annee }})</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <select
                v-model="selectedPromotionId"
                class="rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm text-slate-700 outline-none focus:border-orange-400 cursor-pointer"
                @change="handlePromotionChange"
              >
                <option
                  v-for="promotion in promotionOptions"
                  :key="promotion.id"
                  :value="promotion.id"
                >
                  {{ promotion.nom }} ({{ promotion.annee }})
                </option>
              </select>
              <div class="text-sm text-slate-500">
                Données filtrées par promotion
              </div>
            </div>
          </div>
        </div>

        <div v-else class="rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-700">
          <div class="flex items-center gap-3">
            <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <p>Aucune promotion active. Veuillez activer une promotion depuis la page Promotions.</p>
          </div>
        </div>

        <!-- ── Hero Banner ── -->
        <div class="relative overflow-hidden rounded-xl border border-gray-100 bg-white p-5 shadow-sm lg:p-6">
          <div class="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div class="mb-2 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[#F16E00]">
                <span class="h-1.5 w-1.5 animate-pulse rounded-full bg-[#009682]"></span>
                <span class="text-xs font-semibold">Données en temps réel</span>
              </div>
              <h2 class="text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">
                Statistiques
              </h2>
              <p class="mt-1 text-sm text-gray-500">
                Suivi global de l'insertion professionnelle
              </p>
            </div>
            <div class="flex shrink-0 gap-3">
              <div class="rounded-xl border border-teal-100 bg-teal-50 px-5 py-3 text-center">
                <p class="text-2xl font-bold text-[#009682]">
                  {{ stats.tauxInsertion }}%
                </p>
                <p class="mt-0.5 text-xs text-gray-500">Taux insertion</p>
              </div>
              <div class="rounded-xl border border-orange-100 bg-orange-50 px-5 py-3 text-center">
                <p class="text-2xl font-bold text-[#F16E00]">
                  {{ stats.totalApprenants }}
                </p>
                <p class="mt-0.5 text-xs text-gray-500">Apprenants</p>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Stats Row ── -->
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Total apprenants
                </p>
                <p class="mt-1.5 text-3xl font-bold text-slate-900">
                  {{ stats.totalApprenants }}
                </p>
              </div>
              <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50">
                <svg class="h-5 w-5 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
              </div>
            </div>
          </article>

          <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Total situations
                </p>
                <p class="mt-1.5 text-3xl font-bold text-slate-900">
                  {{ stats.totalSituations }}
                </p>
              </div>
              <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                <svg class="h-5 w-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="7" width="18" height="14" rx="2" />
                  <path d="M8 7V5a4 4 0 0 1 8 0v2" />
                </svg>
              </div>
            </div>
          </article>

          <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Taux d'insertion
                </p>
                <p class="mt-1.5 text-3xl font-bold text-emerald-600">
                  {{ stats.tauxInsertion }}%
                </p>
              </div>
              <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                <svg class="h-5 w-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="4 4 4 20 20 20" />
                  <polyline points="7 14 11 10 14 13 19 7" />
                </svg>
              </div>
            </div>
          </article>

          <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  En attente
                </p>
                <p class="mt-1.5 text-3xl font-bold text-amber-500">
                  {{ stats.enAttente }}
                </p>
              </div>
              <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50">
                <svg class="h-5 w-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
            </div>
          </article>
        </div>

        <!-- ── Bar charts row ── -->
        <div class="grid gap-5 xl:grid-cols-2">
          <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div class="mb-5 flex items-start justify-between">
              <div>
                <h2 class="text-base font-bold text-slate-900">
                  Répartition par statut
                </h2>
                <p class="mt-0.5 text-sm text-slate-500">
                  Distribution des situations
                </p>
              </div>
            </div>
            <div class="space-y-5">
              <div v-for="seg in statutSegments" :key="seg.label">
                <div class="mb-2 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="h-2.5 w-2.5 rounded-full" :class="seg.color"></span>
                    <span class="text-sm font-medium text-slate-700">{{ seg.label }}</span>
                  </div>
                  <span class="text-sm font-bold text-slate-900">{{ seg.value }}</span>
                </div>
                <div class="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div class="h-2.5 rounded-full transition-all duration-700" :class="seg.color" :style="{ width: barWidth(seg.value, maxStatut) }" />
                </div>
              </div>
            </div>
          </section>

          <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div class="mb-5 flex items-start justify-between">
              <div>
                <h2 class="text-base font-bold text-slate-900">
                  Répartition par type
                </h2>
                <p class="mt-0.5 text-sm text-slate-500">
                  Types de situations professionnelles
                </p>
              </div>
            </div>
            <div class="space-y-5">
              <div v-for="seg in [
                { label: 'Stage', value: stats.parStatut?.EN_STAGE || 0, color: 'bg-orange-500' },
                { label: 'Emploi', value: stats.parStatut?.EN_EMPLOI || 0, color: 'bg-[#009682]' },
                { label: 'Recherche', value: stats.parStatut?.RECHERCHE_EMPLOI || 0, color: 'bg-amber-400' },
                { label: 'Projet', value: stats.parStatut?.PROJET_PERSO || 0, color: 'bg-[#F16E00]' },
              ]" :key="seg.label">
                <div class="mb-2 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="h-2.5 w-2.5 rounded-full" :class="seg.color"></span>
                    <span class="text-sm font-medium text-slate-700">{{ seg.label }}</span>
                  </div>
                  <span class="text-sm font-bold text-slate-900">{{ seg.value }}</span>
                </div>
                <div class="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div class="h-2.5 rounded-full transition-all duration-700" :class="seg.color" :style="{ width: barWidth(seg.value, stats.totalSituations || 1) }" />
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- ── Referentiels row ── -->
        <div class="grid gap-5 xl:grid-cols-1">
          <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div class="mb-5">
              <h2 class="text-base font-bold text-slate-900">
                Situations par référentiel
              </h2>
              <p class="mt-0.5 text-sm text-slate-500">
                Répartition par domaine de formation
              </p>
            </div>
            <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div v-for="item in referentiels" :key="item.label" class="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-3">
                    <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100">
                      <svg class="h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2" />
                        <line x1="8" y1="21" x2="16" y2="21" />
                        <line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                    </div>
                    <span class="text-sm font-semibold text-slate-800">{{ item.label }}</span>
                  </div>
                  <div class="text-right">
                    <span class="text-lg font-bold text-blue-600">{{ item.value }}</span>
                    <p class="text-xs text-slate-400">{{ pct(item.value, item.total) }}%</p>
                  </div>
                </div>
                <div class="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div class="h-1.5 rounded-full bg-blue-400 transition-all duration-700" :style="{ width: pct(item.value, item.total) + '%' }"></div>
                </div>
              </div>
              <div v-if="referentiels.length === 0" class="col-span-full py-8 text-center text-slate-400">
                <p class="text-sm">Aucun référentiel trouvé</p>
              </div>
            </div>
          </section>
        </div>
      </template>

      <!-- Error state -->
      <div v-else-if="error" class="rounded-2xl bg-red-50 p-4 text-red-600">
        {{ error }}
      </div>

      <!-- No stats -->
      <div v-else class="flex flex-col items-center justify-center py-20 text-slate-500">
        <svg class="h-12 w-12 text-slate-300 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M3 3v18h18" />
          <path d="M7 16l4-4 4 4 6-6" />
        </svg>
        <p>Aucune statistique disponible</p>
      </div>
    </div>
  </ManagerLayout>
</template>
