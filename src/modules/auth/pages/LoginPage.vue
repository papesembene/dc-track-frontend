<script setup lang="ts">
import { ref, reactive } from "vue";
import { useRouter } from "vue-router";
import { AlertCircle, Eye, EyeOff, LoaderCircle, Lock, Mail } from "lucide-vue-next";
import { api } from "../../../core/api/axios";
import { clearAuthenticatedSession } from "../../../core/auth/auth-session";
import { persistAuthenticatedSession } from "../../../core/auth/auth-session";
import { getDefaultPathByRole } from "../../../core/auth/role-redirect";
import { showToast } from "../../../core/ui/toast";

const router = useRouter();
const showPassword = ref(false);
const isLoading = ref(false);
const errorMessage = ref("");
const form = reactive({
  email: "",
  password: "",
});

const errors = reactive({
  email: "",
  password: "",
});

const validateEmail = () => {
  if (!form.email) {
    errors.email = "L'email est obligatoire";
    return false;
  }
  const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  errors.email = ok ? "" : "Format email invalide";
  return ok;
};

const validatePassword = () => {
  if (!form.password) {
    errors.password = "Le mot de passe est obligatoire";
    return false;
  }
  if (form.password.length < 6) {
    errors.password = "Minimum 6 caractères";
    return false;
  }
  errors.password = "";
  return true;
};

const validateForm = () => {
  const e = validateEmail();
  const p = validatePassword();
  return e && p;
};

const onSubmit = async () => {
  isLoading.value = true;
  errorMessage.value = "";
  if (!validateForm()) {
    showToast("Veuillez corriger les champs du formulaire", "error");
    isLoading.value = false;
    return;
  }
  try {
    clearAuthenticatedSession();
    const normalizedEmail = form.email.trim().toLowerCase();
    const { data } = await api.post("auth/login", {
      email: normalizedEmail,
      password: form.password,
    });

    const token = data.data.accessToken;
    const authUser = data.data.user;
    const role = authUser?.role;
    const mustChangePassword = Boolean(data.data.mustChangePassword);

    if (!token) throw new Error("Token manquant dans la réponse login");
    persistAuthenticatedSession(token, authUser, { mustChangePassword });
    showToast("Connexion réussie", "success", 1800);
    router.push(
      role === "APPRENANT" && mustChangePassword
        ? "/apprenant/changer-mot-de-passe"
        : getDefaultPathByRole(role),
    );
  } catch (e: any) {
    const apiMessage = e?.response?.data?.message;
    errorMessage.value =
      Array.isArray(apiMessage)
        ? apiMessage.join(", ")
        : apiMessage || "Email ou mot de passe invalide";
    showToast(errorMessage.value, "error");
  } finally {
    isLoading.value = false;
  }
};
</script>

