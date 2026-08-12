<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import BackofficeLayout from "@/shared/layouts/BackofficeLayout.vue";
import {
  getApprenants,
  resendHistoricalCredentials,
} from "../api/apprenants.api";
import {
  getPromotions,
  getReferentiels,
} from "../api/situations.api";
import {
  getStatistiques,
  type StatistiquesGlobales,
} from "../api/statistiques.api";
import { showToast } from "../../../core/ui/toast";

const route = useRoute();
const router = useRouter();

/**
 * Type pour une ligne du tableau
 */
type Row = {
  id: string;
  initials: string;
  name: string;
  email: string;
  promo: string;
  promoId: string;
  ref: string;
  refId: string;
  situations: number;
  pendingCount: number;
  valideesCount: number;
  status: string;
  statusClass: string;
};

/**
 * Type pour une promotion
 */
type PromotionOption = {
  id: string;
  nom: string;
  annee?: number;
  statut?: string;
};

/**
 * Type pour un référentiel
 */
type ReferentielOption = {
  id: string;
  nom: string;
};

/**
 * Liste des apprenants chargés depuis l'API
 */
const rows = ref<Row[]>([]);

/**
 * Liste des promotions (toutes)
 */
const promotionsList = ref<PromotionOption[]>([]);

/**
 * Liste des référentiels (tous)
 */
const referentielsList = ref<ReferentielOption[]>([]);

/**
 * Statistiques globales (depuis API)
 */
const globalStats = ref<StatistiquesGlobales | null>(null);
const isGlobalStatsLoading = ref(true);
const activePromotion = ref<PromotionOption | null>(null);

/**
 * Indicateur de chargement
 */
const isLoading = ref(true);
const resendingIds = ref<string[]>([]);

/**
 * Pagination
 */
const currentPage = ref(1);
const totalPages = ref(1);
const searchQuery = ref(
  typeof route.query.search === "string" ? route.query.search : "",
);
const filterPromo = ref(
  typeof route.query.promotionId === "string" ? route.query.promotionId : "",
);
const filterRef = ref(
  typeof route.query.referentielId === "string" ? route.query.referentielId : "",
);
const initialPage = Number(route.query.page ?? 1);

currentPage.value =
  Number.isFinite(initialPage) && initialPage > 0 ? initialPage : 1;

/**
 * Charge les filtres (promotions et référentiels)
 */
async function loadFilters() {
  try {
    const [promos, refs] = await Promise.all([
      getPromotions({ includeMetrics: false }),
      getReferentiels(),
    ]);
    const safePromotions = Array.isArray(promos) ? promos : [];
    const safeReferentiels = Array.isArray(refs) ? refs : [];

    promotionsList.value = safePromotions;
    referentielsList.value = safeReferentiels;
    activePromotion.value =
      safePromotions.find((promotion) => promotion.estActive) ?? null;

    // Le pôle emploi démarre sur la promotion active pour coller au flux métier
    // courant, tout en gardant la possibilité de changer le filtre ensuite.
    if (!filterPromo.value && activePromotion.value?.id) {
      filterPromo.value = activePromotion.value.id;
    }
  } catch (error) {
    console.error("Erreur chargement filtres:", error);
  }
}

/**
 * Charge la liste des apprenants depuis l'API
 */
async function loadApprenants() {
  isLoading.value = true;
  try {
    const { items, pagination } = await getApprenants({
      page: currentPage.value,
      limit: 10,
      search: searchQuery.value || undefined,
      promotionId: filterPromo.value || undefined,
      referentielId: filterRef.value || undefined,
    });

    // Transformer les données API en format pour l'affichage
    rows.value = items.map((item: any) => {
      // Compter les situations validées et en attente
      const situations = item.situations || [];
      const validees = situations.filter(
        (s: any) => s.valide === true || s.valide === "true",
      ).length;
      const enAttente = situations.filter(
        (s: any) =>
          s.valide === false ||
          s.valide === "false" ||
          s.valide === null ||
          s.valide === undefined,
      ).length;

      return {
        id: item.id,
        initials: `${item.user.prenom[0]}${item.user.nom[0]}`.toUpperCase(),
        name: `${item.user.prenom} ${item.user.nom}`,
        email: item.user.email,
        promo: item.promotion?.nom || "-",
        promoId: item.promotion?.id,
        ref: item.referentiel?.nom || "-",
        refId: item.referentiel?.id,
        situations: item._count?.situations || 0,
        pendingCount: enAttente,
        valideesCount: validees,
        status: validees > 0 ? "Validée" : "En cours",
        statusClass:
          validees > 0
            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
            : "bg-blue-100 text-blue-700 border-blue-200",
      };
    });

    totalPages.value = pagination.totalPages;
  } catch (error: any) {
    showToast(
      error?.response?.data?.message || "Erreur de chargement",
      "error",
    );
  } finally {
    isLoading.value = false;
  }
}

