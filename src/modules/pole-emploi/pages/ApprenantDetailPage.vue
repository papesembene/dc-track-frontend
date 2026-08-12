<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, RouterLink } from "vue-router";
import BackofficeLayout from "@/shared/layouts/BackofficeLayout.vue";
import {
  getApprenantById,
  type ApprenantDetail,
  type SituationItem,
} from "../api/apprenants.api";
import { getDocumentsByApprenant, type Document } from "../api/documents.api";
import { extractFileName, resolveFileUrl } from "@/modules/apprenant/api/documents.api";
import { showToast } from "../../../core/ui/toast";
import PageLoadingState from "@/shared/components/PageLoadingState.vue";

const route = useRoute();
const returnQuery = computed(() => route.query);
const activeTab = ref<"situations" | "documents" | "informations">(
  "situations",
);

// Data state
const loading = ref(true);
const error = ref<string | null>(null);
const apprenantData = ref<ApprenantDetail | null>(null);

// Computed properties for apprenant info
const apprenant = computed(() => {
  if (!apprenantData.value) return null;
  const { user } = apprenantData.value;
  const initials =
    `${user.prenom.charAt(0)}${user.nom.charAt(0)}`.toUpperCase();
  return {
    nom: user.nom,
    prenom: user.prenom,
    initials,
    email: user.email,
    telephone: apprenantData.value.telephone || "—",
    promo: apprenantData.value.promotion.nom,
    referentiel: apprenantData.value.referentiel.nom,
    role: "Apprenant",
    totalSituations: apprenantData.value.situations.length,
  };
});

// Format date for display
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR");
  } catch {
    return dateStr;
  }
}

// Get context info for a document (situation name)
function getDocumentContext(doc: Document): string {
  // Find the situation that matches this document
  const situation = situations.value.find((s) => s.id === doc.situationId);
  return situation ? `${situation.type} - ${situation.entreprise}` : "-";
}

// Transform situations from API
const situations = computed(() => {
  if (!apprenantData.value) return [];
  return apprenantData.value.situations.map((sit: SituationItem) => ({
    id: sit.id,
    type: sit.statut,
    status: sit.valide ? "Validée" : "En attente",
    statusClass: sit.valide
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : "bg-amber-100 text-amber-700 border-amber-200",
    entreprise: sit.entreprise?.nom || sit.nomEntrepriseLibre || "—",
    debut: formatDate(sit.dateDebut),
    fin: formatDate(sit.dateFin),
    createdAt: formatDate(sit.createdAt),
    description: sit.commentaire || "",
    valide: sit.valide,
  }));
});

// Documents (loaded from API)
const documents = ref<Document[]>([]);
const documentsLoading = ref(false);

/**
 * Computed: only documents linked to a situation
 */
const filteredDocuments = computed(() => {
  return documents.value.filter((d) => d.situationId);
});

// CV global (hors situation) renvoyé dans le détail apprenant.
const cvDocument = computed(() => apprenantData.value?.cvDocument ?? null);

/**
 * Computed: whether to show the documents tab
 */
/**
 * Charge les documents depuis l'API
 */
async function loadDocuments() {
  if (!apprenantData.value?.localId) {
    documents.value = [];
    return;
  }
  documentsLoading.value = true;
  try {
    documents.value = await getDocumentsByApprenant(apprenantData.value.localId);
  } catch (error) {
    console.error("Erreur chargement documents:", error);
  } finally {
    documentsLoading.value = false;
  }
}

// Load data
async function loadApprenant() {
  const id = route.params.id as string;
  if (!id) {
    error.value = "ID apprenant manquant";
    loading.value = false;
    return;
  }

  try {
    loading.value = true;
    error.value = null;
    const data = await getApprenantById(id);
    if (data) {
      apprenantData.value = data;
      // Charger les documents après avoir obtenu l'ID de l'apprenant
      await loadDocuments();
    } else {
      error.value = "Apprenant non trouvé";
    }
  } catch (err: any) {
    error.value = err?.message || "Erreur lors du chargement";
    showToast("Erreur lors du chargement des données", "error");
  } finally {
    loading.value = false;
  }
}

function validateSituation(id: string) {
  const s = situations.value.find((sit) => sit.id === id);
  if (s) {
    s.status = "Validée";
    s.statusClass = "bg-emerald-100 text-emerald-700 border-emerald-200";
    showToast("Situation validée avec succès", "success");
  }
}

function rejectSituation(_id: string) {
  showToast("Fonctionnalité en cours de développement", "info");
}

onMounted(() => {
  loadApprenant();
});
</script>

