import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onSuccess?: () => void;
  onToggleMode?: () => void;
}

export function LoginPage({ onSuccess, onToggleMode }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const playSuccessSound = async () => {
    try {
      // Play voice message using Speech Synthesis
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance('ACCESS GRANTED');
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Wait for voices to load
        await new Promise<void>((resolve) => {
          if (speechSynthesis.getVoices().length > 0) {
            resolve();
          } else {
            speechSynthesis.addEventListener('voiceschanged', () => resolve(), { once: true });
          }
        });

        // Try to use a suitable voice
        const voices = speechSynthesis.getVoices();
        const preferredVoice = voices.find(v =>
          v.name.includes('Google') ||
          v.name.includes('Microsoft') ||
          v.lang.startsWith('en')
        );
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        speechSynthesis.speak(utterance);
      }

      // Also play beep sounds
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const now = audioContext.currentTime;

      // First beep
      const oscillator1 = audioContext.createOscillator();
      const gainNode1 = audioContext.createGain();
      oscillator1.connect(gainNode1);
      gainNode1.connect(audioContext.destination);
      oscillator1.frequency.value = 600;
      oscillator1.type = 'square';
      gainNode1.gain.setValueAtTime(0.3, now);
      gainNode1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      oscillator1.start(now);
      oscillator1.stop(now + 0.15);

      // Second beep
      const oscillator2 = audioContext.createOscillator();
      const gainNode2 = audioContext.createGain();
      oscillator2.connect(gainNode2);
      gainNode2.connect(audioContext.destination);
      oscillator2.frequency.value = 1200;
      oscillator2.type = 'square';
      gainNode2.gain.setValueAtTime(0.3, now + 0.2);
      gainNode2.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      oscillator2.start(now + 0.2);
      oscillator2.stop(now + 0.4);
    } catch (err) {
      console.log('Audio not supported:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      await playSuccessSound();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cyber-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="cyber-card p-8">
          <div className="flex justify-center mb-8">
            <div className="p-2 border-2 border-cyber-primary rounded overflow-hidden">
              <style>{`
                @keyframes fingerprint-pulse {
                  0%, 100% {
                    transform: scale(1);
                  }
                  50% {
                    transform: scale(1.2);
                  }
                }
                .fingerprint-animate {
                  animation: fingerprint-pulse 3s ease-in-out infinite;
                }
              `}</style>
              <img
                src="/9582BB2F-76EB-482A-AA3B-844C889D9DFB.png"
                alt="Biometric Authentication"
                className="w-48 h-48 object-contain fingerprint-animate"
              />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-cyber-primary text-center mb-2 font-mono">
            DEFENSE TERMINAL
          </h1>
          <p className="text-cyber-secondary text-center mb-8 font-mono text-sm">
            AUTHENTICATE TO ACCESS SYSTEM
          </p>

          {error && (
            <div className="mb-6 bg-red-900/20 border-2 border-red-500 rounded p-3 flex items-start gap-2 font-mono">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-cyber-primary mb-2 font-mono uppercase">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 bg-cyber-bg border-2 border-cyber-primary/50 rounded text-cyber-primary placeholder-cyber-secondary/50 focus:outline-none focus:border-cyber-primary font-mono"
                placeholder="analyst@company.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-cyber-primary mb-2 font-mono uppercase">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 bg-cyber-bg border-2 border-cyber-primary/50 rounded text-cyber-primary placeholder-cyber-secondary/50 focus:outline-none focus:border-cyber-primary font-mono"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="cyber-button-primary w-full py-3 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'AUTHENTICATING...' : 'ACCESS SYSTEM'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
