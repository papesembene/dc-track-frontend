<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

// --- modal ---
const showPasswordModal = ref(false);

const openPasswordModal = () => {
  currentPassword.value = "";
  newPassword.value = "";
  confirmPassword.value = "";
  showCurrentPassword.value = false;
  showNewPassword.value = false;
  showConfirmPassword.value = false;
  showPasswordModal.value = true;
};

const closePasswordModal = () => {
  showPasswordModal.value = false;
};

// --- password visibility toggles ---
const showCurrentPassword = ref(false);
const showNewPassword = ref(false);
const showConfirmPassword = ref(false);

// --- password strength ---
const passwordStrength = computed(() => {
  const p = newPassword.value;
  if (!p) return 0;
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p)) score++;
  if (/[0-9]/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;
  return score;
});

const strengthLabel = computed(() => {
  const labels = ["", "Faible", "Moyen", "Fort", "Très fort"];
  return labels[passwordStrength.value] ?? "";
});

const strengthColor = computed(() => {
  const colors = [
    "",
    "bg-red-400",
    "bg-orange-400",
    "bg-yellow-400",
    "bg-emerald-500",
  ];
  return colors[passwordStrength.value] ?? "";
});

import ApprenantLayout from "../../../shared/layouts/ApprenantLayout.vue";
import { showToast } from "../../../core/ui/toast";
import { useCurrentUser } from "../../../core/auth/useCurrentUser";
import { changePassword } from "../../auth/api/change-password.api";
import {
  getApprenantMe,
  updateApprenantMe,
} from "../api/profil.api";

type ApiMe = {
  user?: {
    prenom?: string | null;
    nom?: string | null;
    email?: string | null;
    actif?: boolean;
  };
  telephone?: string | null;
  adresse?: string | null;
  genre?: string | null;
  dateNaissance?: string | null;
  createdAt?: string;
  promotion?: { nom?: string | null } | null;
  referentiel?: { nom?: string | null } | null;
};

const isLoading = ref(false);
const isEditing = ref(false);
const isSaving = ref(false);

const profil = ref({
  prenom: "",
  nom: "",
  email: "",
  telephone: "",
  adresse: "",
  genre: "",
  dateNaissance: "",
  promotion: "",
  referentiel: "",
});
const { user } = useCurrentUser();

const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const isChangingPassword = ref(false);

const lastPasswordChange = computed(() => {
  const raw =
    (user.value as any)?.passwordChangedAt ||
    (user.value as any)?.updatedAt ||
    null;

  if (!raw) return "Non disponible";
  return new Date(raw).toLocaleString("fr-FR");
});

async function onChangePassword() {
  if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
    showToast("Tous les champs sont obligatoires", "error");
    return;
  }

  if (newPassword.value.length < 8) {
    showToast(
      "Le nouveau mot de passe doit contenir au moins 8 caractères",
      "error",
    );
    return;
  }

  if (newPassword.value !== confirmPassword.value) {
    showToast(
      "La confirmation ne correspond pas au nouveau mot de passe",
      "info",
    );
    return;
  }

  isChangingPassword.value = true;
  try {
    await changePassword({
      ancienPassword: currentPassword.value,
      newPassword: newPassword.value,
    });

    showToast("Mot de passe modifié avec succès", "success");
    currentPassword.value = "";
    newPassword.value = "";
    confirmPassword.value = "";
    showPasswordModal.value = false;
  } catch (error: any) {
    const msg =
      error?.response?.data?.message ||
      "Échec de la modification du mot de passe";
    showToast(msg, "error");
  } finally {
    isChangingPassword.value = false;
  }
}

const dateInscription = ref("");
const isActif = ref(true);

// Conserve la dernière version chargée pour restaurer en cas d'annulation.
const snapshot = ref({
  telephone: "",
  adresse: "",
  genre: "",
  dateNaissance: "",
});

const toInputDate = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const toDisplayDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

// Mappe la réponse backend vers le state UI.
const applyMe = (data: ApiMe) => {
  profil.value.prenom = data.user?.prenom ?? "";
  profil.value.nom = data.user?.nom ?? "";
  profil.value.email = data.user?.email ?? "";
  profil.value.telephone = data.telephone ?? "";
  profil.value.adresse = data.adresse ?? "";
  profil.value.genre = data.genre ?? "";
  profil.value.dateNaissance = toInputDate(data.dateNaissance);
  profil.value.promotion = data.promotion?.nom ?? "N/A";
  profil.value.referentiel = data.referentiel?.nom ?? "N/A";

  dateInscription.value = toDisplayDate(data.createdAt);
  isActif.value = Boolean(data.user?.actif ?? true);

  snapshot.value = {
    telephone: profil.value.telephone,
    adresse: profil.value.adresse,
    genre: profil.value.genre,
    dateNaissance: profil.value.dateNaissance,
  };
};

