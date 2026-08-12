<script setup lang="ts">
import { RouterLink } from "vue-router";
import { onMounted, ref } from "vue";
import {
  getStatistiques,
  type StatistiquesGlobales,
} from "../api/statistiques.api";
import { getPromotions } from "../api/situations.api";
import { showToast } from "../../../core/ui/toast";
import BackofficeLayout from "@/shared/layouts/BackofficeLayout.vue";
import StatCard from "@/modules/pole-emploi/components/StatCard.vue";
import QuickAccessCard from "@/modules/pole-emploi/components/QuickAccessCard.vue";

/**
 * Indicateur de chargement des données
 */
const isLoading = ref(true);
const promotions = ref<Array<{ id: string; nom: string; annee?: number }>>([]);
const activePromotion = ref<{ id: string; nom: string; annee?: number } | null>(
  null,
);
const selectedPromotionId = ref("");

/**
 * État des statistiques globales du dashboard.
 * Contient les compteurs et les données récentes.
 */
const stats = ref<StatistiquesGlobales>({
  totalApprenants: 0,
  totalSituations: 0,
  tauxInsertion: 0,
  enAttente: 0,
  validees: 0,
  parStatut: {
    EN_EMPLOI: 0,
    EN_STAGE: 0,
    RECHERCHE_EMPLOI: 0,
    PROJET_PERSO: 0,
    POURSUITE_ETUDES: 0,
  },
  parPromotion: [],
  parReferentiel: [],
  situationsRecentes: [],
});

/**
 * Charge les statistiques globales depuis l'API.
 * Appelée au montage du composant.
 */
async function loadStats() {
  isLoading.value = true;
  try {
    stats.value = await getStatistiques({
      promotionId:
        selectedPromotionId.value || activePromotion.value?.id || undefined,
      includePromotions: false,
      includeReferentiels: false,
      includeSituationsRecentes: true,
      forceRefresh: true,
    });
  } catch (error: any) {
    const msg =
      error?.response?.data?.message ||
      "Impossible de charger les statistiques";
    showToast(msg, "error");
  } finally {
    isLoading.value = false;
  }
}

async function handlePromotionChange() {
  await loadStats();
}

/**
 * Retourne les classes CSS pour le badge de statut.
 * Vert pour validée, amber pour en attente.
 *
 * @param valide - Booléen indiquant si la situation est validée
 * @returns Classes CSS pour le badge
 */
const statusColor = (valide: boolean) =>
  valide
    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : "bg-amber-100 text-amber-700 border-amber-200";

// Chargement des statistiques au montage du composant
onMounted(async () => {
  try {
    const allPromotions = await getPromotions({
      includeMetrics: false,
      forceRefresh: true,
    });
    const safePromotions = Array.isArray(allPromotions) ? allPromotions : [];

    promotions.value = safePromotions;
    activePromotion.value =
      safePromotions.find((promotion) => promotion.estActive) ?? null;
    selectedPromotionId.value = activePromotion.value?.id || "";

    await loadStats();
  } catch (error: any) {
    const msg =
      error?.response?.data?.message ||
      "Impossible de charger les promotions du dashboard";
    showToast(msg, "error");
    isLoading.value = false;
  }
});
</script>

