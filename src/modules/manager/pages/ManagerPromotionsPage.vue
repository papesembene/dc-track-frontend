<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  Megaphone,
  Users,
  Link2,
  CheckCircle2,
  CalendarDays,
  RefreshCw,
  TrendingUp,
  X,
} from 'lucide-vue-next'
import ManagerLayout from '@/modules/manager/layouts/ManagerLayout.vue'
import {
  getPromotions,
  type PromotionItem,
} from '@/modules/manager/api/promotions.api'
import PageLoadingState from '@/shared/components/PageLoadingState.vue'
import EmptyState from '@/shared/components/EmptyState.vue'

interface PromotionWithStats extends PromotionItem {
  totalApprenants: number
  enEmploi: number
  tauxInsertion: number
}

const promotions = ref<PromotionWithStats[]>([])
const loading = ref(true)
const hasLoaded = ref(false)
const error = ref<string | null>(null)

const totalActive = computed(
  () => promotions.value.filter((promotion) => promotion.estActive).length,
)

const totalReferentielLinks = computed(() =>
  promotions.value.reduce(
    (count, promotion) => count + (promotion.referentiels?.length ?? 0),
    0,
  ),
)

async function fetchData() {
  loading.value = true
  error.value = null

  try {
    const promotionsData = await getPromotions({ forceRefresh: true })

    promotions.value = promotionsData.items.map((promotion) => ({
      ...promotion,
      totalApprenants: promotion.totalApprenants ?? 0,
      enEmploi: promotion.enEmploi ?? 0,
      tauxInsertion: Math.round(promotion.tauxInsertion ?? 0),
    }))

    hasLoaded.value = true
  } catch (e: any) {
    error.value = e.message || 'Erreur lors du chargement des promotions'
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<template>
  <ManagerLayout title="Promotions" active-menu="promotions">
    <div class="space-y-6">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex items-center gap-4">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-orange-100 bg-orange-50 shadow-sm">
            <Megaphone class="h-6 w-6 text-[#F16E00]" />
          </div>
          <div>
            <h1 class="text-2xl font-bold text-slate-900">Promotions</h1>
          </div>
        </div>

        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          @click="fetchData"
        >
          <RefreshCw class="h-4 w-4" />
          Actualiser
        </button>
      </div>

      <PageLoadingState
        v-if="loading && !hasLoaded"
        message="Chargement des promotions..."
      />

      <div
        v-else-if="error"
        class="flex items-start gap-4 rounded-2xl border border-red-200 bg-red-50 p-5"
      >
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
          <X class="h-5 w-5 text-red-600" />
        </div>
        <div class="flex-1">
          <p class="font-semibold text-red-700">Chargement impossible</p>
          <p class="mt-0.5 text-sm text-red-600">{{ error }}</p>
        </div>
      </div>

      <template v-else>
        <div class="grid gap-4 sm:grid-cols-3">
          <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
                <Megaphone class="h-5 w-5 text-orange-500" />
              </div>
              <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Total</span>
            </div>
            <p class="mt-4 text-3xl font-bold text-slate-900">{{ promotions.length }}</p>
            <p class="mt-1 text-sm text-slate-500">Promotions cataloguées</p>
          </article>

          <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                <CheckCircle2 class="h-5 w-5 text-emerald-500" />
              </div>
              <span
                :class="[
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  totalActive === 1 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600',
                ]"
              >
                {{ totalActive === 1 ? 'Correct' : 'Attention' }}
              </span>
            </div>
            <p class="mt-4 text-3xl font-bold text-slate-900">{{ totalActive }}</p>
            <p class="mt-1 text-sm text-slate-500">Promotion active</p>
          </article>

          <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex items-center justify-between">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                <Link2 class="h-5 w-5 text-blue-500" />
              </div>
              <span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Liens</span>
            </div>
            <p class="mt-4 text-3xl font-bold text-slate-900">{{ totalReferentielLinks }}</p>
            <p class="mt-1 text-sm text-slate-500">Liens promotion ↔ référentiel</p>
          </article>
        </div>

        <div v-if="loading" class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <PageLoadingState compact message="Actualisation des promotions..." />
        </div>

        <div
          v-else-if="promotions.length === 0"
          class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <EmptyState
            title="Aucune promotion trouvée"
            description="Aucune promotion n'est encore remontée depuis in-odc."
          />
        </div>

        <div
          v-else
          class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div
            v-for="(promo, index) in promotions"
            :key="promo.id"
            :class="[
              'flex flex-col gap-3 px-5 py-4 transition-colors sm:flex-row sm:items-center',
              index !== 0 && 'border-t border-slate-100',
              promo.estActive ? 'bg-orange-50/60' : 'hover:bg-slate-50',
            ]"
          >
            <div class="flex min-w-0 flex-1 items-center gap-4">
              <div
                :class="[
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                  promo.estActive ? 'bg-orange-100' : 'bg-slate-100',
                ]"
              >
                <Megaphone :class="['h-5 w-5', promo.estActive ? 'text-orange-500' : 'text-slate-400']" />
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="truncate font-semibold text-slate-900">{{ promo.nom }}</span>
                  <span
                    v-if="promo.estActive"
                    class="inline-flex items-center gap-1 rounded-full bg-orange-500 px-2 py-0.5 text-[11px] font-bold text-white"
                  >
                    <CheckCircle2 class="h-3 w-3" />
                    ACTIVE
                  </span>
                </div>
                <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span class="flex items-center gap-1">
                    <CalendarDays class="h-3.5 w-3.5" />
                    {{ promo.annee }}
                  </span>
                  <span class="flex items-center gap-1">
                    <Users class="h-3.5 w-3.5" />
                    {{ promo.totalApprenants }} apprenant{{ promo.totalApprenants !== 1 ? 's' : '' }}
                  </span>
                  <span class="flex items-center gap-1">
                    <TrendingUp class="h-3.5 w-3.5" />
                    <span>{{ promo.tauxInsertion }}% emploi</span>
                  </span>
                </div>
                <div class="mt-2 flex flex-wrap gap-1.5">
                  <span
                    v-for="link in promo.referentiels ?? []"
                    :key="link.referentielId"
                    class="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600"
                  >
                    {{ link.referentiel.nom }}
                  </span>
                  <span
                    v-if="(promo.referentiels?.length ?? 0) === 0"
                    class="text-xs italic text-slate-400"
                  >
                    Aucun référentiel
                  </span>
                </div>
              </div>
            </div>

            <div class="shrink-0">
              <div
                v-if="promo.estActive"
                class="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-3.5 py-2 text-xs font-semibold text-white"
              >
                <CheckCircle2 class="h-3.5 w-3.5" />
                Active
              </div>
              <div
                v-else
                class="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-600"
              >
                Lecture seule
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </ManagerLayout>
</template>
