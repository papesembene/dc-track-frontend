<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Swal from "sweetalert2";
import BackofficeLayout from "@/shared/layouts/BackofficeLayout.vue";
import { showToast } from "../../../core/ui/toast";
import { confirm } from "../../../core/ui/sweet-alert";
import {
  type CreatedHistoricalAccount,
  downloadHistoricalImportTemplate,
  importApprenantsHistorique,
  type ImportResult,
} from "../api/import.apprenants.api";
import {
  getReferentiels,
  getLocalPromotions,
} from "../api/situations.api";

const selectedFile = ref<File | null>(null);
const dragOver = ref(false);
const isImporting = ref(false);
const isDownloadingTemplate = ref(false);
const importResult = ref<ImportResult | null>(null);
const isLoadingOptions = ref(false);
const promotionMode = ref<"existing" | "new">("existing");
const selectedPromotionName = ref("");
const newPromotionName = ref("");
const selectedReferentialName = ref("");
const promotions = ref<Array<{ id: string; nom: string }>>([]);
const referentials = ref<Array<{ id: string; nom: string }>>([]);

const requiredColumns = ["prenom", "nom", "telephone", "email"];

const optionalColumns = [
  "matricule",
  "sexe",
  "date_naissance",
  "adresse",
  "statut_insertion",
  "entreprise",
  "poste",
  "date_embauche",
  "type_contrat",
  "commentaire",
];

function downloadCreatedAccounts(accounts: CreatedHistoricalAccount[]) {
  if (!accounts.length) return;

  const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const rows = [
    ["prenom", "nom", "email", "mot_de_passe_temporaire"],
    ...accounts.map((account) => [
      account.prenom,
      account.nom,
      account.email,
      account.temporaryPassword,
    ]),
  ];

  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "comptes-import-historique.csv";
  link.click();
  window.URL.revokeObjectURL(url);
}

const promotionName = computed(() =>
  promotionMode.value === "existing"
    ? selectedPromotionName.value.trim()
    : newPromotionName.value.trim(),
);

const referentialName = computed(() =>
  selectedReferentialName.value.trim(),
);

const canImport = computed(
  () =>
    Boolean(selectedFile.value) &&
    Boolean(promotionName.value) &&
    Boolean(referentialName.value) &&
    !isImporting.value,
);

async function loadOptions() {
  isLoadingOptions.value = true;
  try {
    const [promotionItems, referentialItems] = await Promise.all([
      getLocalPromotions(),
      getReferentiels(),
    ]);

    promotions.value = promotionItems;
    referentials.value = referentialItems;

    const firstPromotion = promotionItems[0];
    if (firstPromotion) {
      selectedPromotionName.value = firstPromotion.nom;
    } else {
      promotionMode.value = "new";
    }

    const firstReferential = referentialItems[0];
    if (firstReferential) {
      selectedReferentialName.value = firstReferential.nom;
    }
  } catch (error: any) {
    showToast(
      error?.message || "Impossible de charger les promotions et referentiels",
      "error",
    );
  } finally {
    isLoadingOptions.value = false;
  }
}

function validateAndSetFile(file: File) {
  const fileName = file.name.toLowerCase();
  const isValidFormat =
    fileName.endsWith(".csv") ||
    fileName.endsWith(".xlsx") ||
    fileName.endsWith(".xls");

  if (!isValidFormat) {
    showToast(
      "Format non supporte. Utilisez un fichier .csv, .xls ou .xlsx",
      "error",
    );
    return;
  }

  selectedFile.value = file;
  importResult.value = null;
}

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files?.[0]) {
    validateAndSetFile(input.files[0]);
  }
}

function handleDrop(event: DragEvent) {
  dragOver.value = false;
  if (event.dataTransfer?.files?.[0]) {
    validateAndSetFile(event.dataTransfer.files[0]);
  }
}

