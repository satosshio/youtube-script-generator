#!/usr/bin/env python3
"""
Script para testar login no Supabase
"""
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

def test_login():
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_ANON_KEY")
    
    supabase = create_client(supabase_url, supabase_key)
    
    try:
        # Try to sign in
        response = supabase.auth.sign_in_with_password({
            "email": "eliseumanicajr@gmail.com",
            "password": "Eliseu12345!"
        })
        
        if response.user:
            print(f"✅ Login bem-sucedido!")
            print(f"📧 Email: {response.user.email}")
            print(f"🆔 ID: {response.user.id}")
            print(f"🔑 Access Token: {response.session.access_token[:50]}...")
        else:
            print("❌ Erro ao fazer login")
            print(f"Response: {response}")
            
    except Exception as e:
        print(f"❌ Erro: {str(e)}")
        print(f"Detalhes: {e}")

if __name__ == "__main__":
    test_login()