<template>
  <BackofficeLayout title="Détail apprenant" active-menu="apprenants">
    <!-- Loading state -->
    <PageLoadingState v-if="loading" />

    <!-- Error state -->
    <div
      v-else-if="error"
      class="rounded-xl border border-red-200 bg-red-50 p-6 text-center"
    >
      <p class="text-red-600">{{ error }}</p>
    </div>

    <!-- Content -->
    <div v-else-if="apprenant" class="space-y-5">
      <!-- ── Breadcrumb ── -->
      <nav class="flex items-center gap-1.5 text-sm text-slate-500">
        <RouterLink
          to="/dashboard"
          class="hover:text-slate-700 transition-colors"
          >Tableau de bord</RouterLink
        >
        <svg
          class="h-3.5 w-3.5 text-slate-300"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <RouterLink
          :to="{ path: '/apprenants', query: returnQuery }"
          class="hover:text-slate-700 transition-colors"
          >Apprenants</RouterLink
        >
        <svg
          class="h-3.5 w-3.5 text-slate-300"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        <span class="font-semibold text-slate-800"
          >{{ apprenant.nom }} {{ apprenant.prenom }}</span
        >
      </nav>

      <!-- ── Hero Banner ── -->
      <div
        class="relative overflow-hidden rounded-xl border border-gray-100 bg-white p-5 shadow-sm lg:p-6"
      >
        <div
          class="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center"
        >
          <div
            class="flex h-20 w-20 items-center justify-center rounded-xl border-4 border-orange-100 bg-orange-50 text-2xl font-bold text-[#F16E00] sm:h-24 sm:w-24"
          >
            {{ apprenant.initials }}
          </div>

          <div class="flex-1">
            <div
              class="mb-2 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[#F16E00]"
            >
              <span class="h-1.5 w-1.5 rounded-full bg-[#009682]"></span>
              <span class="text-xs font-semibold">{{ apprenant.role }}</span>
            </div>
            <h2 class="text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">
              {{ apprenant.nom }} {{ apprenant.prenom }}
            </h2>
            <p class="mt-1 text-sm text-gray-500">{{ apprenant.email }}</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <span
                class="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-[#F16E00]"
                >{{ apprenant.promo }}</span
              >
              <span
                class="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-[#009682]"
                >{{ apprenant.referentiel }}</span
              >
            </div>
          </div>

          <div class="shrink-0 rounded-xl border border-orange-100 bg-orange-50 px-6 py-3 text-center">
            <p class="text-3xl font-bold text-[#F16E00]">
              {{ apprenant.totalSituations }}
            </p>
            <p class="mt-0.5 text-xs text-gray-500">Situations</p>
          </div>
        </div>
      </div>

      <!-- ── Tabs + content ── -->
      <section class="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <!-- Tab bar -->
        <div class="border-b border-slate-100 px-5">
          <div class="flex">
            <button
              class="flex items-center gap-2 border-b-2 px-4 py-4 text-sm font-medium transition-colors"
              :class="
                activeTab === 'situations'
                  ? 'border-orange-500 text-orange-500'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              "
              @click="activeTab = 'situations'"
            >
              <svg
                class="h-4 w-4"
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
              Situations
              <span
                class="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-600"
                >{{ situations.length }}</span
              >
            </button>
            <button
              class="flex items-center gap-2 border-b-2 px-4 py-4 text-sm font-medium transition-colors"
              :class="
                activeTab === 'documents'
                  ? 'border-orange-500 text-orange-500'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              "
              @click="activeTab = 'documents'"
            >
              <svg
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Documents
            </button>
            <button
              class="flex items-center gap-2 border-b-2 px-4 py-4 text-sm font-medium transition-colors"
              :class="
                activeTab === 'informations'
                  ? 'border-orange-500 text-orange-500'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              "
              @click="activeTab = 'informations'"
            >
              <svg
                class="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              Informations
            </button>
          </div>
        </div>

        <!-- ── Situations tab ── -->
        <div
          v-if="activeTab === 'situations'"
          class="divide-y divide-slate-100"
        >
          <div
            v-if="situations.length === 0"
            class="p-6 text-center text-slate-500"
          >
            Aucune situation trouvée
          </div>
          <article v-for="sit in situations" :key="sit.id" class="p-6">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div class="flex items-center gap-3">
                <!-- type icon -->
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50"
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
                    <rect x="2" y="7" width="20" height="14" rx="2" />
                    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                  </svg>
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <h3 class="text-sm font-bold text-slate-900">
                      {{ sit.type }}
                    </h3>
                    <span
                      class="rounded-full border px-2.5 py-0.5 text-xs font-medium"
                      :class="sit.statusClass"
                    >
                      {{ sit.status }}
                    </span>
                  </div>
                  <p class="mt-0.5 text-sm font-medium text-slate-600">
                    {{ sit.entreprise || '—' }}
                  </p>
                </div>
              </div>

              <!-- Actions only for pending -->
              <div
                v-if="sit.status === 'En attente'"
                class="flex items-center gap-2"
              >
                <button
                  class="flex items-center gap-1.5 rounded-xl border border-orange-400 px-3.5 py-1.5 text-sm font-semibold text-orange-500 transition-colors hover:bg-orange-50"
                  @click="rejectSituation(sit.id)"
                >
                  <svg
                    class="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  Rejeter
                </button>
                <button
                  class="flex items-center gap-1.5 rounded-xl bg-orange-500 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm shadow-orange-500/20 transition-colors hover:bg-orange-600"
                  @click="validateSituation(sit.id)"
                >
                  <svg
                    class="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Valider
                </button>
              </div>
            </div>

            <!-- Dates grid -->
            <div
              class="mt-4 grid gap-4 rounded-xl bg-slate-50 px-4 py-3 sm:grid-cols-3"
            >
              <div>
                <p
                  class="text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                >
                  Date de début
                </p>
                <p class="mt-0.5 text-sm font-semibold text-slate-900">
                  {{ sit.debut }}
                </p>
              </div>
              <div>
                <p
                  class="text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                >
                  Date de fin
                </p>
                <p class="mt-0.5 text-sm font-semibold text-slate-900">
                  {{ sit.fin }}
                </p>
              </div>
              <div>
                <p
                  class="text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                >
                  Créée le
                </p>
                <p class="mt-0.5 text-sm font-semibold text-slate-900">
                  {{ sit.createdAt }}
                </p>
              </div>
            </div>

            <div v-if="sit.description" class="mt-4">
              <p
                class="text-[11px] font-semibold uppercase tracking-wide text-slate-400"
              >
                Description
              </p>
              <p class="mt-1 text-sm text-slate-700">{{ sit.description }}</p>
            </div>
          </article>
        </div>

        <!-- ── Documents tab ── -->
        <div
          v-else-if="activeTab === 'documents'"
          class="grid gap-4 p-6 md:grid-cols-2"
        >
          <div
            v-if="documentsLoading"
            class="col-span-full flex items-center justify-center py-8"
          >
            <div
              class="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"
            ></div>
            <span class="ml-2 text-sm text-slate-500">Chargement...</span>
          </div>
          <article
            v-else-if="cvDocument?.fichier"
            class="col-span-full flex items-center justify-between rounded-2xl border border-orange-200 bg-orange-50 p-4"
          >
            <div>
              <p class="text-sm font-bold text-slate-900">CV apprenant</p>
              <p class="mt-1 text-xs text-slate-500">
                {{ extractFileName(cvDocument.fichier) }}
              </p>
            </div>
            <a
              :href="resolveFileUrl(cvDocument.fichier)"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center rounded-xl border border-orange-300 px-3 py-2 text-sm font-semibold text-orange-600 hover:bg-white"
            >
              Ouvrir le CV
            </a>
          </article>
          <div
            v-else-if="filteredDocuments.length === 0 && !documentsLoading"
            class="col-span-full py-8 text-center text-slate-500"
          >
            Aucun document pour le moment
          </div>
          <article
            v-for="doc in filteredDocuments"
            :key="doc.id"
            class="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div class="flex items-center gap-4">
              <div
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50"
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
                  <path
                    d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                  />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <div>
                <span
                  class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-600"
                  >{{ doc.type }}</span
                >
                <p class="mt-1.5 text-sm font-semibold text-slate-800">
                  {{ getDocumentContext(doc) }}
                </p>
                <p class="text-xs text-slate-400">
                  Uploadé le {{ formatDate(doc.createdAt) }}
                </p>
              </div>
            </div>
            <button
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-300 text-orange-500 transition-colors hover:bg-orange-50"
            >
              <svg
                class="h-4 w-4"
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
            </button>
          </article>
        </div>

        <!-- ── Informations tab ── -->
        <div v-else class="grid gap-6 p-6 lg:grid-cols-2">
          <section
            class="rounded-2xl border border-slate-100 bg-slate-50/60 p-5"
          >
            <h3 class="mb-4 text-sm font-bold text-slate-900">
              Informations personnelles
            </h3>
            <div class="space-y-4">
              <div>
                <p
                  class="text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                >
                  Nom complet
                </p>
                <p class="mt-0.5 text-sm font-semibold text-slate-900">
                  {{ apprenant.nom }} {{ apprenant.prenom }}
                </p>
              </div>
              <div>
                <p
                  class="text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                >
                  Email
                </p>
                <p class="mt-0.5 text-sm font-semibold text-slate-900">
                  {{ apprenant.email }}
                </p>
              </div>
              <div>
                <p
                  class="text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                >
                  Téléphone
                </p>
                <p class="mt-0.5 text-sm font-semibold text-slate-900">
                  {{ apprenant.telephone }}
                </p>
              </div>
            </div>
          </section>

          <section
            class="rounded-2xl border border-slate-100 bg-slate-50/60 p-5"
          >
            <h3 class="mb-4 text-sm font-bold text-slate-900">Formation</h3>
            <div class="space-y-4">
              <div>
                <p
                  class="text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                >
                  Promotion
                </p>
                <p class="mt-0.5 text-sm font-semibold text-slate-900">
                  {{ apprenant.promo }}
                </p>
              </div>
              <div>
                <p
                  class="text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                >
                  Référentiel
                </p>
                <p class="mt-0.5 text-sm font-semibold text-slate-900">
                  {{ apprenant.referentiel }}
                </p>
              </div>
              <div>
                <p
                  class="text-[11px] font-semibold uppercase tracking-wide text-slate-400"
                >
                  Rôle
                </p>
                <span
                  class="mt-1 inline-block rounded-full border border-slate-300 bg-white px-3 py-0.5 text-xs font-semibold text-slate-600"
                >
                  {{ apprenant.role }}
                </span>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  </BackofficeLayout>
</template>
