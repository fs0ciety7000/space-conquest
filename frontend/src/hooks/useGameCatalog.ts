import { useState, useEffect } from 'react'
import { apiUrl } from '@/config/api'

export interface ShipTypeCatalog {
  id: number
  ship_key: string
  display_name: string
  ship_class: string
  icon_name: string
  sort_order: number
  category: string
  attack: number
  shield: number
  hull: number
  cargo_capacity: number
  fuel_consumption: number
  base_speed: number
  shipyard_required: number
  cost_metal: number
  cost_crystal: number
  cost_deuterium: number
  build_time_seconds: number
  description: string | null
}

export interface BuildingTypeCatalog {
  id: number
  building_key: string
  name: string
  category: string
  icon_name: string
  sort_order: number
  max_level: number | null
  base_cost_metal: number
  base_cost_crystal: number
  base_cost_deuterium: number
  base_time_seconds: number
  cost_multiplier: number
  description: string | null
}

export interface DefenseTypeCatalog {
  id: number
  defense_key: string
  name: string
  category: string
  icon_name: string
  sort_order: number
  attack: number
  shield: number
  hull: number
  base_cost_metal: number
  base_cost_crystal: number
  base_cost_deuterium: number
  build_time_seconds: number
  description: string | null
}

interface GameCatalog {
  ships: ShipTypeCatalog[]
  buildings: BuildingTypeCatalog[]
  defenses: DefenseTypeCatalog[]
}

// Module-level cache — survives re-renders but not page reloads
let catalogCache: GameCatalog | null = null
let cacheTime = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function fetchCatalog(): Promise<GameCatalog> {
  if (catalogCache && Date.now() - cacheTime < CACHE_TTL) {
    return catalogCache
  }

  const [ships, buildings, defenses] = await Promise.all([
    fetch(apiUrl('/game/ship-types')).then(r => r.json()),
    fetch(apiUrl('/game/building-types')).then(r => r.json()),
    fetch(apiUrl('/game/defense-types')).then(r => r.json()),
  ])

  catalogCache = { ships, buildings, defenses }
  cacheTime = Date.now()
  return catalogCache
}

export function useGameCatalog() {
  const [catalog, setCatalog] = useState<GameCatalog | null>(catalogCache)
  const [loading, setLoading] = useState<boolean>(!catalogCache)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchCatalog()
      .then(c => {
        if (!cancelled) {
          setCatalog(c)
          setLoading(false)
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(String(err))
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [])

  return { catalog, loading, error }
}
