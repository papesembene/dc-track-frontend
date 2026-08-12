<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import BackofficeLayout from "@/shared/layouts/BackofficeLayout.vue";
import {
  getEntreprises,
  createEntreprise,
  deleteEntreprise,
  type Entreprise,
} from "../api/entreprises.api";
import { showToast } from "../../../core/ui/toast";
import { confirm } from "../../../core/ui/sweet-alert";
import PageLoadingState from "@/shared/components/PageLoadingState.vue";
import EmptyState from "@/shared/components/EmptyState.vue";

/**
 * État des entreprises
 */
const entreprises = ref<Entreprise[]>([]);
const isLoading = ref(true);
const isCreating = ref(false);

/**
 * Nouveau formulaire d'entreprise
 */
const newEntreprise = ref({
  nom: "",
  secteur: "",
  adresse: "",
  telephone: "",
  email: "",
});

/**
 * Erreurs de validation du formulaire
 */
const formErrors = ref<Record<string, string>>({});

/**
 * Recherche
 */
const searchQuery = ref("");

/**
 * Filtres
 */
const filteredEntreprises = computed(() => {
  const q = searchQuery.value.toLowerCase();
  if (!q) return entreprises.value;
  return entreprises.value.filter(
    (e) =>
      e.nom.toLowerCase().includes(q) ||
      e.secteur?.toLowerCase().includes(q) ||
      e.email?.toLowerCase().includes(q),
  );
});

/**
 * Valide un email
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Valide un téléphone
 */
function isValidPhone(phone: string): boolean {
  return /^[\d\s\-+()]{8,}$/.test(phone);
}

/**
 * Charge les entreprises depuis l'API
 */
