/**
 * API pour les promotions et référentiels (Manager)
 */
import { api } from "@/core/api/axios";
import { getCachedMasterData } from "@/core/api/master-data-cache";
import {
  extractApiData,
  extractApiItems,
  extractApiPagination,
} from "@/core/api/response";

// ============================================
// TYPES
// ============================================

/**
 * Type représentant une promotion
 */
export type PromotionItem = {
  id: string;
  nom: string;
  annee: number;
  estActive?: boolean;
  totalApprenants?: number;
  enEmploi?: number;
  tauxInsertion?: number;
  createdAt?: string;
  updatedAt?: string;
  referentiels?: Array<{
    referentielId: string;
    referentiel: ReferentielItem;
  }>;
};

export type PromotionWithReferentiels = PromotionItem;

/**
 * Type représentant un référentiel
 */
export type ReferentielItem = {
  id: string;
  nom: string;
  description?: string;
};

export type PromotionsPagination = {
  items: PromotionItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};

export type PromotionsMasterDataOptions = {
  includeMetrics?: boolean;
  forceRefresh?: boolean;
};

export interface PromotionInput {
  nom: string;
  annee: number;
  referentielIds: string[];
}

// ============================================
// API
// ============================================

/**
 * Récupère la liste des promotions.
 *
 * @returns Promesse avec la liste des promotions
 */
export async function getPromotions(
  options: PromotionsMasterDataOptions = {},
): Promise<PromotionsPagination> {
  return getCachedMasterData(
    `master-data:promotions:${options.includeMetrics === false ? "light" : "full"}`,
    async () => {
      const res = await api.get("/promotions/master-data", {
        params: {
          includeMetrics: options.includeMetrics !== false,
        },
      });
      return {
        items: extractApiItems<PromotionItem>(res),
        pagination: extractApiPagination(res),
      };
    },
    {
      ttlMs: 5 * 60 * 1000,
      staleTtlMs: 30 * 60 * 1000,
      forceRefresh: options.forceRefresh,
    },
  );
}

/**
 * Récupère la liste des référentiels.
 *
 * @returns Promesse avec la liste des référentiels
 */
export async function getReferentiels(options: { forceRefresh?: boolean } = {}): Promise<ReferentielItem[]> {
  return getCachedMasterData(
    "master-data:referentiels",
    async () => {
      const res = await api.get("/referentiels/master-data");
      return extractApiItems<ReferentielItem>(res);
    },
    {
      ttlMs: 5 * 60 * 1000,
      staleTtlMs: 30 * 60 * 1000,
      forceRefresh: options.forceRefresh,
    },
  );
}

/**
 * Active une promotion (désactive automatiquement les autres)
 *
 * @param id - ID de la promotion à activer
 * @returns Promesse avec la promotion activée
 */
export async function activatePromotion(id: string): Promise<PromotionItem> {
  const res = await api.post(`/promotions/${id}/activate`);
  return extractApiData<PromotionItem>(res) as PromotionItem;
}

/**
 * Récupère la promotion active
 *
 * @returns Promesse avec la promotion active ou null
 */
export async function getActivePromotion(
  options: { forceRefresh?: boolean } = {},
): Promise<PromotionWithReferentiels | null> {
  return getCachedMasterData(
    "master-data:active-promotion",
    async () => {
      const res = await api.get("/promotions/master-data/active");
      return extractApiData<PromotionWithReferentiels | null>(res);
    },
    {
      ttlMs: 5 * 60 * 1000,
      staleTtlMs: 30 * 60 * 1000,
      forceRefresh: options.forceRefresh,
    },
  );
}

export async function createPromotion(
  payload: PromotionInput,
): Promise<PromotionWithReferentiels> {
  const res = await api.post("/promotions", payload);
  return extractApiData<PromotionWithReferentiels>(res) as PromotionWithReferentiels;
}

export async function updatePromotion(
  id: string,
  payload: PromotionInput,
): Promise<PromotionWithReferentiels> {
  const res = await api.put(`/promotions/${id}`, payload);
  return extractApiData<PromotionWithReferentiels>(res) as PromotionWithReferentiels;
}
