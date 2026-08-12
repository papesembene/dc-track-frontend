import { api } from "@/core/api/axios";
import { extractApiData } from "@/core/api/response";

export interface ParStatut {
  EN_EMPLOI: number;
  EN_STAGE: number;
  RECHERCHE_EMPLOI: number;
  PROJET_PERSO: number;
  POURSUITE_ETUDES: number;
}

export interface ParPromotion {
  promotionId: string;
  promotionNom: string;
  total: number;
  enEmploi: number;
}

export interface ParReferentiel {
  referentielId: string;
  referentielNom: string;
  total: number;
  enEmploi: number;
}

export interface SituationRecente {
  id: string;
  statut: string;
  createdAt: string;
  valide: boolean;
  apprenant: {
    user: {
      nom: string;
      prenom: string;
    };
  };
}

export interface StatistiquesGlobales {
  totalApprenants: number;
  totalSituations: number;
  enAttente: number;
  validees: number;
  tauxInsertion: number;
  parStatut: ParStatut;
  parPromotion: ParPromotion[];
  parReferentiel: ParReferentiel[];
  situationsRecentes: SituationRecente[];
}

export interface StatistiquesGlobalesOptions {
  promotionId?: string;
  includePromotions?: boolean;
  includeReferentiels?: boolean;
  includeSituationsRecentes?: boolean;
}

export interface StatistiquesPromotion {
  promotion: { id: string; nom: string; annee: number };
  totalApprenants: number;
  totalSituations: number;
  enAttente: number;
  validees: number;
  tauxInsertion: number;
  parStatut: ParStatut;
}

export interface StatistiquesReferentiel {
  referentiel: { id: string; nom: string };
  totalApprenants: number;
  tauxInsertion: number;
  parStatut: ParStatut;
}

// Module partage pour eviter de dupliquer les types et l'acces API
// des statistiques entre les differents espaces du front.
export async function getStatistiques(
  options?: StatistiquesGlobalesOptions,
): Promise<StatistiquesGlobales> {
  const res = await api.get("/statistiques/globales", { params: options });
  return extractApiData<StatistiquesGlobales>(res) as StatistiquesGlobales;
}

export async function getStatistiquesPromotion(
  promotionId: string,
): Promise<StatistiquesPromotion> {
  const res = await api.get(`/statistiques/promotions/${promotionId}`);
  return extractApiData<StatistiquesPromotion>(res) as StatistiquesPromotion;
}

export async function getStatistiquesReferentiel(
  referentielId: string,
): Promise<StatistiquesReferentiel> {
  const res = await api.get(`/statistiques/referentiels/${referentielId}`);
  return extractApiData<StatistiquesReferentiel>(
    res,
  ) as StatistiquesReferentiel;
}