async function loadEntreprises() {
  isLoading.value = true;
  try {
    const data = await getEntreprises({ limit: 100 });
    entreprises.value = data.items;
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
 * Crée une nouvelle entreprise
 */
async function handleCreate() {
  // Réinitialiser les erreurs
  formErrors.value = {};
  let hasErrors = false;

  // Validation du nom
  if (!newEntreprise.value.nom.trim()) {
    formErrors.value.nom = "Le nom de l'entreprise est requis";
    hasErrors = true;
  }

  // Validation de l'email
  if (newEntreprise.value.email && !isValidEmail(newEntreprise.value.email)) {
    formErrors.value.email = "L'email n'est pas valide";
    hasErrors = true;
  }

  // Validation du téléphone
  if (newEntreprise.value.telephone && !isValidPhone(newEntreprise.value.telephone)) {
    formErrors.value.telephone = "Le numéro de téléphone n'est pas valide";
    hasErrors = true;
  }

  if (hasErrors) {
    return;
  }

  isCreating.value = true;
  try {
    await createEntreprise({
      nom: newEntreprise.value.nom,
      secteur: newEntreprise.value.secteur || undefined,
      adresse: newEntreprise.value.adresse || undefined,
      telephone: newEntreprise.value.telephone || undefined,
      email: newEntreprise.value.email || undefined,
    });
    showToast("Entreprise créée avec succès", "success");
    newEntreprise.value = {
      nom: "",
      secteur: "",
      adresse: "",
      telephone: "",
      email: "",
    };
    await loadEntreprises();
  } catch (error: any) {
    showToast(
      error?.response?.data?.message || "Erreur lors de la création",
      "error",
    );
  } finally {
    isCreating.value = false;
  }
}

/**
 * Supprime une entreprise
 */
async function handleDelete(id: string) {
  const confirmed = await confirm(
    "Êtes-vous sûr de vouloir supprimer cette entreprise ?",
    "Supprimer l'entreprise"
  );
  if (!confirmed) {
    return;
  }

  try {
    await deleteEntreprise(id);
    showToast("Entreprise supprimée avec succès", "success");
    await loadEntreprises();
  } catch (error: any) {
    showToast(
      error?.response?.data?.message || "Erreur lors de la suppression",
      "error",
    );
  }
}

/**
 * Format date
 */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR");
}

onMounted(() => {
  loadEntreprises();
});
</script>

<template>
  <BackofficeLayout title="Entreprises" active-menu="entreprises">
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
              <span class="text-xs font-semibold">Pôle Emploi · Actif</span>
            </div>
            <h2 class="text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">
              Entreprises
            </h2>
            <p class="mt-1 text-sm text-gray-500">
              Gérez les entreprises partenaires
            </p>
          </div>
          <div class="shrink-0 rounded-xl border border-orange-100 bg-orange-50 px-5 py-3 text-center">
            <p class="text-2xl font-bold text-[#F16E00]">{{ entreprises.length }}</p>
            <p class="mt-0.5 text-xs text-gray-500">Total</p>
          </div>
        </div>
      </div>

      <!-- ── Create Form ── -->
      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 class="mb-4 text-sm font-bold text-slate-900">
          Ajouter une entreprise
        </h3>
        <form
          @submit.prevent="handleCreate"
          class="grid gap-4 sm:grid-cols-2 lg:grid-cols-6"
        >
          <div class="lg:col-span-2">
            <label class="mb-1 block text-xs font-semibold text-slate-600">
              Nom <span class="text-red-500">*</span>
            </label>
            <input
              v-model="newEntreprise.nom"
              type="text"
              required
              class="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors focus:border-orange-400"
              :class="
                formErrors.nom ? 'border-red-500 bg-red-50' : 'border-slate-300'
              "
              placeholder="Nom de l'entreprise"
            />
            <p v-if="formErrors.nom" class="mt-1 text-xs text-red-500">
              {{ formErrors.nom }}
            </p>
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-slate-600">
              Secteur
            </label>
            <input
              v-model="newEntreprise.secteur"
              type="text"
              class="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-orange-400"
              placeholder="Secteur d'activité"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-slate-600">
              Téléphone
            </label>
            <input
              v-model="newEntreprise.telephone"
              type="tel"
              class="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors focus:border-orange-400"
              :class="
                formErrors.telephone
                  ? 'border-red-500 bg-red-50'
                  : 'border-slate-300'
              "
              placeholder="Téléphone"
            />
            <p v-if="formErrors.telephone" class="mt-1 text-xs text-red-500">
              {{ formErrors.telephone }}
            </p>
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-slate-600">
              Email
            </label>
            <input
              v-model="newEntreprise.email"
              type="email"
              class="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors focus:border-orange-400"
              :class="
                formErrors.email
                  ? 'border-red-500 bg-red-50'
                  : 'border-slate-300'
              "
              placeholder="Email"
            />
            <p v-if="formErrors.email" class="mt-1 text-xs text-red-500">
              {{ formErrors.email }}
            </p>
          </div>
          <div class="flex items-end">
            <button
              type="submit"
              :disabled="isCreating"
              class="w-full rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-orange-500/20 transition-colors hover:bg-orange-600 disabled:opacity-50"
            >
              {{ isCreating ? "Création..." : "Ajouter" }}
            </button>
          </div>
        </form>
      </div>

      <!-- ── Search ── -->
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 flex-1 min-w-52 items-center gap-2 rounded-xl border border-slate-300 px-3 focus-within:border-orange-400 transition-colors"
        >
          <svg
            class="h-4 w-4 shrink-0 text-slate-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Rechercher une entreprise..."
            class="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      <!-- ── Entreprises List ── -->
      <div
        class="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
      >
        <!-- Loading -->
        <PageLoadingState v-if="isLoading" compact />

        <!-- Empty -->
        <div
          v-else-if="filteredEntreprises.length === 0"
          class="p-8"
        >
          <EmptyState title="Aucune entreprise trouvée" compact />
        </div>

        <!-- Table -->
        <table v-else class="w-full text-left">
          <thead class="bg-slate-50">
            <tr>
              <th
                class="px-5 py-3.5 text-xs font-semibold uppercase text-slate-400"
              >
                Nom
              </th>
              <th
                class="px-5 py-3.5 text-xs font-semibold uppercase text-slate-400"
              >
                Secteur
              </th>
              <th
                class="px-5 py-3.5 text-xs font-semibold uppercase text-slate-400"
              >
                Contact
              </th>
              <th
                class="px-5 py-3.5 text-xs font-semibold uppercase text-slate-400"
              >
                Date création
              </th>
              <th
                class="px-5 py-3.5 text-xs font-semibold uppercase text-slate-400 text-right"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="entreprise in filteredEntreprises"
              :key="entreprise.id"
              class="transition-colors hover:bg-slate-50"
            >
              <td class="px-5 py-4">
                <p class="text-sm font-semibold text-slate-900">
                  {{ entreprise.nom }}
                </p>
              </td>
              <td class="px-5 py-4 text-sm text-slate-600">
                {{ entreprise.secteur || "—" }}
              </td>
              <td class="px-5 py-4">
                <div class="text-sm text-slate-600">
                  <p v-if="entreprise.email">{{ entreprise.email }}</p>
                  <p v-if="entreprise.telephone" class="text-xs text-slate-400">
                    {{ entreprise.telephone }}
                  </p>
                </div>
              </td>
              <td class="px-5 py-4 text-sm text-slate-500">
                {{ formatDate(entreprise.createdAt) }}
              </td>
              <td class="px-5 py-4 text-right">
                <button
                  @click="handleDelete(entreprise.id)"
                  class="inline-flex items-center gap-1 text-sm font-semibold text-red-500 hover:text-red-600"
                >
                  <svg
                    class="h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path
                      d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                    />
                  </svg>
                  Supprimer
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </BackofficeLayout>
</template>
