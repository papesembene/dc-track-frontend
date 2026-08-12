<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useCurrentUser } from '@/core/auth/useCurrentUser'
import { clearAuthenticatedSession } from '@/core/auth/auth-session'
import AppSidebarBrand from '@/shared/components/AppSidebarBrand.vue'

type ManagerMenuKey =
  | 'dashboard'
  | 'apprenants'
  | 'coaches'
  | 'promotions'
  | 'referentiels'
  | 'statistiques'

const props = defineProps<{
  title: string
  activeMenu: ManagerMenuKey
}>()

const mobileOpen = ref(false)
const router = useRouter()

const { user, userName, role, hydrateCurrentUser } = useCurrentUser()

onMounted(() => {
  hydrateCurrentUser()
})

const roleLabel = computed(() => {
  const r = role.value?.toUpperCase()
  switch (r) {
    case 'MANAGER': return 'Manager'
    case 'POLE_EMPLOI': return 'Pôle Emploi'
    case 'ADMIN': return 'Administrateur'
    case 'COACH': return 'Coach'
    case 'APPRENANT': return 'Apprenant'
    default: return r || 'Utilisateur'
  }
})

const userInitials = computed(() => {
  const prenom = user.value.prenom
  const nom = user.value.nom
  if (prenom || nom) {
    return `${prenom?.[0] || ''}${nom?.[0] || ''}`.toUpperCase()
  }
  const name = userName.value
  return name?.[0]?.toUpperCase() || '?'
})

const menu: Array<{ key: ManagerMenuKey; label: string; to: string }> = [
  { key: 'dashboard',    label: 'Tableau de bord', to: '/dashboard-manager' },
  { key: 'apprenants',  label: 'Apprenants',       to: '/manager/apprenants' },
  { key: 'coaches',     label: 'Coaches',           to: '/manager/coaches' },
  { key: 'promotions',  label: 'Promotions',        to: '/manager/promotions' },
  { key: 'referentiels',label: 'Référentiels',      to: '/manager/referentiels' },
  { key: 'statistiques',label: 'Statistiques',      to: '/manager/statistiques' },
]

const linkClass = (key: ManagerMenuKey) => {
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

      <!-- ── Desktop Sidebar ── -->
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
            <RouterLink v-for="item in menu" :key="item.key" :to="item.to" :class="linkClass(item.key)">
              <svg v-if="item.key === 'dashboard'" class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
              <svg v-else-if="item.key === 'apprenants'" class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <svg v-else-if="item.key === 'coaches'" class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
              <svg v-else-if="item.key === 'promotions'" class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <svg v-else-if="item.key === 'referentiels'" class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              <svg v-else class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
              <span>{{ item.label }}</span>
            </RouterLink>
          </div>
        </nav>

        <div class="border-t border-gray-100 px-3 py-4">
          <button type="button" @click="logout" class="sidebar-link-base w-full text-left text-red-500 hover:bg-red-50 hover:text-red-600">
            <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      <!-- ── Main ── -->
      <div class="flex min-w-0 min-h-0 flex-1 flex-col">
        <header class="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-5 py-3.5 shadow-sm backdrop-blur-md lg:px-7">
          <div class="flex items-center gap-3">
            <button class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 lg:hidden" @click="mobileOpen = true">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <div class="flex items-center gap-2">
              <span class="hidden text-xs text-slate-400 sm:block">ODC Track</span>
              <svg class="hidden h-3 w-3 text-slate-300 sm:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6" /></svg>
              <h1 class="text-sm font-bold text-slate-900 sm:text-base">{{ title }}</h1>
            </div>
          </div>

          <div class="flex items-center gap-2 sm:gap-4">
            <button class="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600">
              <svg class="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <span class="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#F16E00] ring-2 ring-white"></span>
            </button>
            <div class="hidden h-6 w-px bg-slate-200 sm:block"></div>
            <div class="hidden text-right sm:block">
              <p class="text-sm font-semibold leading-tight text-slate-900">{{ userName }}</p>
              <p class="text-xs text-slate-400">{{ roleLabel }}</p>
            </div>
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F16E00] text-sm font-bold text-white shadow-md shadow-orange-500/25">
              {{ userInitials }}
            </div>
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

    <!-- ── Mobile sidebar ── -->
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
        <nav class="flex-1 px-3 py-4 space-y-1">
          <RouterLink
            v-for="item in menu" :key="item.key" :to="item.to"
            :class="linkClass(item.key)"
            @click="mobileOpen = false"
          >
            <span>{{ item.label }}</span>
          </RouterLink>
        </nav>
        <div class="border-t border-gray-100 px-3 py-4">
          <button type="button" @click="logout" class="sidebar-link-base w-full text-left text-red-500 hover:bg-red-50 hover:text-red-600">
            <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
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
