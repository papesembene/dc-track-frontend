<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useCurrentUser } from '../../core/auth/useCurrentUser'
import { clearAuthenticatedSession } from '@/core/auth/auth-session'
import AppSidebarBrand from '@/shared/components/AppSidebarBrand.vue'

type ApprenantMenuKey = 'dashboard' | 'situations' | 'documents' | 'profil'

const props = defineProps<{
  title: string
  activeMenu: ApprenantMenuKey
}>()

const mobileOpen = ref(false)
const router = useRouter()

const menu: Array<{ key: ApprenantMenuKey; label: string; to: string }> = [
  { key: 'dashboard', label: 'Tableau de bord', to: '/dashboard-apprenant' },
  { key: 'situations', label: 'Mes situations', to: '/situations' },
  { key: 'documents', label: 'Documents', to: '/documents' },
  { key: 'profil', label: 'Mon profil', to: '/profil' },
]

const { user, userName, role, hydrateCurrentUser } = useCurrentUser()

const roleLabel = computed(() => {
  if (role.value === 'APPRENANT') return 'Apprenant'
  if (role.value === 'COACH') return 'Coach'
  if (role.value === 'POLE_EMPLOI') return 'Pôle Emploi'
  if (role.value === 'MANAGER') return 'Manager'
  if (role.value === 'ADMIN') return 'Admin'
  return 'Utilisateur'
})

const avatarInitial = computed(() => {
  const prenom = user.value.prenom?.trim() ?? ''
  const nom = user.value.nom?.trim() ?? ''
  const source = prenom || nom || userName.value || 'U'
  return source[0]?.toUpperCase() ?? 'U'
})

onMounted(() => {
  hydrateCurrentUser()
})

const itemClass = (key: ApprenantMenuKey) => {
  if (key === props.activeMenu) {
    return 'sidebar-link-base border-l-8 border-[#F16E00] bg-orange-50 font-medium text-[#F16E00] shadow-sm'
  }
  return 'sidebar-link-base text-gray-600 hover:bg-gray-50 hover:text-gray-900'
}

const logout = async () => {
  clearAuthenticatedSession()
  await router.push('/login')
}
</script>

<template>
  <div class="h-screen overflow-hidden bg-gray-100 text-slate-900">
    <div class="flex h-full">

      <!-- ── Desktop fixed sidebar ── -->
      <aside class="hidden w-64 shrink-0 flex-col border-r border-gray-100 bg-white shadow-sm lg:flex">
        <div class="flex flex-col items-center justify-center px-4 py-6">
          <AppSidebarBrand />
          <div class="mt-4 rounded-full bg-orange-50 px-6 py-1.5 text-xs font-medium text-[#F16E00]">
            ODC Track
          </div>
        </div>

        <div class="mx-6 mb-2 h-px bg-gray-100"></div>

        <nav class="flex-1 overflow-y-auto px-3 py-5">
          <p class="mb-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Navigation</p>
          <div class="space-y-1">
            <RouterLink v-for="item in menu" :key="item.key" :to="item.to" :class="itemClass(item.key)">
              <svg v-if="item.key === 'dashboard'" class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              <svg v-else-if="item.key === 'situations'" class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
              </svg>
              <svg v-else-if="item.key === 'documents'" class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
              <svg v-else class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
              <span>{{ item.label }}</span>
            </RouterLink>
          </div>
        </nav>

        <div class="border-t border-gray-100 px-3 py-4">
          <button type="button" class="sidebar-link-base w-full text-left text-red-500 hover:bg-red-50 hover:text-red-600" @click="logout">
            <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      <!-- ── Main content ── -->
      <div class="flex min-w-0 min-h-0 flex-1 flex-col">
        <header class="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-5 py-3.5 shadow-sm backdrop-blur-md lg:px-7">
          <div class="flex items-center gap-3">
            <button
              class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 lg:hidden"
              @click="mobileOpen = true"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div class="flex items-center gap-2">
              <span class="hidden text-xs text-slate-400 sm:block">ODC Track</span>
              <svg class="hidden h-3 w-3 text-slate-300 sm:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6" /></svg>
              <h1 class="text-sm font-bold text-slate-900 sm:text-base">{{ props.title }}</h1>
            </div>
          </div>

          <div class="flex items-center gap-2 sm:gap-4">
            <button class="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600">
              <svg class="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span class="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#F16E00] ring-2 ring-white"></span>
            </button>
            <div class="hidden h-6 w-px bg-slate-200 sm:block"></div>
            <div class="hidden text-right sm:block">
              <p class="text-sm font-semibold leading-tight text-slate-900">{{ userName }}</p>
              <p class="text-xs text-slate-400">{{ roleLabel }}</p>
            </div>
            <div class="flex h-9 w-9 items-center justify-center rounded-full bg-[#F16E00] text-sm font-bold text-white shadow-md shadow-orange-500/25">{{ avatarInitial }}</div>
          </div>
        </header>

        <main class="flex-1 min-h-0 overflow-y-auto p-4 lg:p-6">
          <slot />
        </main>
      </div>
    </div>

    <!-- ── Mobile overlay ── -->
    <Transition name="fade-overlay">
      <div v-if="mobileOpen" class="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden" @click="mobileOpen = false" />
    </Transition>

    <!-- ── Mobile sidebar drawer ── -->
    <Transition name="slide-sidebar">
      <aside v-show="mobileOpen" class="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white shadow-2xl lg:hidden">
        <div class="flex items-center justify-between border-b border-gray-100 px-5 py-5">
          <AppSidebarBrand />
          <button class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-700" @click="mobileOpen = false">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <nav class="flex-1 overflow-y-auto px-3 py-5">
          <p class="mb-2 px-4 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Navigation</p>
          <div class="space-y-1">
            <RouterLink
              v-for="item in menu" :key="item.key" :to="item.to"
              :class="itemClass(item.key)"
              @click="mobileOpen = false"
            >
              <span>{{ item.label }}</span>
            </RouterLink>
          </div>
        </nav>
        <div class="border-t border-gray-100 px-3 py-4">
          <button type="button" class="sidebar-link-base w-full text-left text-red-500 hover:bg-red-50 hover:text-red-600" @click="logout">
            <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>
    </Transition>
  </div>
</template>

<style scoped>
.fade-overlay-enter-active,
.fade-overlay-leave-active {
  transition: opacity 0.25s ease;
}
.fade-overlay-enter-from,
.fade-overlay-leave-to {
  opacity: 0;
}
.slide-sidebar-enter-active,
.slide-sidebar-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-sidebar-enter-from,
.slide-sidebar-leave-to {
  transform: translateX(-100%);
}
</style>
