/**
 * API pour les apprenants (Manager)
 */
import { api } from "@/core/api/axios";
import {
  extractApiData,
  extractApiItems,
  extractApiPagination,
} from "@/core/api/response";

// ============================================
// TYPES
// ============================================

/**
 * Type représentant un apprenant dans la liste.
 */
export type ApprenantListItem = {
  id: string;
  // Relations
  user: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
  };
  promotion: {
    id: string;
    nom: string;
  };
  referentiel: {
    id: string;
    nom: string;
  };
  // Compteurs de situations
  _count?: {
    situations: number;
  };
  situations?: {
    valide: boolean;
  }[];
};

/**
 * Type pour la pagination
 */
export type ApprenantsPagination = {
  items: ApprenantListItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
  summary?: {
    totalWithSituations: number;
  };
};

/**
 * Paramètres de requête pour la liste des apprenants
 */
export interface ApprenantsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  promotionId?: string;
  referentielId?: string;
}

/**
 * Type pour une situation professionnelle
 */
export type SituationItem = {
  id: string;
  statut: string;
  dateDebut: string | null;
  dateFin: string | null;
  commentaire: string | null;
  valide: boolean;
  createdAt: string;
  entreprise: {
    nom: string;
  } | null;
  nomEntrepriseLibre: string | null;
};

/**
 * Type pour le détail complet d'un apprenant
 */
export type ApprenantDetail = {
  id: string;
  localId?: string | null;
  telephone: string | null;
  user: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
  };
  promotion: {
    id: string;
    nom: string;
  };
  referentiel: {
    id: string;
    nom: string;
  };
  cvDocument?: {
    id: string;
    type: string;
    fichier: string;
    dateUpload?: string;
    createdAt?: string;
    updatedAt?: string;
  } | null;
  situations: SituationItem[];
};

// ============================================
// API
// ============================================

/**
 * Récupère la liste paginée des apprenants.
 *
 * @param query - Paramètres de pagination et filtres
 * @returns Promesse avec les apprenants et infos de pagination
 */
export async function getApprenants(
  query?: ApprenantsQueryParams,
): Promise<ApprenantsPagination> {
  const params = new URLSearchParams();
  if (query?.page) params.append("page", String(query.page));
  if (query?.limit) params.append("limit", String(query.limit));
  if (query?.search) params.append("search", query.search);
  if (query?.promotionId) params.append("promotionId", query.promotionId);
  if (query?.referentielId) params.append("referentielId", query.referentielId);

  const queryString = params.toString();
  const url = queryString ? `/apprenants/master-data?${queryString}` : "/apprenants/master-data";

  const res = await api.get(url);
  const items = extractApiItems<ApprenantListItem>(res);
  const pagination = extractApiPagination(res);
  const data = extractApiData<any>(res);

  return {
    items,
    pagination,
    summary: data?.summary
      ? {
          totalWithSituations: Number(data.summary.totalWithSituations ?? 0),
        }
      : undefined,
  };
}

/**
 * Récupère le détail d'un apprenant par son ID.
 *
 * @param id - UUID de l'apprenant
 * @returns Détails de l'apprenant
 */
export async function getApprenantById(
  id: string,
): Promise<ApprenantDetail | null> {
  const res = await api.get(`/apprenants/master-data/${id}`);
  return extractApiData<ApprenantDetail | null>(res);
}

export async function exportApprenantsXlsx(
  query?: ApprenantsQueryParams,
): Promise<Blob> {
  const params = new URLSearchParams();
  if (query?.search) params.append("search", query.search);
  if (query?.promotionId) params.append("promotionId", query.promotionId);
  if (query?.referentielId) params.append("referentielId", query.referentielId);

  const queryString = params.toString();
  const url = queryString
    ? `/apprenants/export/xlsx?${queryString}`
    : "/apprenants/export/xlsx";

  const res = await api.get(url, { responseType: "blob" });
  return res.data as Blob;
}
