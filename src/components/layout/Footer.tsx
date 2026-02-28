import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#070714]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 font-bold text-white text-xs">
                MV
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                MesaVIP
              </span>
            </div>
            <p className="text-sm text-white/40 max-w-xs">
              La plataforma de reservas VIP para los mejores eventos y
              nightclubs. Mapa 3D interactivo y confirmacion instantanea.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">
              Explorar
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/events"
                  className="text-sm text-white/40 hover:text-purple-400 transition-colors"
                >
                  Eventos
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-sm text-white/40 hover:text-purple-400 transition-colors"
                >
                  Iniciar Sesion
                </Link>
              </li>
              <li>
                <Link
                  href="/register"
                  className="text-sm text-white/40 hover:text-purple-400 transition-colors"
                >
                  Registrarse
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">
              Legal
            </h3>
            <ul className="space-y-2">
              <li>
                <span className="text-sm text-white/40">
                  Terminos y Condiciones
                </span>
              </li>
              <li>
                <span className="text-sm text-white/40">
                  Politica de Privacidad
                </span>
              </li>
              <li>
                <span className="text-sm text-white/40">
                  Politica de Reembolsos
                </span>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">
              Contacto
            </h3>
            <ul className="space-y-2">
              <li>
                <span className="text-sm text-white/40">
                  soporte@mesavip.com
                </span>
              </li>
              <li>
                <span className="text-sm text-white/40">
                  Buenos Aires, Argentina
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} MesaVIP. Todos los derechos
            reservados.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-white/20">
              Pagos seguros con MercadoPago
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