<template>
  <main
    class="flex min-h-screen items-center justify-center overflow-hidden bg-gray-50 p-6"
    style="background: url(https://res.cloudinary.com/drxouwbms/image/upload/v1743682062/pattern_kldzo3.png); background-size: cover;"
  >
    <div class="login-card-shell relative mx-auto w-full max-w-sm">
      <div class="login-card-layer login-card-layer-orange"></div>
      <div class="login-card-layer login-card-layer-teal"></div>

      <section class="relative z-10 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg">
        <div class="p-6">
          <div class="-mx-6 -mt-6 mb-4 flex justify-center bg-gradient-to-b from-gray-50 to-white px-6 pb-4 pt-6">
            <img
              src="https://res.cloudinary.com/drxouwbms/image/upload/v1743507686/image_27_qtiin4.png"
              alt="Sonatel Logo"
              class="h-auto w-[130px]"
            />
          </div>

          <div class="mb-4 text-center">
            <p class="mb-1 text-xs font-medium text-gray-600">Bienvenue sur</p>
              <h2 class="text-lg font-bold text-[#F16E00] drop-shadow-sm">
              ODC Track
            </h2>
          </div>

          <h1 class="mb-5 text-center text-xl font-bold text-gray-700">Se connecter</h1>

          <div
            v-if="errorMessage"
            class="mb-4 flex items-start rounded-lg border-l-4 border-red-500 bg-red-50 p-3 text-xs text-red-600 shadow-sm"
          >
            <AlertCircle :size="14" class="mr-2 mt-0.5 shrink-0" />
            <span>{{ errorMessage }}</span>
          </div>

          <form class="space-y-4" @submit.prevent="onSubmit">
            <div>
              <label for="email" class="mb-1 block text-xs font-medium text-gray-700">Login</label>
              <div class="group relative">
                <div class="pointer-events-auto absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail
                    :size="16"
                    class="transition-colors"
                    :class="errors.email ? 'text-red-500' : 'text-gray-400 group-focus-within:text-[#F16E00]'"
                  />
                </div>
                <input
                  id="email"
                  v-model.trim="form.email"
                  type="email"
                  :disabled="isLoading"
                  @blur="validateEmail"
                  placeholder="Matricule ou email"
                  class="w-full rounded-lg border py-2 pl-9 pr-3 text-sm shadow-sm transition-all duration-200 focus:ring-1 disabled:opacity-60"
                  :class="errors.email ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 bg-gray-50 focus:border-[#F16E00] focus:ring-orange-200'"
                />
              </div>
              <p v-if="errors.email" class="mt-1 flex items-center text-xs text-red-500">
                <AlertCircle :size="12" class="mr-1 shrink-0" />
                {{ errors.email }}
              </p>
            </div>

            <div>
              <label for="password" class="mb-1 block text-xs font-medium text-gray-700">Mot de passe</label>
              <div class="group relative">
                <div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock
                    :size="16"
                    class="transition-colors"
                    :class="errors.password ? 'text-red-500' : 'text-gray-400 group-focus-within:text-[#F16E00]'"
                  />
                </div>
                <input
                  id="password"
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  :disabled="isLoading"
                  @blur="validatePassword"
                  placeholder="Mot de passe"
                  class="w-full rounded-lg border py-2 pl-9 pr-9 text-sm shadow-sm transition-all duration-200 focus:ring-1 disabled:opacity-60"
                  :class="errors.password ? 'border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-200' : 'border-gray-300 bg-gray-50 focus:border-[#F16E00] focus:ring-orange-200'"
                />
                <button
                  type="button"
                  class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 transition hover:text-gray-600"
                  :aria-label="showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
                  @click="showPassword = !showPassword"
                >
                  <EyeOff v-if="showPassword" :size="16" />
                  <Eye v-else :size="16" />
                </button>
              </div>
              <p v-if="errors.password" class="mt-1 flex items-center text-xs text-red-500">
                <AlertCircle :size="12" class="mr-1 shrink-0" />
                {{ errors.password }}
              </p>
            </div>

            <div class="flex justify-end">
              <button
                type="button"
                class="text-xs font-medium text-[#F16E00] transition-all duration-200 hover:text-[#d95f00] hover:underline"
              >
                Mot de passe oublié ?
              </button>
            </div>

            <button
              type="submit"
              :disabled="isLoading"
              class="flex w-full items-center justify-center rounded-lg bg-[#F16E00] py-2 text-sm font-medium text-white shadow-md transition-all duration-200 hover:bg-[#d95f00] focus:outline-none focus:ring-2 focus:ring-[#F16E00] focus:ring-offset-1 disabled:opacity-70"
            >
              <span v-if="isLoading" class="flex items-center justify-center">
                <LoaderCircle :size="16" class="mr-2 animate-spin" />
                Connexion en cours...
              </span>
              <span v-else>Se connecter</span>
            </button>
          </form>

          <div class="mt-6 border-t border-gray-100 pt-4 text-center text-xs text-gray-500">
            © {{ new Date().getFullYear() }} Orange Digital Center. Tous droits réservés.
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.login-card-shell {
  animation: login-card-in 0.6s ease-out both;
}

.login-card-layer {
  position: absolute;
  inset: 0;
  border-radius: 1rem;
  box-shadow: 0 10px 15px rgb(0 0 0 / 0.12);
}

.login-card-layer-orange {
  background: #F16E00;
  transform: rotate(1deg) translate(-8px, -8px);
  animation: orange-layer 6s ease-in-out infinite alternate;
}

.login-card-layer-teal {
  background: #009682;
  transform: rotate(-1deg) translate(8px, 8px);
  animation: teal-layer 6s ease-in-out 0.5s infinite alternate;
}

@keyframes login-card-in {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes orange-layer {
  from {
    transform: rotate(1deg) translate(-8px, -8px);
  }
  to {
    transform: rotate(2deg) translate(-9px, -7px);
  }
}

@keyframes teal-layer {
  from {
    transform: rotate(-1deg) translate(8px, 8px);
  }
  to {
    transform: rotate(-2deg) translate(9px, 7px);
  }
}
</style>
