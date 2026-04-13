import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, type FormEvent } from 'react';
import { Mail, Lock, UserPlus, LogIn, Chrome } from 'lucide-react';

export default function Login() {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    try {
      setError(null);
      await signInWithGoogle();
    } catch (err) {
      setError('Failed to sign in with Google. Please try again.');
    }
  };

  const handleEmailSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setError(null);
      setIsSubmitting(true);
      if (mode === 'signup') {
        await signUpWithEmail(name, email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      setError(mode === 'signup' ? 'Registrazione non riuscita. Controlla i dati e riprova.' : 'Accesso non riuscito. Controlla email e password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex-grow flex items-center justify-center pt-24 pb-16 px-4 bg-gray-50">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white p-10 border border-gray-100 shadow-sm text-center"
      >
        <div className="flex items-center justify-center gap-2 mb-4 text-xs uppercase tracking-[0.35em] text-gray-500">
          {mode === 'signup' ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
          <span>{mode === 'signup' ? 'Registrazione' : 'Accesso'}</span>
        </div>
        <h1 className="font-serif text-3xl mb-2">{mode === 'signup' ? 'Crea il tuo account' : 'Bentornato'}</h1>
        <p className="text-gray-500 text-sm mb-8">
          {mode === 'signup'
            ? 'Registrati per salvare i tuoi dati e iniziare il percorso cliente.'
            : 'Accedi per vedere ordini, preferiti e area personale.'}
        </p>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <form onSubmit={handleEmailSubmit} className="space-y-4 text-left mb-6">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Nome</label>
              <div className="relative">
                <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full pl-9 pr-4 py-3 border border-gray-300 focus:outline-none focus:border-brand-black"
                  placeholder="Il tuo nome"
                />
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full pl-9 pr-4 py-3 border border-gray-300 focus:outline-none focus:border-brand-black"
                placeholder="nome@email.it"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-gray-500 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full pl-9 pr-4 py-3 border border-gray-300 focus:outline-none focus:border-brand-black"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand-black text-white py-3 px-4 hover:bg-gray-900 transition-colors disabled:opacity-50"
          >
            {mode === 'signup' ? 'Registrati' : 'Accedi'}
          </button>
        </form>

        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center space-x-3 border border-gray-300 py-3 px-4 hover:bg-gray-50 transition-colors"
        >
          <Chrome className="w-5 h-5" />
          <span className="text-sm font-medium uppercase tracking-widest">Continua con Google</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setMode(mode === 'login' ? 'signup' : 'login');
          }}
          className="mt-4 text-xs uppercase tracking-widest text-gray-500 hover:text-brand-black transition-colors"
        >
          {mode === 'login' ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
        </button>

        <div className="mt-8 text-xs text-gray-400">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </div>
      </motion.div>
    </main>
  );
}
