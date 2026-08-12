<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import ManagerLayout from '@/modules/manager/layouts/ManagerLayout.vue'
import { getStatistiques, type StatistiquesGlobales } from '@/modules/manager/api/statistiques.api'
import { getPromotions, type PromotionItem } from '@/modules/manager/api/promotions.api'
import PageLoadingState from '@/shared/components/PageLoadingState.vue'
import EmptyState from '@/shared/components/EmptyState.vue'

// ── Data from API ──
const statsData = ref<StatistiquesGlobales | null>(null)
const activePromotion = ref<PromotionItem | null>(null)
const promotionOptions = ref<PromotionItem[]>([])
const selectedPromotionId = ref('')
const loading = ref(true)
const hasLoaded = ref(false)
const error = ref<string | null>(null)

async function loadDashboard() {
  loading.value = true
  error.value = null

  try {
    const activePromo =
      activePromotion.value ??
      promotionOptions.value.find((promotion) => promotion.estActive) ??
      null
    const stats = await getStatistiques({
      promotionId: selectedPromotionId.value || activePromo?.id || undefined,
      includePromotions: true,
      includeReferentiels: false,
      includeSituationsRecentes: true,
      forceRefresh: true,
    })

    statsData.value = stats
    activePromotion.value = activePromo
    hasLoaded.value = true
  } catch (e: any) {
    error.value = e.message || 'Erreur lors du chargement des données'
    console.error('Erreur:', e)
  } finally {
    loading.value = false
  }
}

async function handlePromotionChange() {
  await loadDashboard()
}

// ── Fetch data on mount ──
onMounted(async () => {
  try {
    const allPromotions = await getPromotions({
      includeMetrics: false,
      forceRefresh: true,
    })

    promotionOptions.value = allPromotions.items
    activePromotion.value =
      allPromotions.items.find((promotion) => promotion.estActive) ?? null
    selectedPromotionId.value = activePromotion.value?.id || ''

    await loadDashboard()
  } catch (e: any) {
    error.value = e.message || 'Erreur lors du chargement des données'
    console.error('Erreur:', e)
    loading.value = false
  }
})

