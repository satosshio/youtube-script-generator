from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
import os
from dotenv import load_dotenv
import jwt
from typing import Optional

load_dotenv()

# Initialize Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_ANON_KEY")
supabase: Client = create_client(supabase_url, supabase_key)

# Security scheme
security = HTTPBearer()

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Verify JWT token from Supabase and return user info
    """
    try:
        token = credentials.credentials
        
        # Verify the JWT token with Supabase
        response = supabase.auth.get_user(token)
        
        if not response.user:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        return {
            "user_id": response.user.id,
            "email": response.user.email,
            "user": response.user
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(user_info: dict = Depends(verify_token)) -> dict:
    """
    Get current authenticated user
    """
    return user_info

async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[dict]:
    """
    Get user info if token is provided, otherwise return None
    Useful for endpoints that work for both authenticated and anonymous users
    """
    if not credentials:
        return None
    
    try:
        return await verify_token(credentials)
    except HTTPException:
        return None