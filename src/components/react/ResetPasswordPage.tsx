import { useState, type FormEvent } from 'react';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    console.log('Reset password request:', { email });
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
      <main className="flex-grow flex items-center justify-center relative overflow-hidden px-4 py-10">
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#7b2cbf]/10 rounded-full blur-[120px] -z-10" />

        <section className="max-w-md w-full">
          {/* Card */}
          <div className="glass-panel p-8 md:p-10 rounded-lg void-shadow border border-[#4c4353]/15 relative overflow-hidden">
            {/* Accent line */}
            <div className="absolute top-0 left-0 w-1 h-full kinetic-gradient-glow" />

            <div className="mb-10 text-left">
              <h1 className="font-['Space_Grotesk'] text-3xl md:text-4xl font-bold tracking-tighter text-[#e2e2e2] mb-4">
                ¿Olvidaste tu contraseña?
              </h1>
              <p className="text-[#cfc2d5] font-['Inter'] font-normal leading-relaxed">
                Ingresa tu email para obtener el enlace de recuperación.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block font-['Inter'] text-xs uppercase tracking-widest text-[#deb7ff] font-semibold" htmlFor="email">
                  Tu email *
                </label>
                <input
                  className="w-full bg-[#2a2a2a] border-none rounded-md py-4 px-4 text-[#e2e2e2] placeholder:text-[#cfc2d5]/40 focus:ring-2 focus:ring-[#7b2cbf] focus:outline-none transition-all duration-300"
                  id="email"
                  type="email"
                  placeholder="nombre@ejemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="pt-4 space-y-6">
                <button
                  className="w-full kinetic-gradient-glow text-[#e4c2ff] font-['Space_Grotesk'] font-bold py-4 rounded-md tracking-tight hover:scale-105 active:scale-105 transition-all duration-200 void-shadow cursor-pointer"
                  type="submit"
                >
                  Reestablecer
                </button>

                <div className="flex justify-center">
                  <a className="group flex items-center gap-2 text-[#cfc2d5] hover:text-[#deb7ff] transition-colors duration-300 font-['Inter'] text-sm" href="/login">
                    <span className="material-symbols-outlined text-base">arrow_back</span>
                    Volver al login
                  </a>
                </div>
              </div>
            </form>
          </div>

          
        </section>
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
