from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Optional
import asyncio
import json

from youtube_client import YouTubeClient
from agents import MultiAgentSystem
from auth_middleware import get_current_user, get_optional_user

app = FastAPI(title="YouTube Script Generator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://localhost:5173",
        "https://aa3be56c.youtube-script-generator.pages.dev",
        "https://scriptai-generator.pages.dev",
        "https://experatoflix.com.br"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

youtube_client = YouTubeClient()
agent_system = MultiAgentSystem()

class SearchRequest(BaseModel):
    topic: str
    max_results: int = 10

class DateSearchRequest(BaseModel):
    topic: str
    published_after: str = None  # Format: 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:MM:SSZ'
    published_before: str = None # Format: 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:MM:SSZ'
    max_results: int = 10

class TrendingRequest(BaseModel):
    topic: str
    days: int = 7  # Últimos X dias
    max_results: int = 10

class VideoResponse(BaseModel):
    id: str
    title: str
    description: str
    channel: str
    thumbnail: str
    views: int
    likes: int
    link: str
    publishedAt: str

class ScriptGenerationRequest(BaseModel):
    topic: str
    videos: List[Dict]
    target_minutes: int = 10
    personality_prompt: str = None
    model_provider: str = "gpt-4.1"  # "gpt-4.1", "gpt-5", "claude-sonnet-4", "claude-opus-4.1"

class ScriptResponse(BaseModel):
    script: str
    topic: str

@app.get("/")
async def root():
    return {"message": "YouTube Script Generator API", "version": "1.0.0"}

@app.post("/api/test-auth")
async def test_auth(current_user: dict = Depends(get_current_user)):
    """
    Endpoint de teste para verificar autenticação
    """
    print("DEBUG: [test-auth] Endpoint executado com sucesso!")
    return {"message": "Auth working", "user": current_user.get('email', 'unknown')}

@app.post("/api/test-generate")
async def test_generate(current_user: dict = Depends(get_current_user)):
    """
    Endpoint de teste simplificado para geração de script
    """
    print("DEBUG: [test-generate] Endpoint executado com sucesso!")
    return {"message": "Generate working", "user": current_user.get('email', 'unknown')}

@app.post("/api/test-script-request")
async def test_script_request(request: ScriptGenerationRequest, current_user: dict = Depends(get_current_user)):
    """
    Endpoint de teste com o mesmo modelo do generate-script
    """
    print("DEBUG: [test-script-request] Endpoint executado com sucesso!")
    print(f"DEBUG: Dados recebidos - topic: {request.topic}, videos: {len(request.videos)}")
    return {"message": "Script request working", "user": current_user.get('email', 'unknown')}

@app.post("/api/search-videos", response_model=List[VideoResponse])
async def search_videos(request: SearchRequest, current_user: dict = Depends(get_current_user)):
    """
    Busca vídeos em alta sobre um tópico específico
    """
    try:
        videos = youtube_client.search_trending_videos(
            query=request.topic,
            max_results=request.max_results
        )
        
        if not videos:
            raise HTTPException(status_code=404, detail="Nenhum vídeo encontrado para este tópico")
        
        return videos
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar vídeos: {str(e)}")

@app.post("/api/generate-script", response_model=ScriptResponse)
async def generate_script(request: ScriptGenerationRequest, current_user: dict = Depends(get_current_user)):
    """
    Gera um roteiro baseado nos vídeos encontrados usando o sistema multiagente
    """
    try:
        print(f"DEBUG: Iniciando geração de roteiro para user: {current_user.get('email', 'unknown')}")
        print(f"DEBUG: Número de vídeos recebidos: {len(request.videos) if request.videos else 0}")
        
        if not request.videos:
            print("DEBUG: Erro - nenhum vídeo fornecido")
            raise HTTPException(status_code=400, detail="É necessário fornecer vídeos para gerar o roteiro")
        
        print(f"DEBUG: Usando modelo: {request.model_provider}")
        
        # Criar instância do sistema baseado no provider
        current_agent_system = MultiAgentSystem(model_provider=request.model_provider)
        
        print("DEBUG: Chamando generate_script...")
        script = await current_agent_system.generate_script(
            videos=request.videos,
            topic=request.topic,
            target_minutes=request.target_minutes,
            personality_prompt=request.personality_prompt,
            model_provider=request.model_provider
        )
        
        print("DEBUG: Script gerado com sucesso")
        return ScriptResponse(script=script, topic=request.topic)
    except HTTPException as he:
        print(f"DEBUG: HTTPException capturada: {he.status_code} - {he.detail}")
        raise
    except Exception as e:
        print(f"DEBUG: Exceção geral capturada: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao gerar roteiro: {str(e)}")

@app.post("/api/generate-script-with-progress")
async def generate_script_with_progress(request: ScriptGenerationRequest, current_user: dict = Depends(get_current_user)):
    """
    Gera um roteiro com atualizações de progresso via SSE
    """
    async def event_generator():
        try:
            # Envia progresso inicial
            yield f"data: {json.dumps({'step': 0, 'total': 5, 'agent': '🚀 Iniciando', 'description': 'Preparando sistema...', 'percentage': 0})}\n\n"
            await asyncio.sleep(0.5)
            
            # Simula progresso através dos agentes
            agents = [
                {"step": 1, "name": "🔍 Pesquisador", "description": "Analisando vídeos em alta...", "percentage": 20},
                {"step": 2, "name": "📊 Analista", "description": "Identificando tendências virais...", "percentage": 40},
                {"step": 3, "name": "✍️ Roteirista", "description": "Criando estrutura do roteiro...", "percentage": 60},
                {"step": 4, "name": "🎙️ Eliseu", "description": "Aplicando estilo e personalidade...", "percentage": 80},
                {"step": 5, "name": "✅ Revisor", "description": "Finalizando e ajustando tempo...", "percentage": 95}
            ]
            
            # Criar instância do sistema baseado no provider
            current_agent_system = MultiAgentSystem(model_provider=request.model_provider)
            
            # Gera o script em paralelo
            script_task = asyncio.create_task(current_agent_system.generate_script(
                videos=request.videos,
                topic=request.topic,
                target_minutes=request.target_minutes,
                personality_prompt=request.personality_prompt,
                model_provider=request.model_provider
            ))
            
            # Simula progresso dos agentes
            for agent in agents:
                yield f"data: {json.dumps({'step': agent['step'], 'total': 5, 'agent': agent['name'], 'description': agent['description'], 'percentage': agent['percentage']})}\n\n"
                await asyncio.sleep(2)  # Simula tempo de processamento
            
            # Aguarda o script ficar pronto
            script = await script_task
            
            # Envia resultado final
            yield f"data: {json.dumps({'step': 5, 'total': 5, 'agent': '🎉 Concluído', 'description': 'Roteiro pronto!', 'percentage': 100, 'script': script})}\n\n"
            
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/api/complete-flow")
async def complete_flow(request: ScriptGenerationRequest, current_user: dict = Depends(get_current_user)):
    """
    Endpoint que executa o fluxo completo: busca vídeos e gera roteiro
    """
    try:
        videos = youtube_client.search_trending_videos(
            query=request.topic,
            max_results=request.max_results
        )
        
        if not videos:
            raise HTTPException(status_code=404, detail="Nenhum vídeo encontrado para este tópico")
        
        script = await agent_system.generate_script(
            videos=videos,
            topic=request.topic,
            target_minutes=request.target_minutes,
            personality_prompt=request.personality_prompt
        )
        
        return {
            "videos": videos,
            "script": script,
            "topic": request.topic
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no processamento: {str(e)}")

@app.post("/api/search-videos-by-date", response_model=List[VideoResponse])
async def search_videos_by_date(request: DateSearchRequest, current_user: dict = Depends(get_current_user)):
    """
    Busca vídeos em alta por período específico
    """
    try:
        videos = youtube_client.search_trending_videos_by_date(
            query=request.topic,
            published_after=request.published_after,
            published_before=request.published_before,
            max_results=request.max_results
        )
        
        if not videos:
            raise HTTPException(status_code=404, detail="Nenhum vídeo encontrado para este período")
        
        return videos
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar vídeos por data: {str(e)}")

@app.post("/api/search-trending-recent", response_model=List[VideoResponse])
async def search_trending_recent(request: TrendingRequest, current_user: dict = Depends(get_current_user)):
    """
    Busca vídeos mais hypados dos últimos X dias
    """
    try:
        videos = youtube_client.get_trending_last_days(
            query=request.topic,
            days=request.days,
            max_results=request.max_results
        )
        
        if not videos:
            raise HTTPException(status_code=404, detail=f"Nenhum vídeo hypado encontrado nos últimos {request.days} dias")
        
        return videos
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar vídeos recentes: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)