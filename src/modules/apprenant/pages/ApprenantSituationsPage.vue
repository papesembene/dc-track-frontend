<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useRouter } from 'vue-router'
import ApprenantLayout from '../../../shared/layouts/ApprenantLayout.vue'
import { getMesSituations, formatDate, mapToSituationItem, type SituationApi, type UiType, type UiStatus, type SituationItem } from '../api/situations.api'
import { showToast } from '../../../core/ui/toast'

const apiSituations = ref<SituationApi[]>([]);
const isLoading = ref(true);

const loadSituations = async () => {
  isLoading.value = true
  try {
    const data = await getMesSituations()
    apiSituations.value = data
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message
    const message = Array.isArray(apiMessage)
      ? apiMessage.join(', ')
      : apiMessage || 'Impossible de charger les situations'
    showToast(message, 'error')
  } finally {
    isLoading.value = false
  }
}

onMounted(loadSituations);

const search = ref('')
const selectedType = ref<'Tous' | UiType>('Tous')
const selectedStatus = ref<'Tous statuts' | UiStatus>('Tous statuts')



const situations = computed<SituationItem[]>(() =>
  apiSituations.value.map((item) => {
    const mapped = mapToSituationItem(item)
    return {
      ...mapped,
      dateDebut: formatDate(item.dateDebut),
      dateFin: formatDate(item.dateFin) || undefined,
    }
  }),
)

const typeChips: Array<'Tous' | UiType> = ['Tous', 'Stage', 'Emploi', 'Alternance', 'Projet']
const statusChips: Array<'Tous statuts' | UiStatus> = [
  'Tous statuts', 'En cours', 'En attente', 'Validée', 'Rejetée',
]

const stats = computed(() => ({
  total: situations.value.length,
  enCours: situations.value.filter(s => s.status === 'En cours').length,
  valides: situations.value.filter(s => s.status === 'Validée').length,
  enAttente: situations.value.filter(s => s.status === 'En attente').length,
}))

const filtered = computed(() =>
  situations.value.filter(s => {
    const q = search.value.trim().toLowerCase()
    const matchesSearch =
      !q ||
      s.type.toLowerCase().includes(q) ||
      s.entreprise.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q)
    const matchesType = selectedType.value === 'Tous' || s.type === selectedType.value
    const matchesStatus = selectedStatus.value === 'Tous statuts' || s.status === selectedStatus.value
    return matchesSearch && matchesType && matchesStatus
  }),
)
const router = useRouter()

function goToDetail(id: string) {
  router.push(`/situations/${id}`)
}

const statusBadgeClass = (status: UiStatus) => {
  if (status === 'Validée') return 'bg-emerald-50 text-emerald-600 border-emerald-200'
  if (status === 'En attente') return 'bg-amber-50 text-amber-600 border-amber-200'
  if (status === 'En cours') return 'bg-blue-50 text-blue-600 border-blue-200'
  return 'bg-red-50 text-red-600 border-red-200'
}

const typeIconBg = (type: UiType) => {
  if (type === 'Stage') return 'bg-orange-100 text-orange-500'
  if (type === 'Emploi') return 'bg-emerald-100 text-emerald-600'
  if (type === 'Alternance') return 'bg-blue-100 text-blue-600'
  return 'bg-violet-100 text-violet-600'
}

const typeBorderClass = (type: UiType) => {
  if (type === 'Stage') return 'border-l-orange-400'
  if (type === 'Emploi') return 'border-l-emerald-400'
  if (type === 'Alternance') return 'border-l-blue-400'
  return 'border-l-violet-400'
}

const typeChipClass = (chip: 'Tous' | UiType) =>
  selectedType.value === chip
    ? 'bg-orange-500 border-orange-500 text-white'
    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'

const statusChipClass = (chip: 'Tous statuts' | UiStatus) =>
  selectedStatus.value === chip
    ? 'bg-orange-500 border-orange-500 text-white'
    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
</script>

