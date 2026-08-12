<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { RouterLink, useRouter } from "vue-router";
import CoachLayout from "@/modules/coach/layouts/CoachLayout.vue";
import {
  formatCoachDate,
  formatCoachStatus,
  getCoachApprenants,
  getCoachDashboard,
  type CoachApprenantListItem,
  type CoachDashboard,
  type CoachPromotionOption,
} from "@/modules/coach/api/coach.api";

const router = useRouter();
const loading = ref(true);
const hasLoaded = ref(false);
const error = ref<string | null>(null);
const selectedPromotionId = ref("");
const dashboard = ref<CoachDashboard | null>(null);
const apprenants = ref<CoachApprenantListItem[]>([]);

const availablePromotions = computed<CoachPromotionOption[]>(() => {
  return dashboard.value?.scope.availablePromotions ?? [];
});

const selectedPromotion = computed(() => {
  return dashboard.value?.scope.selectedPromotion ?? null;
});

const activePromotion = computed(() => {
  return (
    availablePromotions.value.find((promotion) => promotion.estActive) ?? null
  );
});

const stats = computed(() => {
  if (!dashboard.value) {
    return [];
  }

  return [
    {
      label: "Apprenants suivis",
      value: String(dashboard.value.totalApprenants),
      iconBg: "bg-orange-50",
      iconColor: "text-orange-400",
      icon: "person",
    },
    {
      label: "Situations suivies",
      value: String(dashboard.value.totalSituations),
      iconBg: "bg-orange-50",
      iconColor: "text-[#F16E00]",
      icon: "briefcase",
    },
    {
      label: "Taux d'insertion",
      value: `${dashboard.value.tauxInsertion}%`,
      iconBg: "bg-teal-50",
      iconColor: "text-[#009682]",
      icon: "trend",
    },
    {
      label: "En attente",
      value: String(dashboard.value.enAttente),
      iconBg: "bg-amber-50",
      iconColor: "text-amber-400",
      icon: "warning",
    },
  ];
});

const topApprenants = computed(() => apprenants.value.slice(0, 5));

const activities = computed(() => {
  return (dashboard.value?.situationsRecentes ?? []).map((item) => ({
    id: item.id,
    name: `${item.apprenant.user.prenom} ${item.apprenant.user.nom}`,
    action: item.valide ? "Situation validée" : "Situation mise à jour",
    detail: formatCoachStatus(item.statut, item.valide),
    date: formatCoachDate(item.createdAt),
  }));
});

const alerts = computed(() => {
  const result: Array<{
    type: "warning" | "info";
    text: string;
    date: string;
  }> = [];

  if (dashboard.value?.enAttente) {
    result.push({
      type: "warning",
      text: `${dashboard.value.enAttente} situation(s) attendent encore une validation`,
      date: "En cours",
    });
  }

  if (selectedPromotion.value) {
    result.push({
      type: "info",
      text: `Consultation de ${selectedPromotion.value.nom} (${selectedPromotion.value.annee})`,
      date: dashboard.value?.scope.referentiel.nom ?? "Référentiel",
    });
  }

  return result;
});

// Le coach charge son dashboard et un extrait d'apprenants dans le meme scope.
async function loadCoachDashboard() {
  loading.value = true;
  error.value = null;

  try {
    const query = selectedPromotionId.value
      ? { promotionId: selectedPromotionId.value }
      : undefined;

    const [dashboardData, apprenantsData] = await Promise.all([
      getCoachDashboard(query),
      getCoachApprenants({ ...query, page: 1, limit: 5 }),
    ]);

    dashboard.value = dashboardData;
    apprenants.value = apprenantsData.items;
    selectedPromotionId.value = dashboardData.scope.selectedPromotion?.id ?? "";
  } catch (e: any) {
    error.value = e.message || "Erreur lors du chargement du dashboard coach";
  } finally {
    loading.value = false;
    hasLoaded.value = true;
  }
}

