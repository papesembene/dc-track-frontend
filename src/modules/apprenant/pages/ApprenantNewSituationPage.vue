<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import Swal from "sweetalert2";
import { showToast } from "../../../core/ui/toast";
import ApprenantLayout from "../../../shared/layouts/ApprenantLayout.vue";
import {
  getEntreprises,
  createSituationForApprenant,
  type UiSituationType,
  type CompanyMode,
  type EntreprisePartner,
} from "../api/situations.api";

const router = useRouter();
const isLoading = ref(false);
const form = reactive({
  statut: "",
  entrepriseMode: "PARTENAIRE" as "PARTENAIRE" | "EXTERNE",
  entrepriseId: "",
  nomEntrepriseLibre: "",
  secteurEntrepriseLibre: "",
  adresseEntrepriseLibre: "",
  dateDebut: "",
  dateFin: "",
  commentaire: "",
});

const selectedType = ref<UiSituationType>("STAGE");
const companyMode = ref<CompanyMode>("PARTNER");

// Static type options (required for type selector UI)
const typeOptions: Array<{ key: UiSituationType; label: string }> = [
  { key: "STAGE", label: "Stage" },
  { key: "EMPLOI", label: "Emploi" },
  { key: "ALTERNANCE", label: "Alternance" },
  { key: "RECHERCHE", label: "Recherche d'emploi" },
  { key: "PROJET", label: "Projet perso" },
];

// Partner list — populated from API when available
const partners = ref<EntreprisePartner[]>([]);
const isLoadingPartners = ref(false);
const requiresCompany = computed(
  () => selectedType.value !== "PROJET" && selectedType.value !== "RECHERCHE",
);
const requiresStartDate = computed(
  () => selectedType.value !== "PROJET" && selectedType.value !== "RECHERCHE",
);

const loadPartners = async () => {
  isLoadingPartners.value = true;
  try {
    partners.value = await getEntreprises(1, 100);
  } catch (error: any) {
    const status = error?.response?.status;
    if (status === 403) {
      partners.value = [];
      companyMode.value = "EXTERNAL";
      form.entrepriseId = "";
      showToast(
        "Votre rôle ne peut pas lister les entreprises partenaires. Utilisez 'Entreprise externe'.",
        "info",
      );
      return;
    }
    showToast("Impossible de charger les entreprises partenaires", "error");
  } finally {
    isLoadingPartners.value = false;
  }
};

const validateForm = () => {
  const isPartnerMode = companyMode.value === "PARTNER";

  if (requiresCompany.value && isPartnerMode && !form.entrepriseId) {
    showToast("Veuillez sélectionner une entreprise partenaire", "error");
    return false;
  }

  if (requiresCompany.value && !isPartnerMode && !form.nomEntrepriseLibre.trim()) {
    showToast("Le nom de l'entreprise externe est obligatoire", "error");
    return false;
  }

  if (requiresStartDate.value && !form.dateDebut) {
    showToast("La date de début est obligatoire", "error");
    return false;
  }

  if (form.dateDebut && form.dateFin) {
    const start = new Date(form.dateDebut);
    const end = new Date(form.dateFin);
    if (
      !Number.isNaN(start.getTime()) &&
      !Number.isNaN(end.getTime()) &&
      end < start
    ) {
      showToast("La date de fin doit être après la date de début", "error");
      return false;
    }
  }

  return true;
};

const onSubmit = async () => {
  if (!validateForm()) return;

  isLoading.value = true;
  try {
    const statutMap: Record<UiSituationType, string> = {
      STAGE: "EN_STAGE",
      EMPLOI: "EN_EMPLOI",
      ALTERNANCE: "POURSUITE_ETUDES",
      RECHERCHE: "RECHERCHE_EMPLOI",
      PROJET: "PROJET_PERSO",
    };

    const isPartnerMode = companyMode.value === "PARTNER";
    const payload: Parameters<typeof createSituationForApprenant>[0] = {
      statut: statutMap[selectedType.value],
      dateDebut: form.dateDebut || undefined,
      dateFin: form.dateFin || undefined,
      commentaire: form.commentaire.trim() || undefined,
    };
    if (requiresCompany.value) {
      if (isPartnerMode) {
        payload.entrepriseId = form.entrepriseId || undefined;
      } else {
        payload.nomEntrepriseLibre = form.nomEntrepriseLibre || undefined;
        payload.secteurEntrepriseLibre = form.secteurEntrepriseLibre || undefined;
        payload.adresseEntrepriseLibre = form.adresseEntrepriseLibre || undefined;
      }
    }
    await createSituationForApprenant(payload);
    showToast("Situation créée avec succès", "success");

    const result = await Swal.fire({
      title: "Situation enregistrée",
      text: "Voulez-vous ajouter des documents maintenant ?",
      icon: "success",
      showCancelButton: true,
      confirmButtonText: "Oui, ajouter",
      cancelButtonText: "Plus tard",
      reverseButtons: true,
      customClass: {
        confirmButton:
          "inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white",
        cancelButton:
          "inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700",
      },
      buttonsStyling: false,
    });

    if (result.isConfirmed) {
      router.push("/documents");
      return;
    }

    showToast("Vous pourrez ajouter les documents plus tard", "info");
    router.push("/situations");
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    const message = Array.isArray(apiMessage)
      ? apiMessage.join(", ")
      : apiMessage || "Erreur lors de la création de la situation";
    showToast(message, "error");
  } finally {
    isLoading.value = false;
  }
};

