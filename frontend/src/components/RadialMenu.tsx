import { useState, useRef, useEffect } from 'react';
import { Eye, Crosshair, Truck, Rocket, X } from 'lucide-react';

interface RadialMenuItem {
    id: string;
    label: string;
    icon: React.ElementType;
    color: string;
    onClick: () => void;
    disabled?: boolean;
}

interface RadialMenuProps {
    items: RadialMenuItem[];
    onClose: () => void;
    position: { x: number, y: number };
}

export default function RadialMenu({ items, onClose, position }: RadialMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Petite animation de montage
        const timer = setTimeout(() => setIsOpen(true), 10);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        // Fermer si clic en dehors
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        // Fermer avec Echap
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    const radius = 60; // Distance des boutons par rapport au centre
    const totalItems = items.length;
    
    // Assurer que le menu ne sort pas de l'écran (simple offset)
    const safePosition = {
        x: Math.max(radius + 20, Math.min(window.innerWidth - radius - 20, position.x)),
        y: Math.max(radius + 20, Math.min(window.innerHeight - radius - 20, position.y))
    };

    return (
        <div className="fixed inset-0 z-[100] pointer-events-none">
            {/* Sombre pour focus, clic pour fermer */}
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] pointer-events-auto transition-opacity duration-300" onClick={onClose} />
            
            <div 
                ref={menuRef}
                className="absolute pointer-events-auto"
                style={{ 
                    top: safePosition.y, 
                    left: safePosition.x,
                    transform: 'translate(-50%, -50%)' 
                }}
            >
                {/* Bouton Central (Fermer) */}
                <button
                    onClick={onClose}
                    className={`relative z-10 w-12 h-12 rounded-full bg-slate-900 border border-slate-700 shadow-[0_0_20px_rgba(0,0,0,0.8)] text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-300 flex items-center justify-center transform ${isOpen ? 'scale-100 rotate-0' : 'scale-0 -rotate-90'}`}
                >
                    <X size={20} />
                </button>

                {/* Items radiaux */}
                {items.map((item, index) => {
                    // Distribuer les boutons en cercle (commence en haut, tourne)
                    // Si 3 items: -90, 30, 150 degrés (ou équivalent en radians)
                    const angleOffset = -Math.PI / 2; // Commence en haut (12h)
                    const angle = angleOffset + (index * (2 * Math.PI)) / totalItems;
                    
                    const itemX = isOpen ? Math.cos(angle) * radius : 0;
                    const itemY = isOpen ? Math.sin(angle) * radius : 0;

                    return (
                        <button
                            key={item.id}
                            disabled={item.disabled}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!item.disabled) {
                                    item.onClick();
                                    onClose();
                                }
                            }}
                            className={`absolute w-10 h-10 rounded-full flex items-center justify-center border shadow-lg transition-all duration-300 group
                                ${item.disabled 
                                    ? 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed' 
                                    : `bg-slate-900 hover:scale-110 hover:shadow-[0_0_15px_${item.color}] ${item.color} border-slate-700 hover:border-current`
                                }
                            `}
                            style={{
                                top: '50%',
                                left: '50%',
                                transform: `translate(calc(-50% + ${itemX}px), calc(-50% + ${itemY}px)) scale(${isOpen ? 1 : 0})`,
                                transitionDelay: `${index * 50}ms`,
                                // Fallback colors handled via Tailwind arbitrary class parsing if matched, 
                                // otherwise we rely on text-[color] for icon and border
                            }}
                            title={item.label}
                        >
                            <item.icon size={18} className={item.disabled ? 'text-slate-600' : ''} />
                            
                            {/* Tooltip on hover */}
                            {!item.disabled && (
                                <span className="absolute -bottom-6 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 text-[10px] text-white px-2 py-1 rounded font-bold whitespace-nowrap pointer-events-none">
                                    {item.label}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