function goToApprenant(id: string) {
  const promotionId = selectedPromotionId.value;
  const suffix = promotionId ? `?promotionId=${promotionId}` : "";
  router.push(`/coach/apprenants/${id}${suffix}`);
}

const statusClass = (item: CoachApprenantListItem) => {
  const latest = item.situations[0];
  if (!latest) return "bg-slate-100 text-slate-600";
  if (latest.valide) return "bg-emerald-100 text-emerald-600";
  if (latest.statut === "EN_STAGE" || latest.statut === "EN_EMPLOI") {
    return "bg-teal-50 text-[#009682]";
  }
  return "bg-amber-100 text-amber-600";
};

const statusLabel = (item: CoachApprenantListItem) => {
  const latest = item.situations[0];
  if (!latest) return "Aucune situation";
  return formatCoachStatus(latest.statut, latest.valide);
};

onMounted(loadCoachDashboard);
</script>

<template>
  <CoachLayout title="Tableau de bord Coach" active-menu="dashboard">
    <div class="space-y-5">
      <div v-if="error" class="rounded-xl bg-red-50 p-4 text-red-600">
        {{ error }}
      </div>

      <div
        v-if="!hasLoaded"
        class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
      >
        <PageLoadingState compact message="Chargement du périmètre coach..." />
      </div>

      <div
        v-else
        class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
      >
        <div
          class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
        >
          <div>
            <p class="text-sm font-semibold text-slate-900">
              Référentiel : {{ dashboard?.scope.referentiel.nom || "—" }}
            </p>
            <p class="mt-1 text-sm text-slate-500">
              Le coach consulte toujours les apprenants de son référentiel, avec
              une promotion locale sélectionnable.
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
                  ? "Chargement de la promotion active..."
                  : activePromotion
                    ? `Promotion active : ${activePromotion.nom} (${activePromotion.annee})`
                    : "Aucune promotion active détectée"
              }}
            </div>
          </div>

          <div class="w-full max-w-xs">
            <label class="mb-2 block text-sm font-medium text-slate-700"
              >Promotion consultée</label
            >
            <select
              v-model="selectedPromotionId"
              class="h-11 w-full rounded-lg border border-gray-200 px-4 text-sm text-gray-700 outline-none transition-colors focus:border-[#F16E00] focus:ring-2 focus:ring-orange-100"
              @change="loadCoachDashboard"
            >
              <option v-if="availablePromotions.length === 0" value="">
                {{ loading ? "Chargement des promotions..." : "Aucune promotion disponible" }}
              </option>
              <option
                v-for="promotion in availablePromotions"
                :key="promotion.id"
                :value="promotion.id"
              >
                {{ promotion.nom }} ({{ promotion.annee }}){{
                  promotion.estActive ? " · Active" : ""
                }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <div v-if="loading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article
          v-for="index in 4"
          :key="index"
          class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
        >
          <div class="animate-pulse">
            <div class="h-4 w-28 rounded bg-slate-200"></div>
            <div class="mt-4 h-9 w-20 rounded bg-slate-200"></div>
          </div>
        </article>
      </div>

      <template v-else>
        <!-- ── Stat cards ── -->
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article
            v-for="stat in stats"
            :key="stat.label"
            class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm text-slate-500">{{ stat.label }}</p>
                <p class="mt-1 text-3xl font-bold text-slate-900">
                  {{ stat.value }}
                </p>
              </div>
              <div
                :class="[
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg',
                  stat.iconBg,
                ]"
              >
                <!-- person -->
                <svg
                  v-if="stat.icon === 'person'"
                  :class="['h-5 w-5', stat.iconColor]"
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
                <!-- briefcase -->
                <svg
                  v-else-if="stat.icon === 'briefcase'"
                  :class="['h-5 w-5', stat.iconColor]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                </svg>
                <!-- trend chart -->
                <svg
                  v-else-if="stat.icon === 'trend'"
                  :class="['h-5 w-5', stat.iconColor]"
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
                <!-- warning triangle -->
                <svg
                  v-else
                  :class="['h-5 w-5', stat.iconColor]"
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
            </div>
          </article>
        </div>

        <!-- ── Main grid: students list + right panel ── -->
        <div class="grid gap-5 xl:grid-cols-[1fr_340px]">
          <!-- Mes apprenants -->
          <div class="rounded-xl border border-gray-100 bg-white shadow-sm">
            <div
              class="flex items-center justify-between px-6 py-5 border-b border-slate-100"
            >
              <h2 class="text-base font-bold text-slate-900">Mes apprenants</h2>
              <RouterLink
                to="/coach/apprenants"
                class="text-sm font-semibold text-orange-500 hover:underline"
              >
                Voir tout
              </RouterLink>
            </div>

            <div class="divide-y divide-slate-100 px-4 py-2">
              <div
                v-for="student in topApprenants"
                :key="student.id"
                class="flex items-center gap-4 rounded-xl px-2 py-4 hover:bg-slate-50 transition-colors cursor-pointer"
                @click="goToApprenant(student.id)"
              >
                <!-- Avatar -->
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F16E00] text-sm font-bold text-white"
                >
                  {{
                    `${student.user.prenom?.[0] || ""}${student.user.nom?.[0] || ""}`.toUpperCase()
                  }}
                </div>

                <!-- Info -->
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold text-slate-900">
                    {{ student.user.prenom }} {{ student.user.nom }}
                  </p>
                  <p class="text-xs text-slate-500">
                    {{ student.promotion.nom }} {{ student.promotion.annee }} •
                    {{ student.referentiel.nom }}
                  </p>
                </div>

                <!-- Status + chevron -->
                <div class="flex items-center gap-3 shrink-0">
                  <div class="text-right">
                    <p class="text-xs text-slate-500 mb-1">
                      {{ student._count.situations }} situation(s)
                    </p>
                    <span
                      :class="[
                        'rounded-full px-2.5 py-0.5 text-xs font-semibold',
                        statusClass(student),
                      ]"
                    >
                      {{ statusLabel(student) }}
                    </span>
                  </div>
                  <svg
                    class="h-4 w-4 text-slate-400 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <!-- Right column -->
          <div class="flex flex-col gap-5">
            <!-- Alertes -->
            <div class="rounded-xl border border-gray-100 bg-white shadow-sm">
              <div class="px-6 py-5 border-b border-slate-100">
                <h2 class="text-base font-bold text-slate-900">Alertes</h2>
              </div>
              <div class="divide-y divide-slate-100 px-5">
                <div
                  v-for="alert in alerts"
                  :key="alert.text"
                  class="flex items-start gap-3 py-4"
                >
                  <!-- warning icon -->
                  <svg
                    v-if="alert.type === 'warning'"
                    class="mt-0.5 h-5 w-5 shrink-0 text-amber-400"
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
                  <!-- info icon -->
                  <svg
                    v-else
                    class="mt-0.5 h-5 w-5 shrink-0 text-[#009682]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-slate-700 leading-snug">
                      {{ alert.text }}
                    </p>
                    <p class="mt-1 text-xs text-slate-400">{{ alert.date }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Activité récente -->
            <div class="rounded-xl border border-gray-100 bg-white shadow-sm">
              <div class="px-6 py-5 border-b border-slate-100">
                <h2 class="text-base font-bold text-slate-900">
                  Activité récente
                </h2>
              </div>
              <div class="divide-y divide-slate-100 px-5">
                <div
                  v-for="activity in activities"
                  :key="activity.id"
                  class="flex items-start gap-3 py-4"
                >
                  <!-- dot -->
                  <span
                    class="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#F16E00]"
                  ></span>
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-slate-900">
                      {{ activity.name }}
                    </p>
                    <p class="text-xs text-slate-500">
                      {{ activity.action }} • {{ activity.detail }}
                    </p>
                    <p class="mt-1 text-xs text-slate-400">
                      {{ activity.date }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </CoachLayout>
</template>
