import React, { useState } from 'react'
import { useAuth } from '../AuthContext'
import { Mail, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react'

const Auth = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { signIn, resetPassword, loading } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setIsSubmitting(true)

    console.log('Tentando login com:', { email, password })

    try {
      // Login only
      const { data, error } = await signIn(email, password)
      console.log('Resposta do login:', { data, error })
      
      if (error) {
        console.error('Erro no login:', error)
        if (error.message === 'Email not confirmed') {
          setError('Email não confirmado. Verifique sua caixa de entrada ou use o dashboard do Supabase para confirmar manualmente.')
        } else {
          setError(error.message)
        }
      } else {
        console.log('Login bem-sucedido!', data)
        setMessage('Login realizado com sucesso! Redirecionando...')
        // The AuthContext will automatically update the user state via onAuthStateChange
      }
    } catch (err) {
      setError('Erro inesperado. Tente novamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetPassword = async () => {
    if (!email) {
      setError('Digite seu email primeiro')
      return
    }

    setError('')
    setMessage('')
    setIsSubmitting(true)

    try {
      const { error } = await resetPassword(email)
      if (error) {
        setError(error.message)
      } else {
        setMessage('Email de recuperação enviado! Verifique sua caixa de entrada.')
      }
    } catch (err) {
      setError('Erro ao enviar email de recuperação')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          <p className="text-gray-400">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl overflow-hidden ring-2 ring-primary-500/30 mb-4">
            <img
              src="/eliseu-manica.jpg"
              alt="Eliseu Manica Jr."
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'flex';
              }}
            />
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-500/20 to-accent-500/20" style={{ display: 'none' }}>
              <User className="w-8 h-8 text-primary-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">
            <span className="text-white">Script</span>
            <span className="text-gradient ml-1">AI</span>
          </h1>
          <p className="text-gray-400">
            Entre em sua conta
          </p>
        </div>

        {/* Auth Form */}
        <div className="card-premium">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-200">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-primary pl-10 w-full"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-200">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-primary pl-10 pr-10 w-full"
                  placeholder="Sua senha"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>


            {/* Error/Success Messages */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {message && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                <p className="text-green-400 text-sm">{message}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Entrar
            </button>

            {/* Forgot Password */}
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={isSubmitting}
              className="w-full text-sm text-gray-400 hover:text-primary-400 transition-colors"
            >
              Esqueceu a senha?
            </button>
          </form>

        </div>
      </div>
    </div>
  )
}

export default Auth