const onCancel = () => router.push("/situations");

watch(selectedType, (value) => {
  // Recherche d'emploi et projet perso ne nécessitent pas d'entreprise.
  if (value === "PROJET" || value === "RECHERCHE") {
    form.entrepriseId = "";
    form.nomEntrepriseLibre = "";
    form.secteurEntrepriseLibre = "";
    form.adresseEntrepriseLibre = "";
  }
});

onMounted(() => {
  loadPartners();
});
</script>

<template>
  <ApprenantLayout title="Nouvelle situation" active-menu="situations">
    <div class="mx-auto max-w-3xl">
      <!-- Page hero -->
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-extrabold text-slate-900">
            Déclarer une situation
          </h2>
          <p class="mt-1 text-sm text-slate-500">
            Remplissez les informations concernant votre situation
            professionnelle
          </p>
        </div>
        <button
          type="button"
          class="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100"
          @click="onCancel"
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
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Retour
        </button>
      </div>

      <form class="space-y-5" @submit.prevent="onSubmit">
        <!-- ── Section 1: Type de situation ── -->
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="mb-5 flex items-center gap-3">
            <div
              class="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white shadow-md shadow-orange-500/30"
            >
              1
            </div>
            <p class="text-sm font-bold text-slate-800">Type de situation</p>
            <span
              class="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-500"
              >Requis</span
            >
          </div>
          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <button
              v-for="opt in typeOptions"
              :key="opt.key"
              type="button"
              class="group flex flex-col items-center gap-3 rounded-2xl border-2 px-4 py-5 transition-all duration-200"
              :class="
                selectedType === opt.key
                  ? 'border-orange-500 bg-gradient-to-b from-orange-50 to-white shadow-md shadow-orange-500/10'
                  : 'border-slate-200 hover:border-orange-300 hover:bg-orange-50/40'
              "
              @click="selectedType = opt.key"
            >
              <div
                class="flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-200"
                :class="
                  selectedType === opt.key
                    ? 'bg-orange-500 shadow-lg shadow-orange-500/30'
                    : 'bg-slate-100 group-hover:bg-orange-100'
                "
              >
                <!-- Stage: briefcase -->
                <svg
                  v-if="opt.key === 'STAGE'"
                  class="h-5 w-5 transition-colors"
                  :class="
                    selectedType === opt.key
                      ? 'text-white'
                      : 'text-slate-400 group-hover:text-orange-500'
                  "
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                </svg>
                <!-- Emploi: building -->
                <svg
                  v-else-if="opt.key === 'EMPLOI'"
                  class="h-5 w-5 transition-colors"
                  :class="
                    selectedType === opt.key
                      ? 'text-white'
                      : 'text-slate-400 group-hover:text-orange-500'
                  "
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <!-- Alternance: calendar -->
                <svg
                  v-else-if="opt.key === 'ALTERNANCE'"
                  class="h-5 w-5 transition-colors"
                  :class="
                    selectedType === opt.key
                      ? 'text-white'
                      : 'text-slate-400 group-hover:text-orange-500'
                  "
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <!-- Recherche: search -->
                <svg
                  v-else-if="opt.key === 'RECHERCHE'"
                  class="h-5 w-5 transition-colors"
                  :class="
                    selectedType === opt.key
                      ? 'text-white'
                      : 'text-slate-400 group-hover:text-orange-500'
                  "
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle cx="11" cy="11" r="7" />
                  <line x1="16.65" y1="16.65" x2="21" y2="21" />
                </svg>
                <!-- Projet: lightbulb -->
                <svg
                  v-else
                  class="h-5 w-5 transition-colors"
                  :class="
                    selectedType === opt.key
                      ? 'text-white'
                      : 'text-slate-400 group-hover:text-orange-500'
                  "
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <line x1="9" y1="18" x2="15" y2="18" />
                  <line x1="10" y1="22" x2="14" y2="22" />
                  <path
                    d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"
                  />
                </svg>
              </div>
              <span
                class="text-xs font-bold transition-colors"
                :class="
                  selectedType === opt.key
                    ? 'text-orange-600'
                    : 'text-slate-600 group-hover:text-orange-500'
                "
              >
                {{ opt.label }}
              </span>
            </button>
          </div>
        </div>

        <!-- ── Section 2: Entreprise ── -->
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="mb-5 flex items-center gap-3">
            <div
              class="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white shadow-md shadow-orange-500/30"
            >
              2
            </div>
            <p class="text-sm font-bold text-slate-800">Entreprise</p>
            <span
              v-if="requiresCompany"
              class="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-500"
              >Requis</span
            >
            <span
              v-else
              class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500"
              >Non requis</span
            >
          </div>

          <div
            v-if="!requiresCompany"
            class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
          >
            Cette situation ne nécessite pas d'entreprise.
          </div>

          <!-- Company mode toggle -->
          <div v-else class="mb-5 grid gap-3 sm:grid-cols-2">
            <!-- Partenaire -->
            <button
              type="button"
              class="flex items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition-all duration-200"
              :class="
                companyMode === 'PARTNER'
                  ? 'border-orange-500 bg-gradient-to-b from-orange-50 to-white shadow-md shadow-orange-500/10'
                  : 'border-slate-200 hover:border-orange-300 hover:bg-orange-50/40'
              "
              @click="companyMode = 'PARTNER'"
            >
              <div
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all"
                :class="
                  companyMode === 'PARTNER'
                    ? 'bg-orange-500 shadow-lg shadow-orange-500/30'
                    : 'bg-slate-100'
                "
              >
                <svg
                  class="h-5 w-5 transition-colors"
                  :class="
                    companyMode === 'PARTNER' ? 'text-white' : 'text-slate-400'
                  "
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <div>
                <p
                  class="text-sm font-bold"
                  :class="
                    companyMode === 'PARTNER'
                      ? 'text-orange-600'
                      : 'text-slate-800'
                  "
                >
                  Entreprise partenaire
                </p>
                <p class="mt-0.5 text-xs text-slate-500">
                  Sélectionner dans la liste
                </p>
              </div>
            </button>

            <!-- Externe -->
            <button
              type="button"
              class="flex items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition-all duration-200"
              :class="
                companyMode === 'EXTERNAL'
                  ? 'border-orange-500 bg-gradient-to-b from-orange-50 to-white shadow-md shadow-orange-500/10'
                  : 'border-slate-200 hover:border-orange-300 hover:bg-orange-50/40'
              "
              @click="companyMode = 'EXTERNAL'"
            >
              <div
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all"
                :class="
                  companyMode === 'EXTERNAL'
                    ? 'bg-orange-500 shadow-lg shadow-orange-500/30'
                    : 'bg-slate-100'
                "
              >
                <svg
                  class="h-5 w-5 transition-colors"
                  :class="
                    companyMode === 'EXTERNAL' ? 'text-white' : 'text-slate-400'
                  "
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </div>
              <div>
                <p
                  class="text-sm font-bold"
                  :class="
                    companyMode === 'EXTERNAL'
                      ? 'text-orange-600'
                      : 'text-slate-800'
                  "
                >
                  Entreprise externe
                </p>
                <p class="mt-0.5 text-xs text-slate-500">Saisir manuellement</p>
              </div>
            </button>
          </div>

          <!-- Partner select -->
          <div v-if="requiresCompany && companyMode === 'PARTNER'">
            <label class="mb-2 block text-sm font-semibold text-slate-700"
              >Sélectionner l'entreprise partenaire
              <span class="text-red-500">*</span></label
            >
            <div class="relative">
              <select
                v-model="form.entrepriseId"
                class="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 pr-10 text-sm text-slate-700 outline-none transition-colors focus:border-orange-400 focus:bg-white"
                :disabled="isLoadingPartners"
              >
                <option value="" v-if="isLoadingPartners">
                  Chargement des entreprises...
                </option>
                <option value="" v-else-if="partners.length === 0">
                  Aucune entreprise disponible
                </option>
                <option value="" v-else>Sélectionner une entreprise</option>
                <option
                  v-for="item in partners"
                  :key="item.id"
                  :value="item.id"
                >
                  {{ item.nom }}
                </option>
              </select>
              <svg
                class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>

          <!-- External company fields -->
          <div v-else-if="requiresCompany" class="grid gap-4 sm:grid-cols-3">
            <div class="sm:col-span-3">
              <label class="mb-2 block text-sm font-semibold text-slate-700"
                >Nom de l'entreprise <span class="text-red-500">*</span></label
              >
              <input
                v-model="form.nomEntrepriseLibre"
                type="text"
                placeholder="Ex : WebCorp Sénégal"
                class="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition-colors focus:border-orange-400 focus:bg-white"
              />
            </div>
            <div>
              <label class="mb-2 block text-sm font-semibold text-slate-700"
                >Secteur</label
              >
              <input
                v-model="form.secteurEntrepriseLibre"
                type="text"
                placeholder="Ex : Services Web"
                class="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition-colors focus:border-orange-400 focus:bg-white"
              />
            </div>
            <div class="sm:col-span-2">
              <label class="mb-2 block text-sm font-semibold text-slate-700"
                >Adresse</label
              >
              <input
                v-model="form.adresseEntrepriseLibre"
                type="text"
                placeholder="Ex : Sacré-Coeur, Dakar"
                class="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition-colors focus:border-orange-400 focus:bg-white"
              />
            </div>
          </div>
        </div>

        <!-- ── Section 3: Période ── -->
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="mb-5 flex items-center gap-3">
            <div
              class="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white shadow-md shadow-orange-500/30"
            >
              3
            </div>
            <p class="text-sm font-bold text-slate-800">Période</p>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="mb-2 block text-sm font-semibold text-slate-700"
                >Date de début
                <span v-if="requiresStartDate" class="text-red-500">*</span>
                <span v-else class="font-normal text-slate-400"
                  >(optionnelle)</span
                ></label
              >
              <input
                v-model="form.dateDebut"
                type="date"
                class="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition-colors focus:border-orange-400 focus:bg-white"
              />
            </div>
            <div>
              <label class="mb-2 block text-sm font-semibold text-slate-700"
                >Date de fin
                <span class="text-slate-400 font-normal"
                  >(optionnelle)</span
                ></label
              >
              <input
                v-model="form.dateFin"
                type="date"
                class="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-700 outline-none transition-colors focus:border-orange-400 focus:bg-white"
              />
              <p class="mt-1.5 flex items-center gap-1 text-xs text-slate-400">
                <svg
                  class="h-3 w-3 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {{
                  requiresStartDate
                    ? "Laisser vide si la situation est en cours"
                    : "Date facultative pour projet perso ou recherche d'emploi"
                }}
              </p>
            </div>
          </div>
        </div>

        <!-- ── Section 4: Description ── -->
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="mb-5 flex items-center gap-3">
            <div
              class="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white shadow-md shadow-orange-500/30"
            >
              4
            </div>
            <p class="text-sm font-bold text-slate-800">Description</p>
            <span
              class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500"
              >Optionnelle</span
            >
          </div>
          <textarea
            v-model="form.commentaire"
            rows="5"
            placeholder="Décrivez votre situation professionnelle, vos missions, vos responsabilités..."
            class="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition-colors focus:border-orange-400 focus:bg-white"
          />
          <p class="mt-1.5 flex items-center gap-1 text-xs text-slate-400">
            <svg
              class="h-3 w-3 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Vous pouvez ajouter des détails complémentaires si nécessaire
          </p>
        </div>

        <!-- ── Actions ── -->
        <div class="flex items-center justify-end gap-3 pt-1">
          <button
            type="button"
            class="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-100"
            @click="onCancel"
          >
            Annuler
          </button>
          <button
            type="submit"
            :disabled="isLoading"
            class="inline-flex items-center gap-2 rounded-lg bg-[#F16E00] px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:-translate-y-0.5 hover:bg-[#d95f00] hover:shadow-lg disabled:translate-y-0 disabled:opacity-70 disabled:shadow-none"
          >
            <svg
              v-if="!isLoading"
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"
              />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            <svg
              v-else
              class="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            {{ isLoading ? "Enregistrement..." : "Enregistrer la situation" }}
          </button>
        </div>
      </form>
    </div>
  </ApprenantLayout>
</template>
