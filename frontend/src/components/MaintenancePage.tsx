import React, { useState, useEffect } from 'react';
import { Send, MessageCircle, X, ChevronDown, ChevronUp, BookOpen } from 'lucide-react';

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

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: string;
  isSystem?: boolean;
}

const MaintenancePage: React.FC<MaintenancePageProps> = ({ message }) => {
  const [dots, setDots] = useState('');
  const [lines, setLines] = useState<string[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);

  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      username: 'Système',
      message: 'Bienvenue sur le chat de maintenance ! Posez vos questions ici.',
      timestamp: new Date().toLocaleTimeString('fr-FR'),
      isSystem: true
    }
  ]);

  // Changelog state
  const [showChangelog, setShowChangelog] = useState(false);
  const [changelogContent, setChangelogContent] = useState<string>('');

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

  // Load changelog
  useEffect(() => {
    fetch('/changelog.md')
      .then(res => res.text())
      .then(text => {
        // Extract only the first version (most recent changes)
        const firstVersion = text.split('## [')[1];
        if (firstVersion) {
          setChangelogContent('## [' + firstVersion.split('## [')[0]);
        } else {
          setChangelogContent(text);
        }
      })
      .catch(() => {
        setChangelogContent('Changelog non disponible pour le moment.');
      });
  }, []);

  // Handle chat message send
  const handleSendMessage = () => {
    if (!chatMessage.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      username: localStorage.getItem('username') || 'Joueur',
      message: chatMessage,
      timestamp: new Date().toLocaleTimeString('fr-FR'),
    };

    setChatMessages(prev => [...prev, newMessage]);
    setChatMessage('');

    // TODO: Send message to server via WebSocket or API
  };

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

          {/* Action buttons */}
          <div className="flex gap-4 justify-center mt-6">
            <button
              onClick={() => setShowChangelog(!showChangelog)}
              className="flex items-center gap-2 px-6 py-3 bg-green-900/50 border-2 border-green-500 rounded-lg text-green-300 font-mono hover:bg-green-800/50 transition-all shadow-lg shadow-green-500/20"
            >
              <BookOpen size={20} />
              Notes de Mise à Jour
              {showChangelog ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            <button
              onClick={() => setShowChat(!showChat)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-900/50 border-2 border-blue-500 rounded-lg text-blue-300 font-mono hover:bg-blue-800/50 transition-all shadow-lg shadow-blue-500/20"
            >
              <MessageCircle size={20} />
              Chat de Maintenance
              {showChat ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {/* Changelog Panel */}
          {showChangelog && (
            <div className="mt-6 bg-black/90 border-2 border-green-500 rounded-lg shadow-2xl shadow-green-500/50 overflow-hidden animate-in slide-in-from-top">
              <div className="bg-green-900/30 border-b border-green-500 px-4 py-2 flex items-center justify-between">
                <span className="text-green-400 font-mono font-bold">📋 NOTES DE MISE À JOUR</span>
                <button
                  onClick={() => setShowChangelog(false)}
                  className="text-green-400 hover:text-green-300"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 max-h-96 overflow-y-auto text-green-300 font-mono text-sm space-y-2">
                <div className="prose prose-invert prose-green max-w-none">
                  {changelogContent.split('\n').map((line, idx) => {
                    if (line.startsWith('## ')) {
                      return <h2 key={idx} className="text-yellow-400 text-lg font-bold mt-4 mb-2">{line.replace('## ', '')}</h2>;
                    } else if (line.startsWith('### ')) {
                      return <h3 key={idx} className="text-green-400 text-base font-bold mt-3 mb-1">{line.replace('### ', '')}</h3>;
                    } else if (line.startsWith('#### ')) {
                      return <h4 key={idx} className="text-cyan-400 text-sm font-bold mt-2">{line.replace('#### ', '')}</h4>;
                    } else if (line.startsWith('- ')) {
                      return <li key={idx} className="ml-4 text-green-300">{line.replace('- ', '• ')}</li>;
                    } else if (line.startsWith('**')) {
                      return <p key={idx} className="text-green-200 font-semibold">{line.replace(/\*\*/g, '')}</p>;
                    } else if (line.trim()) {
                      return <p key={idx} className="text-green-300">{line}</p>;
                    }
                    return <br key={idx} />;
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Chat Panel */}
          {showChat && (
            <div className="mt-6 bg-black/90 border-2 border-blue-500 rounded-lg shadow-2xl shadow-blue-500/50 overflow-hidden animate-in slide-in-from-top">
              <div className="bg-blue-900/30 border-b border-blue-500 px-4 py-2 flex items-center justify-between">
                <span className="text-blue-400 font-mono font-bold">💬 CHAT DE MAINTENANCE</span>
                <button
                  onClick={() => setShowChat(false)}
                  className="text-blue-400 hover:text-blue-300"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Messages */}
              <div className="p-4 h-64 overflow-y-auto space-y-2 bg-black/40">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-2 rounded ${
                      msg.isSystem
                        ? 'bg-yellow-900/20 border border-yellow-500/30'
                        : 'bg-blue-900/20 border border-blue-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-mono text-xs font-bold ${
                        msg.isSystem ? 'text-yellow-400' : 'text-blue-400'
                      }`}>
                        {msg.username}
                      </span>
                      <span className="text-green-600 text-[10px] font-mono">{msg.timestamp}</span>
                    </div>
                    <p className="text-green-300 text-sm font-mono">{msg.message}</p>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="border-t border-blue-500 p-3 bg-black/60 flex gap-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Tapez votre message..."
                  className="flex-1 bg-blue-950/50 border border-blue-500 rounded px-3 py-2 text-green-300 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  onClick={handleSendMessage}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 border border-blue-400 rounded text-white font-mono transition-colors flex items-center gap-2"
                >
                  <Send size={16} />
                  Envoyer
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="text-center mt-6 text-green-600 text-sm font-mono">
            <p>Système de maintenance autonome v2.3.0</p>
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
