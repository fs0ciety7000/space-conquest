import { useState, useEffect } from 'react';
import { apiUrl } from '@/config/api';

interface UnitCost {
  metal: number;
  crystal: number;
}

interface UnitCosts {
  light_hunter: UnitCost;
  cruiser: UnitCost;
  transporter: UnitCost;
  recycler: UnitCost;
  spy_probe: UnitCost;
  colony_ship: UnitCost;
  missile_launcher: UnitCost;
  plasma_turret: UnitCost;
}

export function useUnitCosts() {
  const [costs, setCosts] = useState<UnitCosts | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCosts = async () => {
      try {
        const res = await fetch(apiUrl('/unit-costs'));
        if (res.ok) {
          const data = await res.json();
          setCosts(data);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des coûts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCosts();
  }, []);

  return { costs, loading };
}
