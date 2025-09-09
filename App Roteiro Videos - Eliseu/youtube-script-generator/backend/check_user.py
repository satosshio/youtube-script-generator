#!/usr/bin/env python3
"""
Script para verificar status do usuário
"""
from supabase import create_client
import os
from dotenv import load_dotenv
import json

load_dotenv()

def check_user():
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_ANON_KEY")
    
    print(f"🔗 Conectando ao Supabase: {supabase_url}")
    
    supabase = create_client(supabase_url, supabase_key)
    
    try:
        # Tenta fazer login para ver o erro exato
        print("\n📝 Tentando login...")
        try:
            response = supabase.auth.sign_in_with_password({
                "email": "eliseumanicajr@gmail.com",
                "password": "Eliseu12345!"
            })
            print(f"✅ Login bem-sucedido!")
            print(f"User: {response.user}")
            print(f"Session: {response.session}")
        except Exception as login_error:
            print(f"❌ Erro no login: {login_error}")
            
        # Tenta buscar informações da sessão atual
        print("\n📝 Verificando sessão...")
        session = supabase.auth.get_session()
        print(f"Sessão atual: {session}")
        
        # Tenta criar o usuário novamente para ver o erro
        print("\n📝 Tentando criar usuário novamente...")
        try:
            signup_response = supabase.auth.sign_up({
                "email": "eliseumanicajr@gmail.com",
                "password": "Eliseu12345!"
            })
            print(f"Resposta signup: {signup_response}")
        except Exception as signup_error:
            print(f"Erro signup: {signup_error}")
            
    except Exception as e:
        print(f"❌ Erro geral: {str(e)}")

if __name__ == "__main__":
    check_user()