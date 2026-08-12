import { api } from "../../../core/api/axios";
import { getCachedMasterData } from "@/core/api/master-data-cache";
import { extractItems } from "./helpers";

type PromotionOption = {
  id: string;
  nom: string;
  annee?: number;
  createdAt?: string;
  estActive?: boolean;
  statut?: string;
  totalApprenants?: number;
  enEmploi?: number;
  tauxInsertion?: number;
};

type PromotionsMasterDataOptions = {
  includeMetrics?: boolean;
  forceRefresh?: boolean;
};

type ReferentielOption = {
  id: string;
  nom: string;
  createdAt?: string;
};

type PendingSituation = {
  id: string;
  statut: string;
  dateDebut: string;
  dateFin: string | null;
  createdAt: string;
  nomEntrepriseLibre?: string | null;
  entreprise?: { nom?: string | null } | null;
  apprenant: {
    user: {
      nom: string;
      prenom: string;
    };
    promotion: {
      nom: string;
    };
    referentiel: {
      nom: string;
    };
  };
};

export interface PendingSituationsQuery {
  search?: string;
  promotionId?: string;
  referentielId?: string;
  statut?: string;
}

/**
 * Récupère la liste des situations professionnelles en attente de validation.
 * @returns Tableau de situations en attente
 */
export async function getSituationsEnAttente(
  query?: PendingSituationsQuery,
): Promise<PendingSituation[]> {
  const res = await api.get("/situations/attentes", { params: query });
  return extractItems<PendingSituation>(res);
}

/**
 * Récupère la liste de toutes les promotions.
 * @returns Tableau de promotions
 */
export async function getPromotions(
  options: PromotionsMasterDataOptions = {},
): Promise<PromotionOption[]> {
  return getCachedMasterData(
    `master-data:promotions:${options.includeMetrics === false ? "light" : "full"}`,
    async () => {
      const res = await api.get("/promotions/master-data", {
        params: {
          includeMetrics: options.includeMetrics !== false,
          forceRefresh: options.forceRefresh ? "true" : undefined,
        },
      });
      return extractItems<PromotionOption>(res);
    },
    {
      ttlMs: 5 * 60 * 1000,
      staleTtlMs: 30 * 60 * 1000,
      forceRefresh: options.forceRefresh,
    },
  );
}

/**
 * Récupère la promotion active.
 * Le pôle emploi l'utilise comme filtre initial, sans empêcher ensuite
 * la consultation d'une autre promotion.
 */
export async function getActivePromotion(
  options: { forceRefresh?: boolean } = {},
): Promise<PromotionOption | null> {
  return getCachedMasterData(
    "master-data:active-promotion",
    async () => {
      const res = await api.get("/promotions/master-data/active", {
        params: {
          forceRefresh: options.forceRefresh ? "true" : undefined,
        },
      });
      return res?.data?.data || null;
    },
    {
      ttlMs: 5 * 60 * 1000,
      staleTtlMs: 30 * 60 * 1000,
      forceRefresh: options.forceRefresh,
    },
  );
}

/**
 * Récupère la liste de tous les référentiels.
 * @returns Tableau de référentiels
 */
export async function getReferentiels(
  options: { forceRefresh?: boolean } = {},
): Promise<ReferentielOption[]> {
  return getCachedMasterData(
    "master-data:referentiels",
    async () => {
      const res = await api.get("/referentiels/master-data", {
        params: {
          forceRefresh: options.forceRefresh ? "true" : undefined,
        },
      });
      return extractItems<ReferentielOption>(res);
    },
    {
      ttlMs: 5 * 60 * 1000,
      staleTtlMs: 30 * 60 * 1000,
      forceRefresh: options.forceRefresh,
    },
  );
}

/**
 * Récupère les promotions locales de Soutenance.
 * Utilisé pour les cas historiques afin de réutiliser une promotion déjà créée.
 */
export async function getLocalPromotions(): Promise<PromotionOption[]> {
  const res = await api.get("/promotions", {
    params: { page: 1, limit: 100 },
  });
  return extractItems<PromotionOption>(res);
}

/**
 * Récupère les référentiels locaux de Soutenance.
 * Utilisé pour sélectionner un référentiel historique existant.
 */
export async function getLocalReferentiels(): Promise<ReferentielOption[]> {
  const res = await api.get("/referentiels", {
    params: { page: 1, limit: 100 },
  });
  return extractItems<ReferentielOption>(res);
}