// ── Computed stats for cards ──
const stats = computed(() => {
  if (!statsData.value) {
    return [
      { label: 'Total Apprenants', value: '-', badge: '', badgeClass: 'bg-slate-100 text-slate-500', iconBg: 'bg-orange-50', iconColor: 'text-orange-400', icon: 'graduation' },
      { label: 'Coaches actifs', value: '-', badge: '', badgeClass: 'bg-slate-100 text-slate-500', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500', icon: 'coach' },
      { label: 'Situations validées', value: '-', badge: '', badgeClass: 'bg-slate-100 text-slate-500', iconBg: 'bg-teal-50', iconColor: 'text-[#009682]', icon: 'check' },
      { label: "Taux d'insertion", value: '-', badge: '', badgeClass: 'bg-slate-100 text-slate-500', iconBg: 'bg-amber-50', iconColor: 'text-amber-400', icon: 'trend' },
    ]
  }
  
  const { totalApprenants, validees, tauxInsertion } = statsData.value
  
  return [
    {
      label: 'Total Apprenants',
      value: String(totalApprenants),
      badge: '',
      badgeClass: 'bg-slate-100 text-slate-500',
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-400',
      icon: 'graduation',
    },
    {
      label: 'Promotion active',
      value: activePromotion.value ? '1' : '0',
      badge: '',
      badgeClass: 'bg-slate-100 text-slate-500',
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-500',
      icon: 'coach',
    },
    {
      label: 'Situations validées',
      value: String(validees),
      badge: '',
      badgeClass: 'bg-slate-100 text-slate-500',
      iconBg: 'bg-teal-50',
      iconColor: 'text-[#009682]',
      icon: 'check',
    },
    {
      label: "Taux d'insertion",
      value: `${tauxInsertion}%`,
      badge: '',
      badgeClass: 'bg-slate-100 text-slate-500',
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-400',
      icon: 'trend',
    },
  ]
})

// ── Computed alerts from data ──
const alerts = computed(() => {
  const result: Array<{
    type: 'warning' | 'info' | 'success'
    bg: string
    iconColor: string
    text: string
    href: string
  }> = []
  
  if (statsData.value?.enAttente && statsData.value.enAttente > 0) {
    result.push({
      type: 'warning',
      bg: 'bg-amber-50',
      iconColor: 'text-amber-400',
      text: `${statsData.value.enAttente} situation${statsData.value.enAttente > 1 ? 's' : ''} en attente de validation`,
      href: '/manager/statistiques',
    })
  }
  
  if (statsData.value?.parStatut) {
    const enRecherche = statsData.value.parStatut.RECHERCHE_EMPLOI || 0
    if (enRecherche > 0) {
      result.push({
        type: 'info',
        bg: 'bg-teal-50',
        iconColor: 'text-[#009682]',
        text: `${enRecherche} apprenant${enRecherche > 1 ? 's' : ''} en recherche d'emploi`,
        href: '/manager/apprenants',
      })
    }
  }
  
  if (statsData.value?.tauxInsertion && statsData.value.tauxInsertion >= 75) {
    result.push({
      type: 'success',
      bg: 'bg-slate-100',
      iconColor: 'text-slate-500',
      text: `Taux d'insertion de ${statsData.value.tauxInsertion}% atteint`,
      href: '/manager/statistiques',
    })
  }
  
  return result
})

// ── Computed activities from situations recentes ──
const activities = computed(() => {
  if (!statsData.value?.situationsRecentes) return []
  
  return statsData.value.situationsRecentes.map((sit, idx) => {
    const apprenant = sit.apprenant?.user
    const nomComplet = apprenant ? `${apprenant.prenom} ${apprenant.nom}` : 'Apprenant'
    
    let action = ''
    let icon = 'briefcase'
    let iconBg = 'bg-orange-100'
    let iconColor = 'text-orange-500'
    let tag = ''
    let tagClass = 'bg-orange-100 text-orange-600'
    
    switch (sit.statut) {
      case 'EN_EMPLOI':
        action = 'Nouvelle situation déclarée'
        tag = 'Emploi'
        break
      case 'EN_STAGE':
        action = 'Nouvelle situation déclarée'
        tag = 'Stage'
        tagClass = 'bg-teal-50 text-[#009682]'
        break
      case 'RECHERCHE_EMPLOI':
        action = 'En recherche d\'emploi'
        tag = 'Recherche'
        tagClass = 'bg-amber-100 text-amber-600'
        break
      default:
        action = 'Situation mise à jour'
    }
    
    if (sit.valide) {
      action = 'Situation validée'
      tag = 'Validé'
      tagClass = 'bg-emerald-100 text-emerald-600'
      iconBg = 'bg-emerald-100'
      iconColor = 'text-emerald-500'
      icon = 'check'
    }
    
    return {
      id: sit.id || idx,
      name: nomComplet,
      action,
      tag,
      tagClass,
      time: formatTimeAgo(sit.createdAt),
      iconBg,
      iconColor,
      icon,
    }
  })
})

// ── Helpers ──
function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return 'Récent'
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 60) return `Il y a ${diffMins} min`
  if (diffHours < 24) return `Il y a ${diffHours}h`
  if (diffDays < 7) return `Il y a ${diffDays}j`
  return date.toLocaleDateString('fr-FR')
}

// ── Computed promotions from data ──
const promotions = computed(() => {
  if (promotionOptions.value.length === 0) return []

  return promotionOptions.value.map((promotion) => {
    const taux = Math.round(promotion.tauxInsertion ?? 0)
    const apprenants = promotion.totalApprenants ?? 0
    const isActivePromotion = activePromotion.value?.id === promotion.id
    const isSelectedPromotion = selectedPromotionId.value === promotion.id
    const statusClass = isActivePromotion
      ? 'border-slate-300 text-slate-700 bg-slate-100'
      : isSelectedPromotion
        ? 'border-orange-200 text-orange-700 bg-orange-50'
        : 'border-slate-200 text-slate-500 bg-slate-50'
    
    return {
      name: promotion.nom,
      status: isActivePromotion ? 'Active' : isSelectedPromotion ? 'Consultée' : 'Suivi',
      statusClass,
      apprenants,
      taux,
      hasTaux: apprenants > 0,
    }
  })
})
</script>

