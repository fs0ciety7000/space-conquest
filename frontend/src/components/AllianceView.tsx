import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from './ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { toast } from 'sonner';
import { apiUrl } from '@/config/api';
import { 
  Shield, Crown, Users, Star, Plus, Search, UserPlus, 
  LogOut, Settings, Trash2, UserMinus, ChevronUp, ChevronDown,
  Mail, Clock, Check, X, RefreshCw, Award, Swords
} from 'lucide-react';

interface AllianceViewProps {
  userId: string;
  token: string;
  onOpenMessage?: (username: string) => void;
}

interface Alliance {
  id: string;
  name: string;
  tag: string;
  description?: string;
  internal_message?: string;
  leader_id: string;
  leader_name: string;
  member_count: number;
  total_score: number;
  recruitment_policy: string;
  min_level_required: number;
  members?: Member[];
  created_at: string;
  is_member?: boolean;
  user_role?: string;
}

interface Member {
  user_id: string;
  username: string;
  role: string;
  score: number;
  joined_at: string;
  last_active: string;
}

interface Invitation {
  id: string;
  alliance_id: string;
  alliance_name: string;
  alliance_tag: string;
  user_id: string;
  username: string;
  invitation_type: string;
  status: string;
  message?: string;
  created_at: string;
}

interface MyAllianceInfo {
  has_alliance: boolean;
  alliance_id?: string;
  alliance_name?: string;
  alliance_tag?: string;
  user_role?: string;
}

type ViewMode = 'list' | 'detail' | 'create' | 'manage';

