import React, { useState, useEffect } from 'react';

interface MaintenanceMessage {
  title: string;
  description: string[];
  estimatedDuration: string;
  startTime: string;
  status: 'scheduled' | 'in_progress' | 'completed';
}

interface MaintenancePageProps {
  message?: MaintenanceMessage;
}

const MaintenancePage: React.FC<MaintenancePageProps> = ({ message }) => {
  const [dots, setDots] = useState('');
  const [lines, setLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);

  const defaultMessage: MaintenanceMessage = {
    title: 'MAINTENANCE PROGRAMMÉE',
    description: [
      '> Initialisation du système de mise à jour...',
      '> Nouveau système de tech tree',
      '> 15+ technologies avancées',
      '> 12+ types de vaisseaux',
      '> Système de planète mère',
      '> Optimisations de performance',
      '',
      '> Vos comptes et ressources seront préservés.',
      '> Merci de votre patience !',
    ],
    estimatedDuration: '15-30 minutes',
    startTime: new Date().toLocaleTimeString('fr-FR'),
    status: 'in_progress'
  };

  const maintenanceData = message || defaultMessage;

  // Animation des points
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Animation d'apparition ligne par ligne
  useEffect(() => {
    if (currentLineIndex < maintenanceData.description.length) {
      const timeout = setTimeout(() => {
        setLines(prev => [...prev, maintenanceData.description[currentLineIndex]]);
        setCurrentLineIndex(prev => prev + 1);
      }, 300);
      return () => clearTimeout(timeout);
    }
  }, [currentLineIndex, maintenanceData.description]);

  // Effet Matrix en arrière-plan
  useEffect(() => {
    const canvas = document.getElementById('matrix-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const matrix = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+-=[]{}|;:,.<>?";
    const fontSize = 16;
    const columns = canvas.width / fontSize;
    const drops: number[] = [];

    for (let i = 0; i < columns; i++) {
      drops[i] = 1;
    }

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#0F0';
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = matrix[Math.floor(Math.random() * matrix.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Matrix background */}
      <canvas
        id="matrix-canvas"
        className="absolute inset-0 opacity-20"
      />

      {/* Scanline effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="scanline" />
      </div>

      {/* Main content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="max-w-4xl w-full">
          {/* Terminal window */}
          <div className="bg-black/90 border-2 border-green-500 rounded-lg shadow-2xl shadow-green-500/50 overflow-hidden">
            {/* Terminal header */}
            <div className="bg-green-900/30 border-b border-green-500 px-4 py-2 flex items-center gap-2">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              </div>
              <span className="text-green-400 font-mono text-sm ml-4">
                root@space-conquest:~$
              </span>
            </div>

            {/* Terminal content */}
            <div className="p-8 font-mono text-green-400 space-y-6">
              {/* Title with glitch effect */}
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-green-300 mb-2 glitch-text">
                  {maintenanceData.title}
                </h1>
                <div className="flex items-center justify-center gap-2 text-yellow-400">
                  <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                  <span className="text-sm">
                    {maintenanceData.status === 'in_progress' ? 'EN COURS' :
                     maintenanceData.status === 'scheduled' ? 'PLANIFIÉ' : 'TERMINÉ'}
                  </span>
                </div>
              </div>

              {/* ASCII Art */}
              <pre className="text-green-500 text-xs leading-tight text-center mb-6 opacity-60">
{`    ____                        ______                                __
   / __/___  ____ _________     / ____/___  ____  ____ ___  _____  _____/ /_
  / /_/ __ \\/ __ \`/ ___/ _ \\   / /   / __ \\/ __ \\/ __ \`/ / / / _ \\/ ___/ __/
 _\\ \\/ /_/ / /_/ / /__/  __/  / /___/ /_/ / / / / /_/ / /_/ /  __(__  ) /_
/___/ .___/\\__,_/\\___/\\___/   \\____/\\____/_/ /_/\\__, /\\__,_/\\___/____/\\__/
   /_/                                         /____/`}
              </pre>

              {/* Info box */}
              <div className="bg-green-950/50 border border-green-700 rounded p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-green-300">Durée estimée:</span>
                  <span className="text-yellow-300 font-bold">{maintenanceData.estimatedDuration}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-300">Début:</span>
                  <span className="text-yellow-300 font-bold">{maintenanceData.startTime}</span>
                </div>
              </div>

              {/* Messages with typewriter effect */}
              <div className="space-y-1 min-h-[200px]">
                {lines.map((line, index) => (
                  <div
                    key={index}
                    className={`transition-opacity duration-300 ${
                      line.startsWith('>') ? 'text-green-400' : 'text-green-300'
                    }`}
                  >
                    {line || '\u00A0'}
                  </div>
                ))}
                {currentLineIndex < maintenanceData.description.length && (
                  <div className="text-green-400">
                    <span className="animate-pulse">▊</span>
                  </div>
                )}
              </div>

              {/* Loading animation */}
              <div className="flex items-center justify-center gap-2 pt-6">
                <div className="text-green-400">
                  [{'='.repeat(dots.length)}{'·'.repeat(3 - dots.length)}]
                </div>
                <span className="text-green-300">Traitement{dots}</span>
              </div>

              {/* Status bar */}
              <div className="border-t border-green-700 pt-4 mt-6">
                <div className="flex justify-between text-xs text-green-600">
                  <span>System: OPERATIONAL</span>
                  <span>Security: LEVEL 5</span>
                  <span>Uptime: CALCULATING...</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6 text-green-600 text-sm font-mono">
            <p>Système de maintenance autonome v2.1.0</p>
            <p className="mt-2 text-xs opacity-60">
              Cette page se fermera automatiquement à la fin de la maintenance
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes glitch {
          0% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
          100% { transform: translate(0); }
        }

        .glitch-text {
          animation: glitch 1s infinite;
        }

        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }

        .scanline {
          position: absolute;
          width: 100%;
          height: 2px;
          background: rgba(0, 255, 0, 0.1);
          animation: scanline 8s linear infinite;
        }

        /* Effet CRT */
        .bg-black::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: repeating-linear-gradient(
            0deg,
            rgba(0, 255, 0, 0.03) 0px,
            transparent 1px,
            transparent 2px,
            rgba(0, 255, 0, 0.03) 3px
          );
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};

export default MaintenancePage;
