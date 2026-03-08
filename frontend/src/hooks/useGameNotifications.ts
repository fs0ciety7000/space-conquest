// ANTIGRAVITY: Ce hook écoute les CustomEvents dispatché par useWebSocket.ts et affiche
// des toasts enrichis (sonner). Il est branché dans App.tsx (~ligne 166) via useGameNotifications().
// ⚠️ Pour l'effet "flash rouge" lors des attaques, ajouter dans src/index.css :
//   @keyframes redFlash { 0%,100% { box-shadow: inset 0 0 0px rgba(239,68,68,0); } 50% { box-shadow: inset 0 0 60px rgba(239,68,68,.35); } }
//   body.alert-red-flash { animation: redFlash 0.8s ease-in-out 6; }
import { useEffect } from 'react';
import { toast } from 'sonner';

export interface GameNotification {
  type: string;
  title: string;
  message: string;
  timestamp: Date;
}

export function useGameNotifications() {
  useEffect(() => {
    // Écoute des événements spécifiques pour les notifications avancées (Expansion 3.0)
    
    const handleMarketSale = (e: Event) => {
      const d = (e as CustomEvent<{
        resource: string; amount: number;
        payment_resource: string; payment_amount: number; buyer_name: string;
      }>).detail;
      toast.success('💰 Vente au Marché réussie !', {
        description: `${d.amount.toLocaleString()} ${d.resource} vendus à ${d.buyer_name} — reçu ${Math.round(d.payment_amount).toLocaleString()} ${d.payment_resource}.`,
      });
    };

    const handlePlanetSold = (e: Event) => {
      const d = (e as CustomEvent<{
        planet_name: string; buyer_name: string;
        price_metal: number; price_crystal: number; price_deuterium: number;
      }>).detail;
      const total = d.price_metal + d.price_crystal + d.price_deuterium;
      toast.warning('🪐 Planète Vendue', {
        description: `Votre planète ${d.planet_name} a été achetée par ${d.buyer_name} pour ${total.toLocaleString()} ressources.`,
        duration: 8000,
      });
    };

    const handleIncomingAttack = (e: Event) => {
      const d = (e as CustomEvent<{
        attacker_name: string; source_coords: string; arrival_time: string; ships_count: number;
      }>).detail;
      toast.error('⚠️ ALERTE ROUGE : ATTAQUE IMMINENTE ⚠️', {
        description: `La flotte de ${d.attacker_name} (${d.ships_count} vaisseaux) depuis ${d.source_coords} — Impact : ${d.arrival_time}.`,
        duration: Infinity,
      });
      document.body.classList.add('alert-red-flash');
      setTimeout(() => document.body.classList.remove('alert-red-flash'), 5000);
    };

    const handleSpyAlert = (e: Event) => {
      const d = (e as CustomEvent<{ from: string }>).detail;
      toast.warning('🕵️ Sonde d\'espionnage détectée !', {
        description: `Origine : ${d.from}. Nos boucliers ont intercepté leur signal.`,
      });
    };

    const handleSabotageAlert = (e: Event) => {
      const d = (e as CustomEvent<{
        attacker_name: string; planet_name: string; effect_type: string;
      }>).detail;
      const actionTxt = d.effect_type === 'disable_mine' ? 'vos infrastructures minières' : 'vos bases de données de recherche';
      toast.error('🚨 SABOTAGE EN COURS', {
        description: `Agents de ${d.attacker_name} repérés sur ${d.planet_name} — cible : ${actionTxt}.`,
        duration: 10000,
      });
    };

    const handleAllianceInvite = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      toast.info('🤝 Nouvelle Invitation d\'Alliance', {
        description: `L'alliance [${detail.alliance_tag}] ${detail.alliance_name} souhaite vous recruter !`,
        action: {
          label: 'Voir',
          onClick: () => { /* Logique de navigation vers l'onglet Alliance */ }
        }
      });
    };

    window.addEventListener('market-sale', handleMarketSale);
    window.addEventListener('planet-sold', handlePlanetSold);
    window.addEventListener('incoming-attack-alert', handleIncomingAttack);
    window.addEventListener('spy-alert-advanced', handleSpyAlert);
    window.addEventListener('sabotage-alert-advanced', handleSabotageAlert);
    window.addEventListener('alliance-invite', handleAllianceInvite);

    return () => {
      window.removeEventListener('market-sale', handleMarketSale);
      window.removeEventListener('planet-sold', handlePlanetSold);
      window.removeEventListener('incoming-attack-alert', handleIncomingAttack);
      window.removeEventListener('spy-alert-advanced', handleSpyAlert);
      window.removeEventListener('sabotage-alert-advanced', handleSabotageAlert);
      window.removeEventListener('alliance-invite', handleAllianceInvite);
    };
  }, []);
}
