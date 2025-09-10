import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    console.log('AuthContext: Inicializando...')
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('AuthContext: Sessão inicial:', session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthContext: Mudança de estado:', { event, session })
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email, password) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      
      if (error) throw error
      
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email, password) => {
    try {
      setLoading(true)
      console.log('AuthContext: Tentando login com Supabase...')
      console.log('AuthContext: Email:', email)
      console.log('AuthContext: Supabase URL:', supabase.supabaseUrl)
      console.log('AuthContext: Supabase Key (last 20):', supabase.supabaseKey?.slice(-20))
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      console.log('AuthContext: Resposta completa do Supabase:', JSON.stringify({ data, error }, null, 2))
      
      if (error) {
        console.error('AuthContext: Erro detalhado:', {
          message: error.message,
          status: error.status,
          statusCode: error.statusCode,
          details: error
        })
        throw error
      }
      
      console.log('AuthContext: Login bem-sucedido, usuário:', data.user)
      console.log('AuthContext: Session:', data.session)
      
      // Force user state update immediately
      if (data.user) {
        console.log('AuthContext: Atualizando estado do usuário imediatamente')
        setUser(data.user)
      }
      
      return { data, error: null }
    } catch (error) {
      console.error('AuthContext: Erro no login:', error)
      console.error('AuthContext: Stack trace:', error.stack)
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      
      if (error) throw error
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      
      if (error) throw error
      
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}