<template>
  <BackofficeLayout title="Tableau de bord" active-menu="dashboard">
    <div class="space-y-5">
      <!-- ── Hero Banner ── -->
      <div
        class="relative overflow-hidden rounded-xl border border-gray-100 bg-white p-5 shadow-sm lg:p-6"
      >
        <div
          class="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div
              class="mb-2 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[#F16E00]"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-[#009682]"></span>
              <span class="text-xs font-semibold">Pôle Emploi · Actif</span>
            </div>
            <h2 class="text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">
              Tableau de bord
            </h2>
            <p class="mt-1 text-sm text-gray-500">
              Vue d'ensemble de l'insertion professionnelle
            </p>
            <div class="mt-4 flex max-w-xs flex-col gap-2">
              <label class="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Promotion
              </label>
              <select
                v-model="selectedPromotionId"
                class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition-colors focus:border-[#F16E00] focus:ring-2 focus:ring-orange-100"
                @change="handlePromotionChange"
              >
                <option
                  v-for="promotion in promotions"
                  :key="promotion.id"
                  :value="promotion.id"
                  class="text-gray-900"
                >
                  {{ promotion.nom }}{{ promotion.annee ? ` (${promotion.annee})` : "" }}
                </option>
              </select>
            </div>
          </div>
          <div class="flex shrink-0 gap-3">
            <div class="rounded-xl border border-orange-100 bg-orange-50 px-5 py-3 text-center">
              <p class="text-2xl font-bold text-[#F16E00]">
                {{ isLoading ? "—" : stats.totalApprenants }}
              </p>
              <p class="mt-0.5 text-xs text-gray-500">Apprenants</p>
            </div>
            <div class="rounded-xl border border-teal-100 bg-teal-50 px-5 py-3 text-center">
              <p class="text-2xl font-bold text-[#009682]">
                {{ isLoading ? "—" : `${stats.tauxInsertion}%` }}
              </p>
              <p class="mt-0.5 text-xs text-gray-500">Taux validation</p>
            </div>
          </div>
        </div>
      </div>

      <div v-if="isLoading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div
          v-for="index in 4"
          :key="index"
          class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
        >
          <div class="animate-pulse">
            <div class="h-4 w-24 rounded bg-slate-200"></div>
            <div class="mt-4 h-9 w-16 rounded bg-slate-200"></div>
          </div>
        </div>
      </div>

      <!-- ── Stats Row ── -->
      <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total apprenants"
          :value="String(stats.totalApprenants)"
          value-class="text-slate-900"
          icon-bg-class="bg-orange-50"
        >
          <svg
            class="h-5 w-5 text-orange-500"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
        </StatCard>

        <StatCard
          label="En attente"
          :value="String(stats.enAttente)"
          value-class="text-amber-500"
          icon-bg-class="bg-amber-50"
        >
          <svg
            class="h-5 w-5 text-amber-500"
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
        </StatCard>

        <StatCard
          label="Validées"
          :value="String(stats.validees)"
          value-class="text-emerald-600"
          icon-bg-class="bg-emerald-50"
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
            <circle cx="12" cy="12" r="9" />
            <polyline points="9 12 11.5 14.5 15.5 10" />
          </svg>
        </StatCard>

        <StatCard
          label="Taux validation"
          :value="stats.tauxInsertion + '%'"
          value-class="text-[#009682]"
          icon-bg-class="bg-teal-50"
        >
          <svg
            class="h-5 w-5 text-[#009682]"
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
        </StatCard>
      </div>

      <!-- ── Alert Banner ── -->
      <section
        v-if="stats.enAttente > 0"
        class="flex flex-col gap-4 rounded-xl border border-orange-200 bg-orange-50/60 p-5 sm:flex-row sm:items-center sm:justify-between"
      >
        <div class="flex items-start gap-4">
          <div
            class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100"
          >
            <svg
              class="h-5 w-5 text-amber-600"
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
          <div>
            <p class="text-sm font-bold text-slate-900">
              {{ stats.enAttente }} situation{{
                stats.enAttente > 1 ? "s" : ""
              }}
              en attente de validation
            </p>
            <p class="mt-0.5 text-sm text-slate-500">
              Des situations professionnelles nécessitent votre attention
            </p>
          </div>
        </div>
        <RouterLink
          to="/validations"
          class="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#F16E00] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-orange-500/20 transition-colors hover:bg-[#d95f00]"
        >
          Voir les validations
          <svg
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="13 6 19 12 13 18" />
          </svg>
        </RouterLink>
      </section>

      <!-- ── Quick Access Cards ── -->
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <RouterLink to="/validations">
          <QuickAccessCard
            title="Validations"
            subtitle="Gérer les validations"
            icon-bg-class="bg-orange-50"
          >
            <svg
              class="h-5 w-5 text-orange-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <polyline points="9 12 11.5 14.5 15.5 10" />
            </svg>
          </QuickAccessCard>
        </RouterLink>

        <RouterLink to="/apprenants">
          <QuickAccessCard
            title="Apprenants"
            subtitle="Liste des apprenants"
            icon-bg-class="bg-orange-50"
          >
            <svg
              class="h-5 w-5 text-orange-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </QuickAccessCard>
        </RouterLink>

        <RouterLink to="/statistiques">
          <QuickAccessCard
            title="Statistiques"
            subtitle="Voir les statistiques"
            icon-bg-class="bg-teal-50"
          >
            <svg
              class="h-5 w-5 text-[#009682]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </QuickAccessCard>
        </RouterLink>

        <RouterLink to="/entreprises">
          <QuickAccessCard
            title="Entreprises"
            subtitle="Gérer les entreprises"
            icon-bg-class="bg-teal-50"
          >
            <svg
              class="h-5 w-5 text-[#009682]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="3" y="7" width="18" height="14" rx="2" />
              <path d="M8 7V5a4 4 0 0 1 8 0v2" />
            </svg>
          </QuickAccessCard>
        </RouterLink>

        <RouterLink to="/import-historique">
          <QuickAccessCard
            title="Import historique"
            subtitle="Anciennes promotions"
            icon-bg-class="bg-amber-50"
          >
            <svg
              class="h-5 w-5 text-amber-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </QuickAccessCard>
        </RouterLink>

      </div>

      <!-- ── Activité récente ── -->
      <section class="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div
          class="flex items-center justify-between border-b border-slate-100 px-6 py-5"
        >
          <div>
            <h2 class="text-base font-bold text-slate-900">Activité récente</h2>
            <p class="mt-0.5 text-sm text-slate-500">
              Dernières situations enregistrées
            </p>
          </div>
          <RouterLink
            to="/validations"
            class="text-sm font-semibold text-orange-500 hover:text-orange-600 transition-colors"
          >
            Voir tout →
          </RouterLink>
        </div>

        <!-- Loading skeleton -->
        <div v-if="isLoading" class="divide-y divide-slate-100">
          <div
            v-for="i in 3"
            :key="i"
            class="flex items-center gap-4 px-6 py-4"
          >
            <div
              class="h-10 w-10 shrink-0 animate-pulse rounded-full bg-slate-200"
            ></div>
            <div class="flex-1 space-y-2">
              <div
                class="h-3.5 w-36 animate-pulse rounded-full bg-slate-200"
              ></div>
              <div
                class="h-3 w-24 animate-pulse rounded-full bg-slate-100"
              ></div>
            </div>
            <div class="h-6 w-20 animate-pulse rounded-full bg-slate-100"></div>
          </div>
        </div>

        <!-- Empty state -->
        <div
          v-else-if="
            !stats.situationsRecentes || stats.situationsRecentes.length === 0
          "
          class="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center"
        >
          <div
            class="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100"
          >
            <svg
              class="h-6 w-6 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="3" y="7" width="18" height="14" rx="2" />
              <path d="M8 7V5a4 4 0 0 1 8 0v2" />
            </svg>
          </div>
          <p class="text-sm font-semibold text-slate-700">
            Aucune activité récente
          </p>
          <p class="text-xs text-slate-400">
            Les nouvelles situations apparaîtront ici
          </p>
        </div>

        <!-- Items list -->
        <div v-else class="divide-y divide-slate-100">
          <div
            v-for="item in stats.situationsRecentes"
            :key="item.id"
            class="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-slate-50/60"
          >
            <!-- Avatar -->
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white"
            >
              {{
                (
                  (item.apprenant?.user?.prenom?.[0] ?? "") +
                  (item.apprenant?.user?.nom?.[0] ?? "")
                ).toUpperCase() || "?"
              }}
            </div>

            <!-- Content -->
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-slate-900 truncate">
                {{ item.apprenant?.user?.nom }}
                {{ item.apprenant?.user?.prenom }}
              </p>
              <p class="mt-0.5 text-xs text-slate-500 truncate">
                {{ item.statut }}
              </p>
            </div>

            <!-- Right side -->
            <div class="flex shrink-0 flex-col items-end gap-1.5">
              <span
                class="rounded-full border px-2.5 py-0.5 text-xs font-medium"
                :class="statusColor(item.valide)"
              >
                {{ item.valide ? "Validée" : "En attente" }}
              </span>
              <p class="text-xs text-slate-400">
                {{ new Date(item.createdAt).toLocaleDateString("fr-FR") }}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </BackofficeLayout>
</template>