function removeFile() {
  selectedFile.value = null;
  importResult.value = null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

async function handleDownloadTemplate() {
  isDownloadingTemplate.value = true;
  try {
    const blob = await downloadHistoricalImportTemplate();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "template-import-historique.xlsx";
    link.click();
    window.URL.revokeObjectURL(url);
  } catch (error: any) {
    showToast(error?.message || "Impossible de telecharger le modele", "error");
  } finally {
    isDownloadingTemplate.value = false;
  }
}

async function handleImport() {
  if (!selectedFile.value) return;

  const confirmed = await confirm(
    "Importer ce fichier pour cette promotion et ce referentiel ?",
    "Confirmer l'import historique",
  );

  if (!confirmed) return;

  isImporting.value = true;
  importResult.value = null;

  try {
    const result = await importApprenantsHistorique(
      promotionName.value,
      referentialName.value,
      selectedFile.value,
    );
    importResult.value = result;

    if (result.failedCount > 0) {
      const errorsHtml = result.errors
        .slice(0, 10)
        .map((error) => `• Ligne ${error.line}: ${error.message}`)
        .join("<br>");
      const moreErrors =
        result.errors.length > 10
          ? `<br><em>...et ${result.errors.length - 10} autres erreurs</em>`
          : "";

      await Swal.fire({
        icon: "warning",
        title: "Import termine avec alertes",
        html: `
          <div style="text-align:left;font-size:14px;">
            <p><strong>Apprenants crees:</strong> ${result.createdCount}</p>
            <p><strong>Promotions creees:</strong> ${result.createdPromotions ?? 0}</p>
            <p><strong>Referentiels crees:</strong> ${result.createdReferentiels ?? 0}</p>
            <p><strong>Situations creees:</strong> ${result.createdSituations ?? 0}</p>
            <p><strong>Comptes locaux crees:</strong> ${result.createdAccounts?.length ?? 0}</p>
            <p><strong>Emails envoyes:</strong> ${result.emailedAccounts ?? 0}</p>
            <p><strong>Emails en echec:</strong> ${result.emailFailures ?? 0}</p>
            <p><strong>Erreurs:</strong> ${result.failedCount}</p>
            <hr style="margin:10px 0;">
            <div style="max-height:220px;overflow-y:auto;background:#fef2f2;padding:10px;border-radius:8px;">
              ${errorsHtml}${moreErrors}
            </div>
          </div>
        `,
        confirmButtonText: "OK",
        confirmButtonColor: "#f97316",
      });
    } else {
      await Swal.fire({
        icon: "success",
        title: "Import historique reussi",
        html: `
          <div style="text-align:left;font-size:14px;">
            <p><strong>Apprenants crees:</strong> ${result.createdCount}</p>
            <p><strong>Promotions creees:</strong> ${result.createdPromotions ?? 0}</p>
            <p><strong>Referentiels crees:</strong> ${result.createdReferentiels ?? 0}</p>
            <p><strong>Situations creees:</strong> ${result.createdSituations ?? 0}</p>
            <p><strong>Comptes locaux crees:</strong> ${result.createdAccounts?.length ?? 0}</p>
            <p><strong>Emails envoyes:</strong> ${result.emailedAccounts ?? 0}</p>
            <p><strong>Emails en echec:</strong> ${result.emailFailures ?? 0}</p>
          </div>
        `,
        confirmButtonText: "OK",
        confirmButtonColor: "#f97316",
      });
    }

    if (result.createdAccounts?.length) {
      downloadCreatedAccounts(result.createdAccounts);
      showToast(
        "Le fichier des comptes crees a ete telecharge automatiquement.",
        "success",
      );
    }

    if ((result.emailedAccounts ?? 0) > 0) {
      showToast(
        `${result.emailedAccounts} email(s) d'identifiants envoye(s).`,
        "success",
      );
    }

    selectedFile.value = null;
    if (promotionMode.value === "new") {
      newPromotionName.value = "";
    }
  } catch (error: any) {
    showToast(error?.message || "Erreur lors de l'import historique", "error");
  } finally {
    isImporting.value = false;
  }
}

onMounted(() => {
  loadOptions();
});
</script>

<template>
  <BackofficeLayout
    title="Import historique"
    active-menu="import-historique"
  >
    <div class="space-y-5">
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
              <span class="h-1.5 w-1.5 rounded-full bg-amber-300"></span>
              <span class="text-xs font-semibold">Historique seulement</span>
            </div>
            <h2 class="text-2xl font-bold text-gray-900 sm:text-3xl">
              Import anciennes promotions
            </h2>
            <p class="mt-1 text-sm text-gray-500">
              1 import = 1 promotion historique + 1 referentiel + le fichier
              des apprenants.
            </p>
          </div>

          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg bg-[#F16E00] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-orange-500/20 transition-colors hover:bg-[#d95f00] disabled:opacity-60"
            :disabled="isDownloadingTemplate"
            @click="handleDownloadTemplate"
          >
            <svg
              class="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {{
              isDownloadingTemplate
                ? "Telechargement..."
                : "Telecharger le modele"
            }}
          </button>
        </div>
      </div>

      <div class="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900 shadow-sm">
        <p class="font-semibold">Fonctionnement</p>
        <p class="mt-1">
          Vous choisissez une promotion historique, puis un referentiel. Le
          fichier importe ensuite uniquement les apprenants de ce couple
          promotion + referentiel.
        </p>
        <p class="mt-1">
          Chaque ancien apprenant importe recevra automatiquement un
          <strong>compte local Suivi insertion</strong>.
        </p>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <div class="rounded-xl bg-white p-4 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Colonnes obligatoires
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <span
              v-for="column in requiredColumns"
              :key="column"
              class="rounded-full bg-orange-100 px-3 py-1 text-xs font-medium text-orange-700"
            >
              {{ column }}
            </span>
          </div>
        </div>

        <div class="rounded-xl bg-white p-4 shadow-sm">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Colonnes optionnelles
          </p>
          <div class="mt-3 flex flex-wrap gap-2">
            <span
              v-for="column in optionalColumns"
              :key="column"
              class="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
            >
              {{ column }}
            </span>
          </div>
        </div>
      </div>

      <div class="grid gap-5 xl:grid-cols-2">
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 class="text-sm font-bold text-slate-900">
            Promotion historique cible
          </h3>
          <div class="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              class="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
              :class="
                promotionMode === 'existing'
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-100 text-slate-600'
              "
              @click="promotionMode = 'existing'"
            >
              Selectionner
            </button>
            <button
              type="button"
              class="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
              :class="
                promotionMode === 'new'
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-100 text-slate-600'
              "
              @click="promotionMode = 'new'"
            >
              Creer nouvelle
            </button>
          </div>
          <select
            v-if="promotionMode === 'existing'"
            v-model="selectedPromotionName"
            class="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-orange-400 disabled:bg-slate-50"
            :disabled="isLoadingOptions || promotions.length === 0"
          >
            <option value="">
              {{
                isLoadingOptions
                  ? "Chargement..."
                  : "Selectionner une promotion existante"
              }}
            </option>
            <option
              v-for="promotion in promotions"
              :key="promotion.id"
              :value="promotion.nom"
            >
              {{ promotion.nom }}
            </option>
          </select>
          <input
            v-else
            v-model="newPromotionName"
            type="text"
            placeholder="Ex: PROMOTION 2023"
            class="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-orange-400"
          />
          <p class="mt-2 text-xs text-slate-500">
            Une seule promotion par import.
          </p>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 class="text-sm font-bold text-slate-900">
            Referentiel (in-odc)
          </h3>
          <select
            v-model="selectedReferentialName"
            class="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-orange-400 disabled:bg-slate-50"
            :disabled="isLoadingOptions || referentials.length === 0"
          >
            <option value="">
              {{
                isLoadingOptions
                  ? "Chargement..."
                  : "Selectionner un referentiel existant"
              }}
            </option>
            <option
              v-for="referential in referentials"
              :key="referential.id"
              :value="referential.nom"
            >
              {{ referential.nom }}
            </option>
          </select>
          <p class="mt-2 text-xs text-slate-500">
            Choisissez le referentiel des apprenants importes.
          </p>
        </div>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div class="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p class="font-semibold">Important</p>
          <p class="mt-1">
            Apres import, un fichier des comptes sera telecharge. Il contient
            les identifiants temporaires des anciens apprenants.
          </p>
        </div>

        <h3 class="mb-4 text-sm font-bold text-slate-900">
          Fichier a importer
        </h3>

        <div
          v-if="selectedFile"
          class="flex items-center gap-4 rounded-xl border border-green-300 bg-green-50 p-4"
        >
          <div
            class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100"
          >
            <svg
              class="h-6 w-6 text-green-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
              />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate font-medium text-slate-900">
              {{ selectedFile.name }}
            </p>
            <p class="text-sm text-slate-500">
              {{ formatFileSize(selectedFile.size) }}
            </p>
          </div>
          <button
            type="button"
            class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-500"
            @click="removeFile"
          >
            <svg
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div
          v-else
          class="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors"
          :class="
            dragOver
              ? 'border-orange-500 bg-orange-50'
              : 'border-slate-300 hover:border-orange-400'
          "
          @drop.prevent="handleDrop"
          @dragover.prevent="dragOver = true"
          @dragleave="dragOver = false"
        >
          <div
            class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100"
          >
            <svg
              class="h-8 w-8 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p class="text-center font-medium text-slate-700">
            Glissez-deposez votre fichier ici
          </p>
          <p class="mt-1 text-center text-sm text-slate-500">ou</p>
          <label
            class="mt-3 cursor-pointer rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-orange-500/20 transition-colors hover:bg-orange-600"
          >
            <span>Parcourir</span>
            <input
              type="file"
              class="sr-only"
              accept=".csv,.xlsx,.xls"
              @change="handleFileChange"
            />
          </label>
          <p class="mt-3 text-xs text-slate-400">
            Formats supportes: CSV, XLSX, XLS
          </p>
        </div>
      </div>

      <div
        v-if="importResult"
        class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h3 class="mb-4 text-sm font-bold text-slate-900">
          Resultat du dernier import
        </h3>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <div class="rounded-xl bg-green-50 p-4 text-center">
            <p class="text-2xl font-bold text-green-600">
              {{ importResult.createdCount }}
            </p>
            <p class="text-sm text-green-700">Apprenants</p>
          </div>
          <div class="rounded-xl bg-teal-50 p-4 text-center">
            <p class="text-2xl font-bold text-[#009682]">
              {{ importResult.createdPromotions ?? 0 }}
            </p>
            <p class="text-sm text-[#009682]">Promotions</p>
          </div>
          <div class="rounded-xl bg-orange-50 p-4 text-center">
            <p class="text-2xl font-bold text-[#F16E00]">
              {{ importResult.createdReferentiels ?? 0 }}
            </p>
            <p class="text-sm text-[#F16E00]">Referentiels</p>
          </div>
          <div class="rounded-xl bg-amber-50 p-4 text-center">
            <p class="text-2xl font-bold text-amber-600">
              {{ importResult.createdSituations ?? 0 }}
            </p>
            <p class="text-sm text-amber-700">Situations</p>
          </div>
          <div class="rounded-xl bg-orange-50 p-4 text-center">
            <p class="text-2xl font-bold text-orange-600">
              {{ importResult.createdAccounts?.length ?? 0 }}
            </p>
            <p class="text-sm text-orange-700">Comptes</p>
          </div>
          <div class="rounded-xl bg-red-50 p-4 text-center">
            <p class="text-2xl font-bold text-red-600">
              {{ importResult.failedCount }}
            </p>
            <p class="text-sm text-red-700">Erreurs</p>
          </div>
        </div>

        <p
          v-if="(importResult.createdAccounts?.length ?? 0) > 0"
          class="mt-4 text-sm text-slate-600"
        >
          Le fichier des comptes temporaires a ete telecharge.
        </p>
      </div>

      <div class="flex justify-end">
        <button
          type="button"
          class="flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-sm shadow-orange-500/20 transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!canImport"
          @click="handleImport"
        >
          <svg
            v-if="isImporting"
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
          <svg
            v-else
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {{ isImporting ? "Import en cours..." : "Importer l'historique" }}
        </button>
      </div>
    </div>
  </BackofficeLayout>
</template>
