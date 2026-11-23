import React, { useState } from 'react';
import { LogIn, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ApiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  onSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSeedMode, setIsSeedMode] = useState(false);
  const [seedNombre, setSeedNombre] = useState('Administrador');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isSeedMode) {
        // Crear administrador inicial
        await ApiClient.post('/auth/seed-admin', {
          nombre: seedNombre,
          email,
          password,
        });
        setSuccessMsg('Administrador inicial creado. Ahora puedes iniciar sesión.');
        setIsSeedMode(false);
      } else {
        // Login normal
        const res = await ApiClient.post('/auth/login', { email, password });
        login(res.token, res.usuario);
        onSuccess();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm p-4 pt-12">
      <div className="rounded-3xl bg-white p-6 shadow-xl border border-gray-100">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white mx-auto mb-3 shadow-md shadow-brand-500/20">
          <LogIn className="h-6 w-6" />
        </div>

        <h2 className="text-xl font-black text-center text-gray-900">
          {isSeedMode ? 'Crear Administrador Inicial' : 'Acceso del Personal'}
        </h2>
        <p className="text-xs text-center text-gray-500 mt-1 mb-5">
          {isSeedMode
            ? 'Configura el primer usuario del sistema'
            : 'Inicia sesión para operar como vendedor o administrador'}
        </p>

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-green-50 p-3 text-xs text-green-700">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isSeedMode && (
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Nombre</label>
              <input
                type="text"
                value={seedNombre}
                onChange={(e) => setSeedNombre(e.target.value)}
                required
                className="w-full rounded-xl border border-gray-300 p-2.5 text-sm focus:border-brand-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@local.com"
              required
              className="w-full rounded-xl border border-gray-300 p-2.5 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full rounded-xl border border-gray-300 p-2.5 text-sm focus:border-brand-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-brand-600 py-3.5 text-sm font-bold text-white shadow-md shadow-brand-500/20 transition hover:bg-brand-700 active:scale-95 disabled:opacity-50"
          >
            {loading ? 'Procesando...' : isSeedMode ? 'Registrar Administrador' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-5 border-t pt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setIsSeedMode(!isSeedMode);
              setErrorMsg(null);
            }}
            className="text-xs text-brand-700 font-semibold hover:underline"
          >
            {isSeedMode ? '← Volver al inicio de sesión' : '¿Primer uso? Sembrar Administrador'}
          </button>
        </div>
      </div>
    </div>
  );
};