<template>
  <ApprenantLayout title="Mes situations" active-menu="situations">
    <section class="space-y-6">

      <!-- ── Page header ── -->
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 class="text-2xl font-extrabold text-slate-900">Mes situations professionnelles</h2>
          <p class="mt-1 text-sm text-slate-500">Gérez et suivez toutes vos expériences professionnelles déclarées</p>
        </div>
        <RouterLink
          to="/situations/nouvelle"
          class="inline-flex items-center gap-2 rounded-lg bg-[#F16E00] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:-translate-y-0.5 hover:bg-[#d95f00] hover:shadow-lg"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nouvelle situation
        </RouterLink>
      </div>

      <!-- ── Stats ── -->
      <div v-if="isLoading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article
          v-for="index in 4"
          :key="`situations-stats-skeleton-${index}`"
          class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div class="animate-pulse">
            <div class="h-4 w-24 rounded bg-slate-200"></div>
            <div class="mt-4 h-9 w-16 rounded bg-slate-200"></div>
          </div>
        </article>
      </div>

      <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article class="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-100 transition-transform group-hover:scale-110">
            <svg class="h-5 w-5 text-orange-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            </svg>
          </div>
          <div>
            <p class="text-3xl font-extrabold text-slate-900">{{ stats.total }}</p>
            <p class="mt-0.5 text-xs font-medium uppercase tracking-wide text-slate-400">Total</p>
          </div>
        </article>

        <article class="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 transition-transform group-hover:scale-110">
            <svg class="h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div>
            <p class="text-3xl font-extrabold text-blue-600">{{ stats.enCours }}</p>
            <p class="mt-0.5 text-xs font-medium uppercase tracking-wide text-slate-400">En cours</p>
          </div>
        </article>

        <article class="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 transition-transform group-hover:scale-110">
            <svg class="h-5 w-5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div>
            <p class="text-3xl font-extrabold text-emerald-600">{{ stats.valides }}</p>
            <p class="mt-0.5 text-xs font-medium uppercase tracking-wide text-slate-400">Validées</p>
          </div>
        </article>

        <article class="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
          <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 transition-transform group-hover:scale-110">
            <svg class="h-5 w-5 text-amber-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 22h14" /><path d="M5 2h14" />
              <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
              <path d="M7 2v4.172a2 2 0 0 1 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
            </svg>
          </div>
          <div>
            <p class="text-3xl font-extrabold text-amber-500">{{ stats.enAttente }}</p>
            <p class="mt-0.5 text-xs font-medium uppercase tracking-wide text-slate-400">En attente</p>
          </div>
        </article>
      </div>

      <!-- ── Filter bar ── -->
      <div class="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div class="flex flex-wrap items-center gap-3">
          <!-- Search -->
          <div class="relative min-w-[200px] flex-1 xl:max-w-[280px]">
            <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              v-model="search"
              type="text"
              placeholder="Rechercher..."
              class="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 outline-none transition-colors focus:border-orange-400 focus:bg-white"
            />
          </div>

          <div class="hidden h-5 w-px bg-slate-200 xl:block" />

          <!-- Type chips -->
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="chip in typeChips"
              :key="chip"
              class="rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-150"
              :class="typeChipClass(chip)"
              @click="selectedType = chip"
            >{{ chip }}</button>
          </div>

          <div class="hidden h-5 w-px bg-slate-200 xl:block" />

          <!-- Status chips -->
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="chip in statusChips"
              :key="chip"
              class="rounded-full border px-3 py-1 text-xs font-semibold transition-all duration-150"
              :class="statusChipClass(chip)"
              @click="selectedStatus = chip"
            >{{ chip }}</button>
          </div>
        </div>
      </div>

      <!-- ── Count ── -->
      <p v-if="!isLoading" class="text-sm text-slate-500">
        <span class="font-bold text-slate-800">{{ filtered.length }}</span> situation{{ filtered.length > 1 ? 's' : '' }} trouvée{{ filtered.length > 1 ? 's' : '' }}
      </p>

      <!-- ── Loading skeleton ── -->
      <div v-if="isLoading" class="space-y-3">
        <div v-for="i in 3" :key="i" class="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex gap-4">
            <div class="h-12 w-12 shrink-0 rounded-2xl bg-slate-100"></div>
            <div class="flex-1 space-y-2.5">
              <div class="flex gap-2">
                <div class="h-4 w-20 rounded-lg bg-slate-100"></div>
                <div class="h-4 w-16 rounded-full bg-slate-100"></div>
              </div>
              <div class="h-3.5 w-40 rounded bg-slate-100"></div>
              <div class="h-3 w-full rounded bg-slate-100"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Empty state ── -->
      <div
        v-else-if="filtered.length === 0"
        class="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-center"
      >
        <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          <svg class="h-8 w-8 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
          </svg>
        </div>
        <p class="mt-4 text-base font-bold text-slate-700">Aucune situation trouvée</p>
        <p class="mt-1 max-w-xs text-sm text-slate-400">Essayez de modifier vos filtres ou déclarez votre première situation professionnelle.</p>
        <RouterLink
          to="/situations/nouvelle"
          class="mt-5 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:-translate-y-0.5 hover:bg-orange-600"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Déclarer une situation
        </RouterLink>
      </div>

      <!-- ── Situation cards ── -->
      <div v-else class="space-y-3">
        <article
          v-for="item in filtered"
          :key="item.id"
          class="group cursor-pointer overflow-hidden rounded-2xl border border-l-[3px] border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          :class="typeBorderClass(item.type)"
           @click="goToDetail(item.id)"
        >
          <div class="flex items-start gap-4 p-5">
            <!-- Type icon -->
            <div
              class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-transform duration-200 group-hover:scale-105"
              :class="typeIconBg(item.type)"
            >
              <svg v-if="item.type === 'Stage'" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              </svg>
              <svg v-else-if="item.type === 'Emploi'" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              <svg v-else-if="item.type === 'Alternance'" class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <svg v-else class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            </div>

            <!-- Content -->
            <div class="min-w-0 flex-1">
              <!-- Badges row -->
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-sm font-bold text-slate-900">{{ item.type }}</h3>

                <span
                  class="inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                  :class="statusBadgeClass(item.status)"
                >
                  <svg v-if="item.status === 'Validée'" class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <svg v-else-if="item.status === 'En attente'" class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M5 22h14" /><path d="M5 2h14" />
                    <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
                    <path d="M7 2v4.172a2 2 0 0 1 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
                  </svg>
                  <svg v-else-if="item.status === 'En cours'" class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                  {{ item.status }}
                </span>

                <span
                  v-if="item.isExternal"
                  class="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-500"
                >
                  <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                  Externe
                </span>
              </div>

              <!-- Company -->
              <p v-if="item.entreprise" class="mt-2 text-sm font-semibold text-slate-800">{{ item.entreprise }}</p>

              <!-- Sector / Address -->
              <div class="mt-0.5 flex flex-wrap gap-x-4 text-xs text-slate-400">
                <span v-if="item.secteur" class="flex items-center gap-1">
                  <svg class="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" />
                  </svg>
                  {{ item.secteur }}
                </span>
                <span v-if="item.adresse" class="flex items-center gap-1">
                  <svg class="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                  </svg>
                  {{ item.adresse }}
                </span>
              </div>

              <!-- Description -->
              <p class="mt-2 line-clamp-2 text-sm text-slate-500">{{ item.description }}</p>

              <!-- Feedback -->
              <div
                v-if="item.feedback"
                class="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600"
              >
                <svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                {{ item.feedback }}
              </div>
            </div>

            <!-- Dates + chevron -->
            <div class="flex shrink-0 flex-col items-end gap-3">
              <div class="space-y-1.5 text-right">
                <p class="flex items-center justify-end gap-1.5 text-xs text-slate-400">
                  <svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  Début : <span class="font-bold text-slate-700">{{ item.dateDebut }}</span>
                </p>
                <p v-if="item.dateFin" class="flex items-center justify-end gap-1.5 text-xs text-slate-400">
                  <svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  Fin : <span class="font-bold text-slate-700">{{ item.dateFin }}</span>
                </p>
              </div>
              <svg class="h-5 w-5 text-slate-300 transition-colors group-hover:text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>
        </article>
      </div>

    </section>
  </ApprenantLayout>
</template>
