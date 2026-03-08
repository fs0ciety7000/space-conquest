import { useState, useEffect } from 'react';
import { Target, ArrowRight, X, Rocket, Shield, Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SpaceBackground } from '@/components/ui/space-background';

interface TourStep {
    targetId?: string; // S'il y a un data-tour="id" on peut s'y accrocher, sinon affichage full screen
    title: string;
    content: string;
    icon: any;
    position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const TOUR_STEPS: TourStep[] = [
    {
        title: "BIENVENUE COMMANDANT",
        content: "Vous avez été choisi pour diriger cette colonie. Voici un aperçu rapide des systèmes cruciaux pour votre survie.",
        icon: Rocket,
        position: 'center'
    },
    {
        targetId: "empire-bar",
        title: "RESSOURCES & NOTIFICATIONS",
        content: "En haut, vous trouverez vos ressources primaires (Métal, Cristal, Deuterium, Energie) et le Centre de Notification (GNN). Gardez un oeil vigilant sur votre énergie !",
        icon: Target,
        position: 'bottom'
    },
    {
        targetId: "sidebar-menu",
        title: "PUPITRE DE COMMANDE",
        content: "Naviguez entre la vue Galaxie, vos bâtiments, et le chantier spatial. (Astuce : Utilisez les raccourcis clavier comme H, G, F, S ! Appuyez sur ? pour l'aide).",
        icon: Crosshair,
        position: 'right'
    },
    {
        title: "PRENEZ LES COMMANDES",
        content: "Votre première mission prioritaire est de construire une Mine de Métal et une Centrale Solaire ! Bonne chance amiral.",
        icon: Shield,
        position: 'center'
    }
];

export default function OnboardingTour() {
    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        // Vérifier si c'est la première connexion
        const hasSeenTour = localStorage.getItem('has_seen_onboarding_tour');
        if (!hasSeenTour) {
            setIsVisible(true);
        }
    }, []);

    useEffect(() => {
        if (!isVisible) return;

        const updateTargetRect = () => {
            const step = TOUR_STEPS[currentStep];
            if (step.targetId) {
                const el = document.querySelector(`[data-tour="${step.targetId}"]`);
                if (el) {
                    setTargetRect(el.getBoundingClientRect());
                } else {
                    setTargetRect(null);
                }
            } else {
                setTargetRect(null);
            }
        };

        updateTargetRect();
        window.addEventListener('resize', updateTargetRect);
        return () => window.removeEventListener('resize', updateTargetRect);
    }, [currentStep, isVisible]);

    const handleNext = () => {
        if (currentStep < TOUR_STEPS.length - 1) {
            setCurrentStep(c => c + 1);
        } else {
            handleClose();
        }
    };

    const handleClose = () => {
        setIsVisible(false);
        localStorage.setItem('has_seen_onboarding_tour', 'true');
    };

    if (!isVisible) return null;

    const step = TOUR_STEPS[currentStep];
    const Icon = step.icon;
    const isCenter = step.position === 'center';

    let popupStyle = {};
    if (targetRect && !isCenter) {
        if (step.position === 'bottom') {
            popupStyle = { top: targetRect.bottom + 20, left: targetRect.left + (targetRect.width / 2), transform: 'translateX(-50%)' };
        } else if (step.position === 'right') {
            popupStyle = { top: targetRect.top + (targetRect.height / 2), left: targetRect.right + 20, transform: 'translateY(-50%)' };
        }
    }

    return (
        <div className="fixed inset-0 z-[10000] pointer-events-none">
            {/* Backdrop assombri avec trou (highlight) si cible */}
            {isCenter ? (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md pointer-events-auto flex items-center justify-center animate-fade-in">
                    <SpaceBackground showStars showNebulae showParticles={false} starCount={30} />
                    <div className="relative bg-slate-900 border border-indigo-500/30 p-8 rounded-2xl max-w-lg w-full shadow-[0_0_50px_rgba(99,102,241,0.2)] text-center animate-slide-up">
                        <div className="mx-auto w-16 h-16 bg-indigo-600/20 text-indigo-400 rounded-full flex items-center justify-center mb-6 border border-indigo-500/50 shadow-inner">
                            <Icon size={32} />
                        </div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-widest mb-4">{step.title}</h2>
                        <p className="text-slate-400 text-sm leading-relaxed mb-8">{step.content}</p>
                        
                        <Button onClick={handleNext} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-12 text-lg">
                            {currentStep === TOUR_STEPS.length - 1 ? "DÉMARRER" : "SUIVANT"} <ArrowRight className="ml-2" />
                        </Button>
                        <button onClick={handleClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="absolute inset-0 pointer-events-auto">
                    {/* Dark overlay logic */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-all duration-500">
                         {targetRect && (
                            <div 
                                className="absolute bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] rounded-xl transition-all duration-500 pointer-events-none border-2 border-indigo-500 animate-pulse"
                                style={{
                                    top: targetRect.top - 10,
                                    left: targetRect.left - 10,
                                    width: targetRect.width + 20,
                                    height: targetRect.height + 20,
                                }}
                            />
                         )}
                    </div>
                    
                    {/* The popup */}
                    <div 
                        className="absolute bg-slate-900 border border-indigo-500 p-6 rounded-xl w-80 shadow-2xl transition-all duration-500 animate-slide-up"
                        style={isCenter ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' } : popupStyle}
                    >
                         <h3 className="font-black text-indigo-400 uppercase tracking-widest text-sm mb-2">{step.title}</h3>
                         <p className="text-slate-300 text-xs leading-relaxed mb-6">{step.content}</p>
                         <div className="flex justify-between items-center">
                            <span className="text-[10px] text-slate-500 font-mono">Etape {currentStep + 1}/{TOUR_STEPS.length}</span>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={handleClose} className="text-xs text-slate-400 hover:text-white">Passer</Button>
                                <Button size="sm" onClick={handleNext} className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold">
                                    Suivant <ArrowRight size={14} className="ml-1" />
                                </Button>
                            </div>
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
}