export function AllianceView({ userId, token, onOpenMessage }: AllianceViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [myAlliance, setMyAlliance] = useState<MyAllianceInfo | null>(null);
  const [alliances, setAlliances] = useState<Alliance[]>([]);
  const [selectedAlliance, setSelectedAlliance] = useState<Alliance | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [applications, setApplications] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showConfirmLeave, setShowConfirmLeave] = useState(false);
  const [showConfirmDissolve, setShowConfirmDissolve] = useState(false);
  
  // Form states
  const [createForm, setCreateForm] = useState({ name: '', tag: '', description: '' });
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [applyMessage, setApplyMessage] = useState('');
  const [settingsForm, setSettingsForm] = useState({
    description: '',
    internal_message: '',
    recruitment_policy: 'invite_only',
    min_level_required: 0
  });

  // Fetch functions
  const fetchMyAlliance = useCallback(async () => {
    try {
      const res = await fetch(apiUrl(`/alliances/my?user_id=${userId}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setMyAlliance(data);
      
      if (data.has_alliance && data.alliance_id) {
        fetchAllianceDetails(data.alliance_id);
        setViewMode('detail');
      }
    } catch (e) {
      console.error('Error fetching my alliance:', e);
    }
  }, [userId, token]);

  const fetchAlliances = useCallback(async () => {
    try {
      const searchParam = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : '';
      const res = await fetch(apiUrl(`/alliances?user_id=${userId}${searchParam}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setAlliances(data.alliances || []);
    } catch (e) {
      console.error('Error fetching alliances:', e);
    }
  }, [userId, token, searchTerm]);

  const fetchAllianceDetails = useCallback(async (allianceId: string) => {
    try {
      const res = await fetch(apiUrl(`/alliances/${allianceId}?user_id=${userId}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setSelectedAlliance(data);
    } catch (e) {
      console.error('Error fetching alliance details:', e);
    }
  }, [userId, token]);

  const fetchInvitations = useCallback(async () => {
    try {
      const res = await fetch(apiUrl(`/alliances/invitations?user_id=${userId}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setInvitations(data.filter((i: Invitation) => i.invitation_type === 'invitation'));
    } catch (e) {
      console.error('Error fetching invitations:', e);
    }
  }, [userId, token]);

  const fetchApplications = useCallback(async (allianceId: string) => {
    try {
      const res = await fetch(apiUrl(`/alliances/${allianceId}/applications?user_id=${userId}`), {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setApplications(data);
    } catch (e) {
      console.error('Error fetching applications:', e);
    }
  }, [userId, token]);

  // Initial load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchMyAlliance();
      await fetchAlliances();
      await fetchInvitations();
      setLoading(false);
    };
    load();
  }, [fetchMyAlliance, fetchAlliances, fetchInvitations]);

  // Refresh alliance details when viewing own alliance
  useEffect(() => {
    if (selectedAlliance?.is_member && (myAlliance?.user_role === 'leader' || myAlliance?.user_role === 'officer')) {
      fetchApplications(selectedAlliance.id);
    }
  }, [selectedAlliance, myAlliance, fetchApplications]);

  // Actions
  const handleCreateAlliance = async () => {
    if (!createForm.name || !createForm.tag) {
      toast.error('Nom et tag requis');
      return;
    }

    try {
      const res = await fetch(apiUrl(`/alliances?user_id=${userId}`), {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(createForm)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success('Alliance créée !', { description: data.message });
        setShowCreateModal(false);
        setCreateForm({ name: '', tag: '', description: '' });
        fetchMyAlliance();
        fetchAlliances();
      } else {
        toast.error(data.error || 'Erreur création');
      }
    } catch (e) {
      toast.error('Erreur réseau');
    }
  };

  const handleApplyToAlliance = async (allianceId: string) => {
    try {
      const res = await fetch(apiUrl(`/alliances/apply?user_id=${userId}`), {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ alliance_id: allianceId, message: applyMessage || null })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message || 'Candidature envoyée !');
        setShowApplyModal(false);
        setApplyMessage('');
        if (data.alliance_id) {
          fetchMyAlliance();
        }
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch (e) {
      toast.error('Erreur réseau');
    }
  };

  const handleRespondToInvitation = async (invitationId: string, accept: boolean) => {
    try {
      const res = await fetch(apiUrl(`/alliances/invitations/${invitationId}/respond?user_id=${userId}`), {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accept })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message);
        fetchInvitations();
        if (accept) {
          fetchMyAlliance();
        }
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch (e) {
      toast.error('Erreur réseau');
    }
  };

  const handleInvitePlayer = async () => {
    if (!inviteUsername || !selectedAlliance) return;
    
    try {
      const res = await fetch(apiUrl(`/alliances/${selectedAlliance.id}/invite?user_id=${userId}`), {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: inviteUsername, message: inviteMessage || null })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message || 'Invitation envoyée !');
        setShowInviteModal(false);
        setInviteUsername('');
        setInviteMessage('');
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch (e) {
      toast.error('Erreur réseau');
    }
  };

  const handleLeaveAlliance = async () => {
    if (!selectedAlliance) return;
    
    try {
      const res = await fetch(apiUrl(`/alliances/${selectedAlliance.id}/leave?user_id=${userId}`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message);
        setShowConfirmLeave(false);
        setSelectedAlliance(null);
        setMyAlliance({ has_alliance: false });
        setViewMode('list');
        fetchAlliances();
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch (e) {
      toast.error('Erreur réseau');
    }
  };

  const handleDissolveAlliance = async () => {
    if (!selectedAlliance) return;
    
    try {
      const res = await fetch(apiUrl(`/alliances/${selectedAlliance.id}?user_id=${userId}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message || 'Alliance dissoute');
        setShowConfirmDissolve(false);
        setSelectedAlliance(null);
        setMyAlliance({ has_alliance: false });
        setViewMode('list');
        fetchAlliances();
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch (e) {
      toast.error('Erreur réseau');
    }
  };

  const handleKickMember = async (targetUserId: string) => {
    if (!selectedAlliance) return;
    
    try {
      const res = await fetch(apiUrl(`/alliances/${selectedAlliance.id}/kick/${targetUserId}?user_id=${userId}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message || 'Membre expulsé');
        fetchAllianceDetails(selectedAlliance.id);
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch (e) {
      toast.error('Erreur réseau');
    }
  };

  const handleChangeRole = async (targetUserId: string, newRole: string) => {
    if (!selectedAlliance) return;
    
    try {
      const res = await fetch(apiUrl(`/alliances/${selectedAlliance.id}/role/${targetUserId}?user_id=${userId}`), {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message);
        fetchAllianceDetails(selectedAlliance.id);
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch (e) {
      toast.error('Erreur réseau');
    }
  };

  const handleTransferLeadership = async (targetUserId: string) => {
    if (!selectedAlliance) return;
    
    try {
      const res = await fetch(apiUrl(`/alliances/${selectedAlliance.id}/transfer/${targetUserId}?user_id=${userId}`), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message);
        fetchMyAlliance();
        fetchAllianceDetails(selectedAlliance.id);
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch (e) {
      toast.error('Erreur réseau');
    }
  };

  const handleUpdateSettings = async () => {
    if (!selectedAlliance) return;
    
    try {
      const res = await fetch(apiUrl(`/alliances/${selectedAlliance.id}?user_id=${userId}`), {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settingsForm)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        toast.success(data.message || 'Paramètres mis à jour');
        setShowSettingsModal(false);
        fetchAllianceDetails(selectedAlliance.id);
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch (e) {
      toast.error('Erreur réseau');
    }
  };

  // Helpers
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'leader':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50"><Crown size={10} className="mr-1" /> Leader</Badge>;
      case 'officer':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50"><Shield size={10} className="mr-1" /> Officier</Badge>;
      default:
        return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/50"><Users size={10} className="mr-1" /> Membre</Badge>;
    }
  };

  const getRecruitmentBadge = (policy: string) => {
    switch (policy) {
      case 'open':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Ouvert</Badge>;
      case 'invite_only':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">Sur invitation</Badge>;
      case 'closed':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/50">Fermé</Badge>;
      default:
        return null;
    }
  };

  const formatScore = (score: number) => {
    if (score >= 1000000) return `${(score / 1000000).toFixed(1)}M`;
    if (score >= 1000) return `${(score / 1000).toFixed(1)}K`;
    return score.toString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">ALLIANCES</h2>
            <p className="text-xs text-slate-400 font-mono">
              {myAlliance?.has_alliance 
                ? `[${myAlliance.alliance_tag}] ${myAlliance.alliance_name}`
                : 'Rejoignez ou créez une alliance'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {!myAlliance?.has_alliance && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
            >
              <Plus size={16} className="mr-2" /> Créer
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => { 
              fetchAlliances(); 
              fetchInvitations(); 
              if (myAlliance?.has_alliance && myAlliance.alliance_id) {
                fetchAllianceDetails(myAlliance.alliance_id);
              }
            }}
            className="border-white/10"
          >
            <RefreshCw size={16} />
          </Button>
        </div>
      </div>

      {/* Invitations reçues */}
      {invitations.length > 0 && !myAlliance?.has_alliance && (
        <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-yellow-400">
              <Mail size={16} /> Invitations reçues ({invitations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invitations.map(inv => (
              <div key={inv.id} className="flex items-center justify-between bg-black/30 rounded-lg p-3">
                <div>
                  <span className="font-bold text-white">[{inv.alliance_tag}] {inv.alliance_name}</span>
                  {inv.message && <p className="text-xs text-slate-400 mt-1">{inv.message}</p>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleRespondToInvitation(inv.id, true)} className="bg-green-500/20 hover:bg-green-500/30 text-green-400">
                    <Check size={14} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleRespondToInvitation(inv.id, false)} className="text-red-400 hover:bg-red-500/20">
                    <X size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Navigation tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-2">
        <Button
          variant={viewMode === 'list' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('list')}
          className={viewMode === 'list' ? 'bg-indigo-500/20 text-indigo-400' : ''}
        >
          <Search size={14} className="mr-2" /> Rechercher
        </Button>
        {myAlliance?.has_alliance && (
          <Button
            variant={viewMode === 'detail' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setViewMode('detail');
              if (myAlliance.alliance_id) fetchAllianceDetails(myAlliance.alliance_id);
            }}
            className={viewMode === 'detail' ? 'bg-indigo-500/20 text-indigo-400' : ''}
          >
            <Shield size={14} className="mr-2" /> Mon Alliance
          </Button>
        )}
      </div>

      {/* Liste des alliances */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {/* Recherche */}
          <div className="flex gap-2">
            <Input
              placeholder="Rechercher par nom ou tag..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-slate-900/50 border-white/10"
            />
            <Button onClick={fetchAlliances} className="bg-indigo-500/20 hover:bg-indigo-500/30">
              <Search size={16} />
            </Button>
          </div>

          {/* Liste */}
          <div className="grid gap-3">
            {alliances.map(alliance => (
              <Card 
                key={alliance.id} 
                className="bg-slate-900/50 border-white/10 hover:border-indigo-500/50 transition-all cursor-pointer"
                onClick={() => {
                  fetchAllianceDetails(alliance.id);
                  setViewMode('detail');
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/30">
                        <span className="text-xs font-black text-indigo-400">{alliance.tag}</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{alliance.name}</h3>
                        <p className="text-xs text-slate-400">
                          <Crown size={10} className="inline mr-1" /> {alliance.leader_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <p className="text-lg font-black text-indigo-400">{formatScore(alliance.total_score)}</p>
                        <p className="text-[10px] text-slate-500 uppercase">Score</p>
                      </div>
                      <div>
                        <p className="text-lg font-black text-white">{alliance.member_count}</p>
                        <p className="text-[10px] text-slate-500 uppercase">Membres</p>
                      </div>
                      {getRecruitmentBadge(alliance.recruitment_policy)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {alliances.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <Shield size={48} className="mx-auto mb-4 opacity-30" />
                <p>Aucune alliance trouvée</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Détail d'une alliance */}
      {viewMode === 'detail' && selectedAlliance && (
        <div className="space-y-6">
          {/* Header de l'alliance */}
          <Card className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/30">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                    <span className="text-xl font-black text-white">{selectedAlliance.tag}</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white">{selectedAlliance.name}</h2>
                    <p className="text-sm text-slate-400 flex items-center gap-2">
                      <Crown size={14} className="text-yellow-400" /> {selectedAlliance.leader_name}
                      <span className="text-slate-600">•</span>
                      <Users size={14} /> {selectedAlliance.member_count} membres
                    </p>
                    {selectedAlliance.is_member && selectedAlliance.user_role && (
                      <div className="mt-2">{getRoleBadge(selectedAlliance.user_role)}</div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                    {formatScore(selectedAlliance.total_score)}
                  </p>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Score total</p>
                  <div className="mt-2">{getRecruitmentBadge(selectedAlliance.recruitment_policy)}</div>
                </div>
              </div>
              
              {selectedAlliance.description && (
                <p className="mt-4 text-sm text-slate-300 border-t border-white/10 pt-4">
                  {selectedAlliance.description}
                </p>
              )}
              
              {selectedAlliance.is_member && selectedAlliance.internal_message && (
                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-xs text-yellow-400 font-bold mb-1">📢 Message interne</p>
                  <p className="text-sm text-yellow-200">{selectedAlliance.internal_message}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {!selectedAlliance.is_member && !myAlliance?.has_alliance && (
              <Button
                onClick={() => {
                  if (selectedAlliance.recruitment_policy === 'open') {
                    handleApplyToAlliance(selectedAlliance.id);
                  } else if (selectedAlliance.recruitment_policy === 'invite_only') {
                    setShowApplyModal(true);
                  }
                }}
                disabled={selectedAlliance.recruitment_policy === 'closed'}
                className="bg-gradient-to-r from-green-500 to-emerald-600"
              >
                <UserPlus size={16} className="mr-2" />
                {selectedAlliance.recruitment_policy === 'open' ? 'Rejoindre' : 'Postuler'}
              </Button>
            )}
            
            {selectedAlliance.is_member && (
              <>
                {(selectedAlliance.user_role === 'leader' || selectedAlliance.user_role === 'officer') && (
                  <>
                    <Button onClick={() => setShowInviteModal(true)} variant="outline" className="border-indigo-500/30 text-indigo-400">
                      <UserPlus size={16} className="mr-2" /> Inviter
                    </Button>
                    <Button onClick={() => {
                      setSettingsForm({
                        description: selectedAlliance.description || '',
                        internal_message: selectedAlliance.internal_message || '',
                        recruitment_policy: selectedAlliance.recruitment_policy,
                        min_level_required: selectedAlliance.min_level_required
                      });
                      setShowSettingsModal(true);
                    }} variant="outline" className="border-white/10">
                      <Settings size={16} className="mr-2" /> Paramètres
                    </Button>
                  </>
                )}
                
                {selectedAlliance.user_role === 'leader' ? (
                  <Button onClick={() => setShowConfirmDissolve(true)} variant="outline" className="border-red-500/30 text-red-400">
                    <Trash2 size={16} className="mr-2" /> Dissoudre
                  </Button>
                ) : (
                  <Button onClick={() => setShowConfirmLeave(true)} variant="outline" className="border-red-500/30 text-red-400">
                    <LogOut size={16} className="mr-2" /> Quitter
                  </Button>
                )}
              </>
            )}
            
            <Button variant="ghost" onClick={() => setViewMode('list')} className="ml-auto">
              Retour à la liste
            </Button>
          </div>

          {/* Candidatures (pour leader/officier) */}
          {selectedAlliance.is_member && 
           (selectedAlliance.user_role === 'leader' || selectedAlliance.user_role === 'officer') &&
           applications.length > 0 && (
            <Card className="bg-yellow-500/5 border-yellow-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-yellow-400">
                  <Mail size={16} /> Candidatures en attente ({applications.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {applications.filter(a => a.invitation_type === 'application').map(app => (
                  <div key={app.id} className="flex items-center justify-between bg-black/30 rounded-lg p-3">
                    <div>
                      <span className="font-bold text-white">{app.username}</span>
                      {app.message && <p className="text-xs text-slate-400 mt-1">"{app.message}"</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleRespondToInvitation(app.id, true)} className="bg-green-500/20 hover:bg-green-500/30 text-green-400">
                        <Check size={14} className="mr-1" /> Accepter
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleRespondToInvitation(app.id, false)} className="text-red-400 hover:bg-red-500/20">
                        <X size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Liste des membres */}
          <Card className="bg-slate-900/50 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users size={18} /> Membres ({selectedAlliance.members?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {selectedAlliance.members?.map(member => (
                  <div key={member.user_id} className="flex items-center justify-between bg-black/30 rounded-lg p-3 hover:bg-black/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center">
                        {member.role === 'leader' ? <Crown size={14} className="text-yellow-400" /> :
                         member.role === 'officer' ? <Shield size={14} className="text-blue-400" /> :
                         <Users size={14} className="text-slate-400" />}
                      </div>
                      <div>
                        <p className="font-bold text-white flex items-center gap-2">
                          {member.username}
                          {getRoleBadge(member.role)}
                        </p>
                        <p className="text-xs text-slate-500">
                          Score: {formatScore(member.score)} • Membre depuis {new Date(member.joined_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {onOpenMessage && member.user_id !== userId && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onOpenMessage(member.username); }}>
                                <Mail size={14} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Envoyer un message</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      
                      {/* Actions pour leader */}
                      {selectedAlliance.user_role === 'leader' && member.user_id !== userId && (
                        <>
                          {member.role === 'member' && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="ghost" onClick={() => handleChangeRole(member.user_id, 'officer')} className="text-blue-400">
                                    <ChevronUp size={14} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Promouvoir officier</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {member.role === 'officer' && (
                            <>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="sm" variant="ghost" onClick={() => handleChangeRole(member.user_id, 'member')} className="text-slate-400">
                                      <ChevronDown size={14} />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Rétrograder membre</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="sm" variant="ghost" onClick={() => handleTransferLeadership(member.user_id)} className="text-yellow-400">
                                      <Crown size={14} />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Transférer leadership</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </>
                          )}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="ghost" onClick={() => handleKickMember(member.user_id)} className="text-red-400">
                                  <UserMinus size={14} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Expulser</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </>
                      )}
                      
                      {/* Actions pour officier */}
                      {selectedAlliance.user_role === 'officer' && member.role === 'member' && member.user_id !== userId && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="ghost" onClick={() => handleKickMember(member.user_id)} className="text-red-400">
                                <UserMinus size={14} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Expulser</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: Créer une alliance */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus size={20} /> Créer une alliance
            </DialogTitle>
            <DialogDescription>
              Fondez votre propre alliance et recrutez des membres
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 uppercase">Nom de l'alliance (3-20 caractères)</label>
              <Input
                value={createForm.name}
                onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Empire Galactique"
                className="mt-1 bg-black/30 border-white/10"
                maxLength={20}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase">Tag (2-5 caractères)</label>
              <Input
                value={createForm.tag}
                onChange={e => setCreateForm(f => ({ ...f, tag: e.target.value.toUpperCase() }))}
                placeholder="EG"
                className="mt-1 bg-black/30 border-white/10"
                maxLength={5}
              />
              <p className="text-xs text-slate-500 mt-1">Affiché comme [{createForm.tag || 'TAG'}]</p>
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase">Description (optionnel)</label>
              <Textarea
                value={createForm.description}
                onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Notre alliance conquiert la galaxie..."
                className="mt-1 bg-black/30 border-white/10"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Annuler</Button>
            <Button onClick={handleCreateAlliance} className="bg-gradient-to-r from-indigo-500 to-purple-600">
              Créer l'alliance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Inviter un joueur */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus size={20} /> Inviter un joueur
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 uppercase">Nom du joueur</label>
              <Input
                value={inviteUsername}
                onChange={e => setInviteUsername(e.target.value)}
                placeholder="Pseudo exact du joueur"
                className="mt-1 bg-black/30 border-white/10"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase">Message (optionnel)</label>
              <Textarea
                value={inviteMessage}
                onChange={e => setInviteMessage(e.target.value)}
                placeholder="Nous serions honorés de vous compter parmi nous..."
                className="mt-1 bg-black/30 border-white/10"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowInviteModal(false)}>Annuler</Button>
            <Button onClick={handleInvitePlayer} className="bg-gradient-to-r from-green-500 to-emerald-600">
              Envoyer l'invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Postuler */}
      <Dialog open={showApplyModal} onOpenChange={setShowApplyModal}>
        <DialogContent className="bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus size={20} /> Postuler à [{selectedAlliance?.tag}] {selectedAlliance?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 uppercase">Message de motivation (optionnel)</label>
              <Textarea
                value={applyMessage}
                onChange={e => setApplyMessage(e.target.value)}
                placeholder="Présentez-vous et expliquez pourquoi vous souhaitez rejoindre..."
                className="mt-1 bg-black/30 border-white/10"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowApplyModal(false)}>Annuler</Button>
            <Button onClick={() => selectedAlliance && handleApplyToAlliance(selectedAlliance.id)} className="bg-gradient-to-r from-green-500 to-emerald-600">
              Envoyer ma candidature
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Paramètres */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="bg-slate-900 border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings size={20} /> Paramètres de l'alliance
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 uppercase">Description</label>
              <Textarea
                value={settingsForm.description}
                onChange={e => setSettingsForm(f => ({ ...f, description: e.target.value }))}
                className="mt-1 bg-black/30 border-white/10"
                rows={3}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase">Message interne (visible par les membres)</label>
              <Textarea
                value={settingsForm.internal_message}
                onChange={e => setSettingsForm(f => ({ ...f, internal_message: e.target.value }))}
                className="mt-1 bg-black/30 border-white/10"
                rows={3}
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 uppercase">Politique de recrutement</label>
              <select
                value={settingsForm.recruitment_policy}
                onChange={e => setSettingsForm(f => ({ ...f, recruitment_policy: e.target.value }))}
                className="mt-1 w-full bg-black/30 border border-white/10 rounded-md p-2 text-white"
              >
                <option value="open">Ouvert (tout le monde peut rejoindre)</option>
                <option value="invite_only">Sur invitation/candidature</option>
                <option value="closed">Fermé (pas de nouveau membre)</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowSettingsModal(false)}>Annuler</Button>
            <Button onClick={handleUpdateSettings} className="bg-gradient-to-r from-indigo-500 to-purple-600">
              Sauvegarder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Confirmer quitter */}
      <Dialog open={showConfirmLeave} onOpenChange={setShowConfirmLeave}>
        <DialogContent className="bg-slate-900 border-red-500/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <LogOut size={20} /> Quitter l'alliance ?
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir quitter [{selectedAlliance?.tag}] {selectedAlliance?.name} ?
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowConfirmLeave(false)}>Annuler</Button>
            <Button onClick={handleLeaveAlliance} className="bg-red-500 hover:bg-red-600">
              Quitter l'alliance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Confirmer dissolution */}
      <Dialog open={showConfirmDissolve} onOpenChange={setShowConfirmDissolve}>
        <DialogContent className="bg-slate-900 border-red-500/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 size={20} /> Dissoudre l'alliance ?
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir DISSOUDRE [{selectedAlliance?.tag}] {selectedAlliance?.name} ?
              <br /><br />
              <strong className="text-red-400">ATTENTION:</strong> Tous les membres seront expulsés et l'alliance sera définitivement supprimée. Cette action est IRRÉVERSIBLE.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowConfirmDissolve(false)}>Annuler</Button>
            <Button onClick={handleDissolveAlliance} className="bg-red-500 hover:bg-red-600">
              Dissoudre définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AllianceView;