/**
 * Charge les statistiques globales depuis l'API
 */
async function loadGlobalStats() {
  isGlobalStatsLoading.value = true;
  try {
    globalStats.value = await getStatistiques({
      promotionId: filterPromo.value || undefined,
      includePromotions: false,
      includeReferentiels: false,
      includeSituationsRecentes: false,
    });
  } catch (error) {
    console.error("Erreur chargement statistiques:", error);
  } finally {
    isGlobalStatsLoading.value = false;
  }
}

// Chargement au montage
onMounted(() => {
  loadFilters().then(() => {
    loadApprenants();
    loadGlobalStats();
  });
});

const filtered = computed(() => rows.value);
const selectedPromotion = computed(() =>
  promotionsList.value.find((promotion) => promotion.id === filterPromo.value) ?? null,
);
const isHistoricalPromotionSelected = computed(
  () => selectedPromotion.value?.statut === "HISTORIQUE",
);
const currentListQuery = computed(() => {
  const query: Record<string, string> = {};

  if (searchQuery.value) query.search = searchQuery.value;
  if (filterPromo.value) query.promotionId = filterPromo.value;
  if (filterRef.value) query.referentielId = filterRef.value;
  if (currentPage.value > 1) query.page = String(currentPage.value);

  return query;
});

function syncRouteQuery() {
  router.replace({ query: currentListQuery.value });
}

watch([filterPromo, filterRef], () => {
  currentPage.value = 1;
  syncRouteQuery();
  loadApprenants();
});

watch(filterPromo, () => {
  loadGlobalStats();
});

let searchReloadTimer: ReturnType<typeof setTimeout> | null = null;

watch(searchQuery, () => {
  currentPage.value = 1;

  if (searchReloadTimer) {
    clearTimeout(searchReloadTimer);
  }

  searchReloadTimer = setTimeout(() => {
    syncRouteQuery();
    loadApprenants();
  }, 300);
});

watch(currentPage, () => {
  syncRouteQuery();
});

onBeforeUnmount(() => {
  if (searchReloadTimer) {
    clearTimeout(searchReloadTimer);
  }
});

/**
 * Change page
 */
function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    loadApprenants();
  }
}

async function resendCredentials(row: Row) {
  if (resendingIds.value.includes(row.id)) {
    return;
  }

  resendingIds.value = [...resendingIds.value, row.id];

  try {
    const result = await resendHistoricalCredentials(row.id);
    showToast(
      result?.message ||
        `Identifiants renvoyés à ${row.email}`,
      "success",
    );
  } catch (error: any) {
    showToast(
      error?.response?.data?.message || "Erreur lors du renvoi des identifiants",
      "error",
    );
  } finally {
    resendingIds.value = resendingIds.value.filter((id) => id !== row.id);
  }
}
</script>

