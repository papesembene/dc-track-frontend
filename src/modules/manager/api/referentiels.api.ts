import { api } from '@/core/api/axios'
import {
  extractApiData,
  extractApiItems,
  extractApiPagination,
} from '@/core/api/response'

export type ReferentielItem = {
  id: string
  nom: string
  description?: string | null
  createdAt?: string
  updatedAt?: string
}

export type ReferentielsPagination = {
  items: ReferentielItem[]
  pagination: {
    page: number
    limit: number
    totalItems: number
    totalPages: number
  }
}

export type ReferentielsQuery = {
  page?: number
  limit?: number
  search?: string
  sortBy?: 'createdAt' | 'nom'
  sortOrder?: 'asc' | 'desc'
}

export type ReferentielInput = {
  nom: string
  description?: string
}

export async function getReferentiels(
  query?: ReferentielsQuery,
): Promise<ReferentielsPagination> {
  const params = new URLSearchParams()

  if (query?.page) params.append('page', String(query.page))
  if (query?.limit) params.append('limit', String(query.limit))
  if (query?.search) params.append('search', query.search)
  if (query?.sortBy) params.append('sortBy', query.sortBy)
  if (query?.sortOrder) params.append('sortOrder', query.sortOrder)

   const suffix = params.toString() ? `?${params.toString()}` : ''
   const res = await api.get(`/referentiels/master-data${suffix}`)

  return {
    items: extractApiItems<ReferentielItem>(res),
    pagination: extractApiPagination(res),
  }
}

export async function createReferentiel(
  payload: ReferentielInput,
): Promise<ReferentielItem> {
  const res = await api.post('/referentiels', payload)
  return extractApiData<ReferentielItem>(res) as ReferentielItem
}

export async function updateReferentiel(
  id: string,
  payload: ReferentielInput,
): Promise<ReferentielItem> {
  const res = await api.put(`/referentiels/${id}`, payload)
  return extractApiData<ReferentielItem>(res) as ReferentielItem
}

export async function deleteReferentiel(id: string): Promise<void> {
  await api.delete(`/referentiels/${id}`)
}