<template>
  <ManagerLayout title="Tableau de bord Manager" active-menu="dashboard">
    <div class="space-y-5">
      <!-- Loading state -->
      <PageLoadingState
        v-if="loading && !hasLoaded"
        message="Chargement des statistiques..."
      />

      <!-- Error state -->
      <div v-else-if="error" class="rounded-xl bg-red-50 p-4 text-red-600">
        {{ error }}
      </div>

      <template v-else>
        <!-- ── Active Promotion Banner ── -->
        <div v-if="activePromotion" class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-800">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-full bg-white border border-slate-200">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                  <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                </svg>
              </div>
              <div>
                <p class="text-sm text-slate-500">Promotion active</p>
                <p class="text-lg font-bold">{{ activePromotion.nom }} ({{ activePromotion.annee }})</p>
              </div>
            </div>
            <div class="text-sm text-slate-500">
              Données filtrées automatiquement
            </div>
          </div>
          <div class="mt-4 flex flex-col gap-2 sm:max-w-xs">
            <label class="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Promotion
            </label>
            <select
              v-model="selectedPromotionId"
              class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition-colors focus:border-[#F16E00] focus:ring-2 focus:ring-orange-100"
              @change="handlePromotionChange"
            >
              <option
                v-for="promotion in promotionOptions"
                :key="promotion.id"
                :value="promotion.id"
              >
                {{ promotion.nom }} ({{ promotion.annee }})
              </option>
            </select>
          </div>
        </div>

        <div v-else class="rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-700">
          <div class="flex items-center gap-3">
            <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <p>Aucune promotion active. Veuillez activer une promotion depuis la page Promotions.</p>
          </div>
        </div>

        <!-- ── Stat cards ── -->
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article
            v-for="stat in stats"
            :key="stat.label"
            class="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            <div class="flex items-start justify-between">
              <div :class="['flex h-11 w-11 items-center justify-center rounded-lg', stat.iconBg]">
                <!-- graduation cap -->
                <svg v-if="stat.icon === 'graduation'" :class="['h-5 w-5', stat.iconColor]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                  <path d="M6 12v5c3 3 9 3 12 0v-5"/>
                </svg>
                <!-- coach icon -->
                <svg v-else-if="stat.icon === 'coach'" :class="['h-5 w-5', stat.iconColor]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="8" r="4"/>
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                </svg>
                <!-- check circle -->
                <svg v-else-if="stat.icon === 'check'" :class="['h-5 w-5', stat.iconColor]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="9"/>
                  <polyline points="9 12 11.5 14.5 15.5 10"/>
                </svg>
                <!-- trend chart -->
                <svg v-else :class="['h-5 w-5', stat.iconColor]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="4 4 4 20 20 20"/>
                  <polyline points="7 14 11 10 14 13 19 7"/>
                </svg>
              </div>
              <span :class="['rounded-full px-2.5 py-0.5 text-xs font-medium', stat.badgeClass]">{{ stat.badge }}</span>
            </div>
            <p class="mt-4 text-3xl font-bold text-slate-900">{{ stat.value }}</p>
            <p class="mt-1 text-sm text-slate-500">{{ stat.label }}</p>
          </article>
        </div>

        <!-- ── Alert banners ── -->
        <div v-if="alerts.length > 0" class="grid gap-4 sm:grid-cols-3">
          <div
            v-for="alert in alerts"
            :key="alert.text"
            :class="['rounded-xl border border-gray-100 p-4', alert.bg]"
          >
            <div class="flex items-start gap-3">
              <!-- warning -->
              <svg v-if="alert.type === 'warning'" :class="['mt-0.5 h-5 w-5 shrink-0', alert.iconColor]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <!-- info -->
              <svg v-else-if="alert.type === 'info'" :class="['mt-0.5 h-5 w-5 shrink-0', alert.iconColor]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="9"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <!-- success check -->
              <svg v-else :class="['mt-0.5 h-5 w-5 shrink-0', alert.iconColor]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="9"/>
                <polyline points="9 12 11.5 14.5 15.5 10"/>
              </svg>
              <p class="text-sm text-slate-700 font-medium leading-snug">{{ alert.text }}</p>
            </div>
            <a :href="alert.href" class="mt-3 inline-block text-sm font-semibold text-orange-500 hover:underline">Voir le détail →</a>
          </div>
        </div>

        <!-- ── Activité récente ── -->
        <div class="rounded-xl border border-gray-100 bg-white shadow-sm">
            <div class="flex items-center justify-between px-6 py-4">
              <h2 class="text-base font-bold text-slate-900">Activité récente</h2>
              <a href="/manager/statistiques" class="text-sm font-semibold text-orange-500 hover:underline">Voir tout</a>
            </div>
            <div class="divide-y divide-slate-100 px-6">
              <article v-for="item in activities" :key="item.id" class="flex items-start gap-4 py-4">
                <div :class="['flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', item.iconBg]">
                  <!-- briefcase -->
                  <svg v-if="item.icon === 'briefcase'" :class="['h-4 w-4', item.iconColor]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2"/>
                    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                  </svg>
                  <!-- document -->
                  <svg v-else-if="item.icon === 'document'" :class="['h-4 w-4', item.iconColor]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <!-- check -->
                  <svg v-else-if="item.icon === 'check'" :class="['h-4 w-4', item.iconColor]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="9"/>
                    <polyline points="9 12 11.5 14.5 15.5 10"/>
                  </svg>
                  <!-- person -->
                  <svg v-else :class="['h-4 w-4', item.iconColor]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="8" r="4"/>
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                  </svg>
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="text-sm font-semibold text-slate-900">{{ item.name }}</span>
                    <span class="text-sm text-slate-500">— {{ item.action }}</span>
                    <span
                      v-if="item.tag"
                      :class="['rounded-full px-2.5 py-0.5 text-xs font-semibold', item.tagClass]"
                    >{{ item.tag }}</span>
                  </div>
                  <p class="mt-0.5 text-xs text-slate-400">{{ item.time }}</p>
                </div>
              </article>
              
              <!-- Empty state -->
              <EmptyState
                v-if="activities.length === 0"
                title="Aucune activité récente"
                compact
              />
            </div>
        </div>

        <!-- ── Promotions en cours ── -->
        <div v-if="promotions.length > 0" class="rounded-xl border border-gray-100 bg-white shadow-sm px-6 py-5">
          <div class="flex items-center justify-between pb-4 border-b border-slate-100">
            <h2 class="text-base font-bold text-slate-900">Promotions</h2>
            <a href="/manager/statistiques" class="text-sm font-semibold text-orange-500 hover:underline">Voir les stats</a>
          </div>

          <div class="mt-5 grid gap-4 sm:grid-cols-3">
            <div
              v-for="promo in promotions"
              :key="promo.name"
              class="rounded-xl border border-slate-200 p-4"
            >
              <div class="flex items-center justify-between mb-4">
                <p class="text-sm font-bold text-slate-900">{{ promo.name }}</p>
                <span :class="['rounded-full border px-2.5 py-0.5 text-xs font-medium', promo.statusClass]">
                  {{ promo.status }}
                </span>
              </div>
              <div class="flex items-center justify-between text-sm mb-1">
                <span class="text-slate-500">Apprenants</span>
                <span class="font-semibold text-slate-900">{{ promo.apprenants }}</span>
              </div>
              <template v-if="promo.hasTaux">
                <div class="flex items-center justify-between text-sm mt-2 mb-2">
                  <span class="text-slate-500">Taux d'insertion</span>
                  <span class="font-bold text-slate-700">{{ promo.taux }}%</span>
                </div>
                <div class="h-1.5 rounded-full bg-slate-100">
                  <div
                    class="h-1.5 rounded-full bg-slate-700 transition-all"
                    :style="{ width: promo.taux + '%' }"
                  ></div>
                </div>
              </template>
            </div>
          </div>
        </div>
      </template>

    </div>
  </ManagerLayout>
</template>