<template>
  <BackofficeLayout title="Apprenants" active-menu="apprenants">
    <div class="space-y-5">
      <!-- ── Hero Banner ── -->
      <div
        class="relative overflow-hidden rounded-xl border border-gray-100 bg-white p-5 shadow-sm lg:p-6"
      >
        <div
          class="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div
              class="mb-2 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[#F16E00]"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-[#009682]"></span>
              <span class="text-xs font-semibold"
                >{{ isGlobalStatsLoading ? "Chargement..." : `${globalStats?.totalApprenants ?? 0} apprenants` }}
                enregistrés</span
              >
            </div>
            <h2 class="text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">
              Liste des apprenants
            </h2>
            <p class="mt-1 text-sm text-gray-500">
              Gérez et suivez les parcours d'insertion
            </p>
            <p class="mt-2 text-xs font-medium text-gray-500">
              {{
                activePromotion
                  ? `Filtre initial : promotion active ${activePromotion.nom}${activePromotion.annee ? ` (${activePromotion.annee})` : ""}`
                  : "Aucune promotion active détectée"
              }}
            </p>
          </div>
          <div class="flex shrink-0 gap-3">
            <div class="rounded-xl border border-orange-100 bg-orange-50 px-5 py-3 text-center">
              <p v-if="isGlobalStatsLoading" class="h-8 w-16 animate-pulse rounded bg-orange-100"></p>
              <p v-else class="text-2xl font-bold text-[#F16E00]">
                {{ globalStats?.totalApprenants ?? 0 }}
              </p>
              <p class="mt-0.5 text-xs text-gray-500">Total</p>
            </div>
            <div class="rounded-xl border border-teal-100 bg-teal-50 px-5 py-3 text-center">
              <p v-if="isGlobalStatsLoading" class="h-8 w-16 animate-pulse rounded bg-teal-100"></p>
              <p v-else class="text-2xl font-bold text-[#009682]">
                {{ globalStats?.enAttente ?? 0 }}
              </p>
              <p class="mt-0.5 text-xs text-gray-500">En attente</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Stat cards ── -->
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <template v-if="isGlobalStatsLoading">
          <article
            v-for="index in 4"
            :key="`stats-skeleton-${index}`"
            class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div class="animate-pulse">
              <div class="h-3 w-28 rounded bg-slate-200"></div>
              <div class="mt-3 h-8 w-14 rounded bg-slate-200"></div>
            </div>
          </article>
        </template>
        <template v-else>
        <article
          class="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div>
            <p
              class="text-xs font-semibold uppercase tracking-wide text-slate-400"
            >
              Total apprenants
            </p>
            <p class="mt-1.5 text-3xl font-bold text-slate-900">
              {{ globalStats?.totalApprenants ?? 0 }}
            </p>
          </div>
          <div
            class="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50"
          >
            <svg
              class="h-5 w-5 text-orange-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
        </article>

        <article
          class="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div>
            <p
              class="text-xs font-semibold uppercase tracking-wide text-slate-400"
            >
              En attente
            </p>
            <p class="mt-1.5 text-3xl font-bold text-amber-500">
              {{ globalStats?.enAttente ?? 0 }}
            </p>
          </div>
          <div
            class="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50"
          >
            <svg
              class="h-5 w-5 text-amber-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
              />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
        </article>

        <article
          class="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div>
            <p
              class="text-xs font-semibold uppercase tracking-wide text-slate-400"
            >
              Situations validées
            </p>
            <p class="mt-1.5 text-3xl font-bold text-emerald-600">
              {{ globalStats?.validees ?? 0 }}
            </p>
          </div>
          <div
            class="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50"
          >
            <svg
              class="h-5 w-5 text-emerald-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
        </article>

        <article
          class="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div>
            <p
              class="text-xs font-semibold uppercase tracking-wide text-slate-400"
            >
              Taux d'insertion
            </p>
            <p class="mt-1.5 text-3xl font-bold text-blue-600">
              {{ globalStats?.tauxInsertion ?? 0 }}%
            </p>
          </div>
          <div
            class="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50"
          >
            <svg
              class="h-5 w-5 text-blue-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="4 4 4 20 20 20" />
              <polyline points="7 14 11 10 14 13 19 7" />
            </svg>
          </div>
        </article>
        </template>
      </div>

      <!-- ── Table section ── -->
      <section class="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <!-- Toolbar -->
        <div
          class="flex flex-wrap items-center gap-3 border-b border-slate-100 p-5"
        >
          <div
            class="flex h-10 flex-1 min-w-52 items-center gap-2 rounded-xl border border-slate-300 px-3 focus-within:border-orange-400 transition-colors"
          >
            <svg
              class="h-4 w-4 shrink-0 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Rechercher par nom, prénom ou email..."
              class="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>

          <div
            class="relative flex h-10 min-w-44 items-center rounded-xl border border-slate-300 px-3"
          >
            <select
              v-model="filterPromo"
              class="w-full appearance-none bg-transparent text-sm text-slate-700 outline-none pr-5"
            >
              <option value="">Toutes les promotions</option>
              <option v-for="p in promotionsList" :key="p.id" :value="p.id">
                {{ p.nom }}
              </option>
            </select>
            <svg
              class="pointer-events-none absolute right-3 h-3.5 w-3.5 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          <div
            class="relative flex h-10 min-w-52 items-center rounded-xl border border-slate-300 px-3"
          >
            <select
              v-model="filterRef"
              class="w-full appearance-none bg-transparent text-sm text-slate-700 outline-none pr-5"
            >
              <option value="">Tous les référentiels</option>
              <option v-for="r in referentielsList" :key="r.id" :value="r.id">
                {{ r.nom }}
              </option>
            </select>
            <svg
              class="pointer-events-none absolute right-3 h-3.5 w-3.5 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

        </div>

        <!-- Table count -->
        <div class="px-6 py-3 border-b border-slate-50">
          <p v-if="isLoading" class="text-xs font-semibold text-slate-400">
            Chargement des apprenants...
          </p>
          <p v-else class="text-xs font-semibold text-slate-400">
            {{ filtered.length }} apprenant{{
              filtered.length > 1 ? "s" : ""
            }}
            trouvé{{ filtered.length > 1 ? "s" : "" }}
          </p>
        </div>

        <div class="overflow-x-auto rounded-b-2xl">
          <table class="w-full min-w-[800px] text-left">
            <thead class="bg-slate-50">
              <tr>
                <th
                  class="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-400"
                >
                  Apprenant
                </th>
                <th
                  class="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-400"
                >
                  Promotion
                </th>
                <th
                  class="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-400"
                >
                  Référentiel
                </th>
                <th
                  class="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-400"
                >
                  Situations
                </th>
                <th
                  class="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-400"
                >
                  Statut
                </th>
                <th
                  class="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-400"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-if="isLoading">
                <td colspan="6" class="px-5 py-6">
                  <div class="space-y-3 animate-pulse">
                    <div class="h-10 rounded bg-slate-100"></div>
                    <div class="h-10 rounded bg-slate-100"></div>
                    <div class="h-10 rounded bg-slate-100"></div>
                  </div>
                </td>
              </tr>
              <tr v-else-if="filtered.length === 0">
                <td
                  colspan="6"
                  class="px-6 py-10 text-center text-sm text-slate-400"
                >
                  Aucun apprenant ne correspond à votre recherche
                </td>
              </tr>
              <tr
                v-for="row in filtered"
                :key="row.id"
                class="transition-colors hover:bg-slate-50"
              >
                <td class="px-5 py-4">
                  <div class="flex items-center gap-3">
                    <div
                      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white"
                    >
                      {{ row.initials }}
                    </div>
                    <div>
                      <p class="text-sm font-semibold text-slate-900">
                        {{ row.name }}
                      </p>
                      <p class="text-xs text-slate-500">{{ row.email }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-5 py-4 text-sm text-slate-700">
                  {{ row.promo }}
                </td>
                <td class="px-5 py-4 text-sm text-slate-700">{{ row.ref }}</td>
                <td class="px-5 py-4">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-semibold text-slate-900">{{
                      row.situations
                    }}</span>
                    <span
                      v-if="row.pendingCount > 0"
                      class="rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
                    >
                      {{ row.pendingCount }} en attente
                    </span>
                  </div>
                </td>
                <td class="px-5 py-4">
                  <span
                    class="rounded-full border px-2.5 py-0.5 text-xs font-medium"
                    :class="row.statusClass"
                  >
                    {{ row.status }}
                  </span>
                </td>
                <td class="px-5 py-4">
                  <div class="flex items-center gap-3">
                    <RouterLink
                      :to="{ path: `/apprenants/${row.id}`, query: currentListQuery }"
                      class="inline-flex items-center gap-1 text-sm font-semibold text-orange-500 transition-colors hover:text-orange-600"
                    >
                      Voir détails
                      <svg
                        class="h-3.5 w-3.5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </RouterLink>
                    <button
                      v-if="isHistoricalPromotionSelected"
                      type="button"
                      class="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                      :disabled="resendingIds.includes(row.id)"
                      @click.stop.prevent="resendCredentials(row)"
                    >
                      {{
                        resendingIds.includes(row.id)
                          ? "Envoi..."
                          : "Renvoyer les identifiants"
                      }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div
          v-if="totalPages > 1"
          class="flex items-center justify-between border-t border-slate-100 px-6 py-4"
        >
          <p class="text-sm text-slate-500">
            Page {{ currentPage }} sur {{ totalPages }}
          </p>
          <div class="flex items-center gap-2">
            <button
              @click="goToPage(currentPage - 1)"
              :disabled="currentPage === 1"
              class="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Précédent
            </button>
            <button
              v-for="page in totalPages"
              :key="page"
              @click="goToPage(page)"
              class="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors"
              :class="
                page === currentPage
                  ? 'bg-orange-500 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              "
            >
              {{ page }}
            </button>
            <button
              @click="goToPage(currentPage + 1)"
              :disabled="currentPage === totalPages"
              class="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Suivant
              <svg
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      </section>
    </div>
  </BackofficeLayout>
</template>
