import React from 'react'
import { useAuth } from '../AuthContext'
import { LogOut, Zap } from 'lucide-react'

const Header = () => {
  const { user, signOut } = useAuth()

  if (!user) return null

  return (
    <header className="sticky top-0 z-40 bg-dark-900/80 backdrop-blur-xl border-b border-dark-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Title */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 animate-glow">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                <span className="text-white">Script</span>
                <span className="text-gradient ml-1">AI</span>
              </h1>
              <p className="text-xs text-gray-500 -mt-1">by Eliseu Manica Jr.</p>
            </div>
          </div>

          {/* User Info & Logout */}
          <div className="flex items-center gap-4">
            {/* User Info */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-primary-500/30">
                <img
                  src="/eliseu-manica.jpg"
                  alt="Eliseu Manica Jr."
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling.style.display = 'flex';
                  }}
                />
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-primary-500 to-accent-500" style={{ display: 'none' }}>
                  <span className="text-white text-sm font-medium">E</span>
                </div>
              </div>
              <div className="text-sm">
                <p className="text-gray-300 font-medium">
                  Eliseu Manica Jr.
                </p>
              </div>
            </div>

            <button
              onClick={signOut}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-dark-800/50 hover:bg-dark-700/50 text-gray-300 hover:text-white transition-all duration-200"
              title="Sair"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-sm">Sair</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header