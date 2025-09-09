#!/usr/bin/env python3
"""
Script para criar usuário no Supabase
"""
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

def create_user():
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_ANON_KEY")
    
    supabase = create_client(supabase_url, supabase_key)
    
    try:
        # Create user
        response = supabase.auth.sign_up({
            "email": "eliseumanicajr@gmail.com",
            "password": "Eliseu12345!"
        })
        
        if response.user:
            print(f"✅ Usuário criado com sucesso!")
            print(f"📧 Email: {response.user.email}")
            print(f"🆔 ID: {response.user.id}")
            print(f"✉️ Verificação: {'Confirmado' if response.user.email_confirmed_at else 'Pendente - verifique o email'}")
        else:
            print("❌ Erro ao criar usuário")
            print(f"Error: {response}")
            
    except Exception as e:
        print(f"❌ Erro: {str(e)}")

if __name__ == "__main__":
    create_user()