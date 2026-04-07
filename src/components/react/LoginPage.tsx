import { useState, type FormEvent } from 'react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    console.log('Login attempt:', { email, password });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#131313] text-[#e2e2e2] font-['Inter',sans-serif] antialiased selection:bg-[#7b2cbf] selection:text-white">
      {/* Header */}
      <header className="w-full sticky top-0 z-50 bg-gradient-to-b from-[#131313] to-transparent">
        <nav className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="font-['Space_Grotesk'] text-xl font-bold text-[#deb7ff] tracking-tight uppercase">AGUSTÍNTURRIEDF</span>
          </div>
          <div className="flex items-center gap-6">
            <a className="text-[#e2e2e2]/70 font-['Space_Grotesk'] tracking-tight hover:text-[#deb7ff] hover:bg-[#1f1f1f] transition-all duration-300 px-3 py-1 rounded text-sm uppercase" href="/">
              Volver al inicio
            </a>
          </div>
        </nav>
      </header>

      {/* Main */}
      <main className="flex-grow flex flex-col items-center justify-center relative overflow-hidden pt-16 pb-12">
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#7b2cbf]/10 rounded-full blur-[120px] -z-10" />

        <div className="w-full max-w-md px-6 z-10">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="font-['Space_Grotesk'] text-5xl font-extrabold tracking-tighter text-[#e2e2e2] uppercase mb-2">
              Acceso privado
            </h1>
            <p className="font-['Inter'] text-[#b9c7e4] text-lg tracking-wide opacity-80">
              Inicia sesión
            </p>
          </div>

          {/* Card */}
          <div className="glass-panel p-8 md:p-10 rounded-lg void-shadow border border-[#4c4353]/15 relative overflow-hidden">
            {/* Accent line */}
            <div className="absolute top-0 left-0 w-1 h-full kinetic-gradient-glow" />

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div className="space-y-2">
                <label className="font-['Inter'] text-xs font-bold tracking-[0.1em] uppercase text-[#deb7ff]" htmlFor="email">
                  Email
                </label>
                <input
                  className="w-full bg-[#2a2a2a] border-none rounded-md px-4 py-4 text-[#e2e2e2] focus:ring-2 focus:ring-[#7b2cbf] focus:outline-none transition-all placeholder:text-[#988d9e]/50"
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="font-['Inter'] text-xs font-bold tracking-[0.1em] uppercase text-[#deb7ff]" htmlFor="password">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <input
                    className="w-full bg-[#2a2a2a] border-none rounded-md px-4 py-4 pr-12 text-[#e2e2e2] focus:ring-2 focus:ring-[#7b2cbf] focus:outline-none transition-all placeholder:text-[#988d9e]/50"
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#988d9e] hover:text-[#deb7ff] transition-colors cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Forgot link */}
              <div className="text-right">
                <a className="font-['Inter'] text-xs font-semibold tracking-wide text-[#deb7ff] hover:text-[#e4c2ff] transition-colors" href="/reset-password">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>

              {/* Submit */}
              <button
                className="w-full kinetic-gradient-glow text-[#e4c2ff] font-['Space_Grotesk'] font-bold py-4 rounded-md uppercase tracking-[0.1em] hover:scale-105 active:scale-105 transition-all duration-300 void-shadow cursor-pointer"
                type="submit"
              >
                Iniciar Sesión
              </button>
            </form>
          </div>

          {/* Divider */}
          <div className="mt-12 flex items-center gap-4 opacity-30">
            <div className="h-[1px] flex-grow bg-[#4c4353]" />
            <span className="font-['Inter'] text-[10px] tracking-[0.3em] uppercase">Entrenador de fuerza</span>
            <div className="h-[1px] flex-grow bg-[#4c4353]" />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#000000] w-full pt-12 pb-6 px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-6">
            <a href="#" className="flex items-center gap-3 group">
              <img
                alt="KINETIC NOIR Logo"
                className="h-14 w-auto object-contain transition-all duration-300 group-hover:drop-shadow-[0_0_10px_rgba(123,44,191,0.5)]"
                src="/Logo.png"
              />
            </a>
            <div className="flex gap-4">
              <a
                className="text-gray-500 hover:text-white transition-colors opacity-80 hover:opacity-100 flex items-center"
                href="https://wa.me/5491178296710?text=Hola%20Agustin!%20Quiero%20solicitar%20informaci%C3%B3n%20sobre%20los%20planes%20de%20entrenamiento."
                aria-label="WhatsApp"
              >
                <img src="/icons/whatsapp.svg" width={24} height={24} alt="WhatsApp" />
              </a>
              <a
                className="text-gray-500 hover:text-white transition-colors opacity-80 hover:opacity-100 flex items-center"
                href="https://www.instagram.com/agustinturri.edf/"
                aria-label="Instagram"
              >
                <img src="/icons/instagram.svg" width={24} height={24} alt="Instagram" />
              </a>
              <a
                className="text-gray-500 hover:text-white transition-colors opacity-80 hover:opacity-100 flex items-center"
                href="mailto:agustinturri1@gmail.com"
                aria-label="Email"
              >
                <img src="/icons/gmailBlanco.svg" width={24} height={24} alt="Email" />
              </a>
            </div>
          </div>
          <div className="font-['Inter'] text-sm leading-relaxed text-gray-400 opacity-60">
            © 2026 Agustin Turri. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