const loadProfile = async () => {
  isLoading.value = true;
  try {
    const data = await getApprenantMe();
    applyMe(data);
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    const message = Array.isArray(apiMessage)
      ? apiMessage.join(", ")
      : apiMessage || "Impossible de charger le profil";
    showToast(message, "error");
  } finally {
    isLoading.value = false;
  }
};

const cancelEdit = () => {
  profil.value.telephone = snapshot.value.telephone;
  profil.value.adresse = snapshot.value.adresse;
  profil.value.genre = snapshot.value.genre;
  profil.value.dateNaissance = snapshot.value.dateNaissance;
  isEditing.value = false;
};

// Sauvegarde uniquement les champs autorisés par PUT /apprenants/me.
const saveProfile = async () => {
  if (isSaving.value) return;

  isSaving.value = true;
  try {
    await updateApprenantMe({
      telephone: profil.value.telephone || undefined,
      adresse: profil.value.adresse || undefined,
      genre: profil.value.genre || undefined,
      dateBirth: profil.value.dateNaissance || undefined,
    });

    snapshot.value = {
      telephone: profil.value.telephone,
      adresse: profil.value.adresse,
      genre: profil.value.genre,
      dateNaissance: profil.value.dateNaissance,
    };

    isEditing.value = false;
    showToast("Profil mis à jour avec succès", "success");
  } catch (error: any) {
    const apiMessage = error?.response?.data?.message;
    const message = Array.isArray(apiMessage)
      ? apiMessage.join(", ")
      : apiMessage || "Impossible de mettre à jour le profil";
    showToast(message, "error");
  } finally {
    isSaving.value = false;
  }
};

const heroName = computed(() =>
  `${profil.value.prenom} ${profil.value.nom}`.trim(),
);

onMounted(loadProfile);
</script>

