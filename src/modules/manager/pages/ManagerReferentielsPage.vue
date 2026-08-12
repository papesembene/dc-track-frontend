<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import ManagerLayout from '@/modules/manager/layouts/ManagerLayout.vue'
import {
  getReferentiels,
  type ReferentielItem,
} from '@/modules/manager/api/referentiels.api'
import PageLoadingState from '@/shared/components/PageLoadingState.vue'
import EmptyState from '@/shared/components/EmptyState.vue'

const loading = ref(true)
const hasLoaded = ref(false)
const error = ref<string | null>(null)
const search = ref('')
const referentiels = ref<ReferentielItem[]>([])
const totalItems = ref(0)

async function fetchReferentiels() {
  loading.value = true
  error.value = null

  try {
    const data = await getReferentiels({
      page: 1,
      limit: 100,
      search: search.value || undefined,
      sortBy: 'nom',
      sortOrder: 'asc',
    })

    referentiels.value = data.items
    totalItems.value = data.pagination.totalItems
    hasLoaded.value = true
  } catch (e: any) {
    error.value = e.message || 'Erreur lors du chargement des référentiels'
  } finally {
    loading.value = false
  }
}

const totalWithDescription = computed(
  () => referentiels.value.filter((item) => item.description?.trim()).length,
)

onMounted(fetchReferentiels)
</script>

<template>
  <ManagerLayout title="Référentiels" active-menu="referentiels">
    <div class="space-y-5">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Référentiels</h1>
        </div>

        <button
          type="button"
          class="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          @click="fetchReferentiels"
        >
          Actualiser
        </button>
      </div>

      <PageLoadingState
        v-if="loading && !hasLoaded"
        message="Chargement des référentiels..."
      />

      <div
        v-else-if="error"
        class="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700"
      >
        <p class="font-semibold">Chargement impossible</p>
        <p class="mt-1 text-sm">{{ error }}</p>
      </div>

      <template v-else>
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Total</p>
            <p class="mt-3 text-3xl font-bold text-slate-900">{{ totalItems }}</p>
            <p class="mt-1 text-sm text-slate-500">Référentiels disponibles</p>
          </article>

          <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Documentés</p>
            <p class="mt-3 text-3xl font-bold text-slate-900">{{ totalWithDescription }}</p>
            <p class="mt-1 text-sm text-slate-500">Avec une description renseignée</p>
          </article>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div class="relative">
            <svg
              class="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              v-model="search"
              type="text"
              placeholder="Rechercher un référentiel..."
              class="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-orange-400 focus:bg-white"
              @keyup.enter="fetchReferentiels"
            />
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <p class="text-sm text-slate-500">{{ referentiels.length }} référentiel(s) affiché(s)</p>
            <span class="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">
              Lecture seule
            </span>
          </div>

          <div v-if="loading" class="p-6">
            <PageLoadingState compact message="Actualisation des référentiels..." />
          </div>

          <div v-else-if="referentiels.length === 0" class="p-6">
            <EmptyState
              title="Aucun référentiel trouvé"
              description="Aucun référentiel n'est encore remonté depuis in-odc."
              compact
            />
          </div>

          <div v-else class="divide-y divide-slate-100">
            <article
              v-for="item in referentiels"
              :key="item.id"
              class="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-start lg:justify-between"
            >
              <div class="min-w-0">
                <div class="flex items-center gap-3">
                  <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                    <svg class="h-4 w-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  </div>
                  <div class="min-w-0">
                    <p class="truncate text-base font-bold text-slate-900">{{ item.nom }}</p>
                    <p class="mt-1 text-xs text-slate-400">
                      Créé le {{ item.createdAt ? new Date(item.createdAt).toLocaleDateString('fr-FR') : '—' }}
                    </p>
                  </div>
                </div>

                <p class="mt-3 text-sm text-slate-600">
                  {{ item.description?.trim() || 'Aucune description renseignée pour ce référentiel.' }}
                </p>
              </div>

            </article>
          </div>
        </div>
      </template>
    </div>
  </ManagerLayout>
</template>