<template>
  <ApprenantLayout title="Mon profil" active-menu="profil">
    <section class="mx-auto max-w-3xl space-y-5">
      <div
        v-if="isLoading"
        class="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm"
      >
        Chargement du profil...
      </div>

      <template v-else>
        <div
          class="relative overflow-hidden rounded-xl border border-gray-100 bg-white p-5 shadow-sm lg:p-6"
        >
          <div
            class="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center"
          >
            <div
              class="flex h-20 w-20 items-center justify-center rounded-xl border-4 border-orange-100 bg-orange-50 text-2xl font-bold text-[#F16E00] sm:h-24 sm:w-24"
            >
              {{ (profil.prenom[0] || "A").toUpperCase() }}
            </div>

            <div class="flex-1">
              <div
                class="mb-2 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[#F16E00]"
              >
                <span
                  class="h-1.5 w-1.5 rounded-full"
                  :class="isActif ? 'bg-green-400' : 'bg-red-400'"
                ></span>
                <span class="text-xs font-semibold">{{
                  isActif ? "Apprenant actif" : "Compte inactif"
                }}</span>
              </div>
              <h2 class="text-2xl font-bold leading-tight text-gray-900 sm:text-3xl">
                {{ heroName || "Profil apprenant" }}
              </h2>
              <p class="mt-1 text-sm text-gray-500">{{ profil.email }}</p>
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div
            class="flex items-start justify-between border-b border-slate-100 px-6 py-5"
          >
            <div>
              <h2 class="text-base font-bold text-slate-900">
                Informations personnelles
              </h2>
              <p class="mt-0.5 text-sm text-slate-500">
                Mettez à jour les champs autorisés
              </p>
            </div>
            <div class="flex items-center gap-2">
              <button
                v-if="isEditing"
                class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                :disabled="isSaving"
                @click="cancelEdit"
              >
                Annuler
              </button>
              <button
                class="rounded-xl border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-bold text-orange-600 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="isSaving"
                @click="isEditing ? saveProfile() : (isEditing = true)"
              >
                {{
                  isEditing
                    ? isSaving
                      ? "Enregistrement..."
                      : "Enregistrer"
                    : "Modifier"
                }}
              </button>
            </div>
          </div>

          <div class="space-y-5 px-6 py-6">
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >Prénom</label
                >
                <input
                  v-model="profil.prenom"
                  type="text"
                  disabled
                  class="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-600"
                />
              </div>
              <div>
                <label
                  class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >Nom</label
                >
                <input
                  v-model="profil.nom"
                  type="text"
                  disabled
                  class="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-600"
                />
              </div>
            </div>

            <div>
              <label
                class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                >Adresse email</label
              >
              <input
                v-model="profil.email"
                type="email"
                disabled
                class="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-600"
              />
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >Téléphone</label
                >
                <input
                  v-model="profil.telephone"
                  type="tel"
                  :disabled="!isEditing"
                  class="w-full rounded-xl border px-4 py-2.5 text-sm font-medium outline-none"
                  :class="
                    isEditing
                      ? 'border-orange-300 bg-white focus:border-orange-500'
                      : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-600'
                  "
                />
              </div>
              <div>
                <label
                  class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >Genre</label
                >
                <select
                  v-model="profil.genre"
                  :disabled="!isEditing"
                  class="w-full rounded-xl border px-4 py-2.5 text-sm font-medium outline-none"
                  :class="
                    isEditing
                      ? 'border-orange-300 bg-white focus:border-orange-500'
                      : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-600'
                  "
                >
                  <option value="">Non renseigné</option>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >Date de naissance</label
                >
                <input
                  v-model="profil.dateNaissance"
                  type="date"
                  :disabled="!isEditing"
                  class="w-full rounded-xl border px-4 py-2.5 text-sm font-medium outline-none"
                  :class="
                    isEditing
                      ? 'border-orange-300 bg-white focus:border-orange-500'
                      : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-600'
                  "
                />
              </div>
              <div>
                <label
                  class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >Adresse</label
                >
                <input
                  v-model="profil.adresse"
                  type="text"
                  :disabled="!isEditing"
                  class="w-full rounded-xl border px-4 py-2.5 text-sm font-medium outline-none"
                  :class="
                    isEditing
                      ? 'border-orange-300 bg-white focus:border-orange-500'
                      : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-600'
                  "
                />
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >Promotion</label
                >
                <input
                  v-model="profil.promotion"
                  type="text"
                  disabled
                  class="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-600"
                />
              </div>
              <div>
                <label
                  class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >Référentiel</label
                >
                <input
                  v-model="profil.referentiel"
                  type="text"
                  disabled
                  class="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-600"
                />
              </div>
            </div>
          </div>
        </div>

        <div
          class="rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm"
        >
          <h2 class="mb-5 text-base font-bold text-slate-900">
            Informations de formation
          </h2>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <p
                class="text-[11px] font-semibold uppercase tracking-wide text-slate-400"
              >
                Promotion
              </p>
              <p class="mt-1 text-sm font-bold text-slate-900">
                {{ profil.promotion }}
              </p>
            </div>
            <div class="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <p
                class="text-[11px] font-semibold uppercase tracking-wide text-slate-400"
              >
                Référentiel
              </p>
              <p class="mt-1 text-sm font-bold text-slate-900">
                {{ profil.referentiel }}
              </p>
            </div>
            <div class="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <p
                class="text-[11px] font-semibold uppercase tracking-wide text-slate-400"
              >
                Statut
              </p>
              <p
                class="mt-1 text-sm font-bold"
                :class="isActif ? 'text-emerald-700' : 'text-red-600'"
              >
                {{ isActif ? "Apprenant actif" : "Compte inactif" }}
              </p>
            </div>
            <div class="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <p
                class="text-[11px] font-semibold uppercase tracking-wide text-slate-400"
              >
                Date d'inscription
              </p>
              <p class="mt-1 text-sm font-bold text-slate-900">
                {{ dateInscription }}
              </p>
            </div>
          </div>
        </div>
        <!-- ── Sécurité — carte compacte ──────────────────────── -->
        <div
          class="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50"
            >
              <svg
                class="h-4 w-4 text-orange-500"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div>
              <p class="text-sm font-bold text-slate-900">Mot de passe</p>
              <p class="text-xs text-slate-500">
                Dernière modification :
                <span class="font-medium text-slate-700">{{
                  lastPasswordChange
                }}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            class="rounded-xl border border-orange-300 bg-orange-50 px-4 py-2 text-sm font-bold text-orange-600 transition hover:bg-orange-100"
            @click="openPasswordModal"
          >
            Changer Password
          </button>
        </div>
      </template>
    </section>

    <!-- ── Modal changement de mot de passe ───────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showPasswordModal"
          class="fixed inset-0 z-50 flex items-center justify-center p-4"
          @click.self="closePasswordModal"
        >
          <!-- backdrop -->
          <div
            class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            @click="closePasswordModal"
          ></div>

          <!-- panel -->
          <div
            class="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl"
          >
            <!-- header -->
            <div
              class="flex items-center justify-between border-b border-slate-100 px-6 py-5"
            >
              <div class="flex items-center gap-3">
                <div
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-50"
                >
                  <svg
                    class="h-4 w-4 text-orange-500"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div>
                  <h3 class="text-base font-bold text-slate-900">
                    Changer le mot de passe
                  </h3>
                  <p class="text-xs text-slate-500">
                    Remplissez les champs ci-dessous
                  </p>
                </div>
              </div>
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                @click="closePasswordModal"
              >
                <svg
                  class="h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
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
              </button>
            </div>

            <!-- body -->
            <div class="space-y-4 px-6 py-6">
              <!-- Mot de passe actuel -->
              <div>
                <label
                  class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >Mot de passe actuel</label
                >
                <div class="relative">
                  <input
                    v-model="currentPassword"
                    :type="showCurrentPassword ? 'text' : 'password'"
                    placeholder="••••••••"
                    class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-11 text-sm font-medium text-slate-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                  />
                  <button
                    type="button"
                    tabindex="-1"
                    class="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                    @click="showCurrentPassword = !showCurrentPassword"
                  >
                    <svg
                      v-if="!showCurrentPassword"
                      class="h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <svg
                      v-else
                      class="h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path
                        d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"
                      />
                      <path
                        d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"
                      />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Nouveau mot de passe -->
              <div>
                <label
                  class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >Nouveau mot de passe</label
                >
                <div class="relative">
                  <input
                    v-model="newPassword"
                    :type="showNewPassword ? 'text' : 'password'"
                    placeholder="••••••••"
                    class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-11 text-sm font-medium text-slate-800 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
                  />
                  <button
                    type="button"
                    tabindex="-1"
                    class="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                    @click="showNewPassword = !showNewPassword"
                  >
                    <svg
                      v-if="!showNewPassword"
                      class="h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <svg
                      v-else
                      class="h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path
                        d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"
                      />
                      <path
                        d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"
                      />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  </button>
                </div>
                <!-- force du mot de passe -->
                <div v-if="newPassword" class="mt-2 space-y-1">
                  <div class="flex gap-1">
                    <div
                      v-for="i in 4"
                      :key="i"
                      class="h-1 flex-1 rounded-full transition-all duration-300"
                      :class="
                        i <= passwordStrength ? strengthColor : 'bg-slate-200'
                      "
                    ></div>
                  </div>
                  <p
                    class="text-xs font-medium"
                    :class="{
                      'text-red-500': passwordStrength === 1,
                      'text-orange-500': passwordStrength === 2,
                      'text-yellow-600': passwordStrength === 3,
                      'text-emerald-600': passwordStrength === 4,
                    }"
                  >
                    {{ strengthLabel }}
                  </p>
                </div>
              </div>

              <!-- Confirmer -->
              <div>
                <label
                  class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >Confirmer le nouveau mot de passe</label
                >
                <div class="relative">
                  <input
                    v-model="confirmPassword"
                    :type="showConfirmPassword ? 'text' : 'password'"
                    placeholder="••••••••"
                    class="w-full rounded-xl border px-4 py-2.5 pr-11 text-sm font-medium text-slate-800 outline-none transition focus:ring-2"
                    :class="
                      confirmPassword && newPassword
                        ? confirmPassword === newPassword
                          ? 'border-emerald-300 bg-emerald-50/40 focus:border-emerald-400 focus:ring-emerald-100'
                          : 'border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-red-100'
                        : 'border-slate-200 bg-slate-50 focus:border-orange-400 focus:ring-orange-100'
                    "
                  />
                  <button
                    type="button"
                    tabindex="-1"
                    class="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                    @click="showConfirmPassword = !showConfirmPassword"
                  >
                    <svg
                      v-if="!showConfirmPassword"
                      class="h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <svg
                      v-else
                      class="h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path
                        d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"
                      />
                      <path
                        d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"
                      />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  </button>
                </div>
                <p
                  v-if="
                    confirmPassword &&
                    newPassword &&
                    confirmPassword !== newPassword
                  "
                  class="mt-1.5 text-xs text-red-500"
                >
                  Les mots de passe ne correspondent pas
                </p>
                <p
                  v-if="
                    confirmPassword &&
                    newPassword &&
                    confirmPassword === newPassword
                  "
                  class="mt-1.5 text-xs text-emerald-600"
                >
                  ✓ Les mots de passe correspondent
                </p>
              </div>
            </div>

            <!-- footer -->
            <div class="flex gap-3 border-t border-slate-100 px-6 py-4">
              <button
                type="button"
                class="flex-1 rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                @click="closePasswordModal"
              >
                Annuler
              </button>
              <button
                type="button"
                :disabled="isChangingPassword"
                class="flex-1 rounded-xl bg-orange-500 py-2.5 text-sm font-bold text-white shadow-sm shadow-orange-500/20 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                @click="onChangePassword"
              >
                <span
                  v-if="isChangingPassword"
                  class="flex items-center justify-center gap-2"
                >
                  <svg
                    class="h-4 w-4 animate-spin"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
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
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Modification…
                </span>
                <span v-else>Confirmer</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </ApprenantLayout>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active .relative,
.modal-leave-active .relative {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
