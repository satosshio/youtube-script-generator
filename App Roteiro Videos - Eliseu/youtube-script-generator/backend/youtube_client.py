from googleapiclient.discovery import build
from typing import List, Dict, Optional
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from transcript_extractor import TranscriptExtractor

load_dotenv()

class YouTubeClient:
    def __init__(self):
        self.api_key = os.getenv("YOUTUBE_API_KEY")
        if not self.api_key:
            raise ValueError("YouTube API key not found. Please set YOUTUBE_API_KEY in .env file")
        self.youtube = build('youtube', 'v3', developerKey=self.api_key)
        self.transcript_extractor = TranscriptExtractor()
    
    def search_trending_videos(self, query: str, max_results: int = 10) -> List[Dict]:
        """
        Busca vídeos em alta sobre um assunto específico usando múltiplos critérios
        """
        try:
            # Busca por relevância primeiro (algoritmo do YouTube considera engagement)
            search_response = self.youtube.search().list(
                q=query,
                type='video',
                part='id,snippet',
                maxResults=max_results * 2,  # Busca mais para filtrar depois
                order='relevance',  # Mudança: relevance considera engagement recente
                relevanceLanguage='pt',
                videoDefinition='high',  # Apenas vídeos HD
                videoDuration='medium'  # Filtra vídeos muito curtos (4-20min)
            ).execute()
            
            video_ids = [item['id']['videoId'] for item in search_response.get('items', [])]
            
            if not video_ids:
                return []
            
            videos_response = self.youtube.videos().list(
                part='snippet,statistics',
                id=','.join(video_ids)
            ).execute()
            
            videos = []
            for item in videos_response.get('items', []):
                stats = item.get('statistics', {})
                views = int(stats.get('viewCount', 0))
                likes = int(stats.get('likeCount', 0))
                comments = int(stats.get('commentCount', 0))
                
                # Calcula engagement score (likes + comentários / views)
                engagement_score = 0
                if views > 0:
                    engagement_score = ((likes + comments) / views) * 100
                
                # Filtra vídeos com baixo engagement ou muito poucos views
                if views < 1000 or engagement_score < 0.5:
                    continue
                
                video_data = {
                    'id': item['id'],
                    'title': item['snippet']['title'],
                    'description': item['snippet'].get('description', '')[:200],
                    'channel': item['snippet']['channelTitle'],
                    'thumbnail': item['snippet']['thumbnails']['medium']['url'],
                    'views': views,
                    'likes': likes,
                    'comments': comments,
                    'engagement_score': engagement_score,
                    'link': f"https://www.youtube.com/watch?v={item['id']}",
                    'publishedAt': item['snippet']['publishedAt']
                }
                videos.append(video_data)
            
            # Ordena por engagement score (vídeos mais "hypados") em vez de apenas views
            videos.sort(key=lambda x: (x['engagement_score'], x['views']), reverse=True)
            
            # Extrai transcrições dos melhores vídeos
            final_videos = videos[:max_results]
            self._add_transcripts_to_videos(final_videos)
            
            return final_videos
            
        except Exception as e:
            print(f"Erro ao buscar vídeos: {str(e)}")
            return []
    
    def search_trending_videos_by_date(self, query: str, published_after: Optional[str] = None, 
                                     published_before: Optional[str] = None, max_results: int = 10) -> List[Dict]:
        """
        Busca vídeos em alta com filtro de data específica
        
        Args:
            query: Termo de busca
            published_after: Data no formato 'YYYY-MM-DD' ou 'YYYY-MM-DDTHH:MM:SSZ'
            published_before: Data no formato 'YYYY-MM-DD' ou 'YYYY-MM-DDTHH:MM:SSZ'
            max_results: Número máximo de resultados
        """
        try:
            search_params = {
                'q': query,
                'type': 'video',
                'part': 'id,snippet',
                'maxResults': max_results * 2,  # Busca mais para filtrar depois
                'order': 'relevance',  # Relevance para considerar engagement
                'relevanceLanguage': 'pt',
                'videoDefinition': 'high',
                'videoDuration': 'medium'
            }
            
            # Adiciona filtros de data se fornecidos
            if published_after:
                # Se apenas data (YYYY-MM-DD), adiciona horário
                if 'T' not in published_after:
                    published_after += 'T00:00:00Z'
                search_params['publishedAfter'] = published_after
                
            if published_before:
                # Se apenas data (YYYY-MM-DD), adiciona horário final do dia
                if 'T' not in published_before:
                    published_before += 'T23:59:59Z'
                search_params['publishedBefore'] = published_before
            
            search_response = self.youtube.search().list(**search_params).execute()
            
            video_ids = [item['id']['videoId'] for item in search_response.get('items', [])]
            
            if not video_ids:
                return []
            
            videos_response = self.youtube.videos().list(
                part='snippet,statistics',
                id=','.join(video_ids)
            ).execute()
            
            videos = []
            for item in videos_response.get('items', []):
                stats = item.get('statistics', {})
                views = int(stats.get('viewCount', 0))
                likes = int(stats.get('likeCount', 0))
                comments = int(stats.get('commentCount', 0))
                
                # Calcula engagement score
                engagement_score = 0
                if views > 0:
                    engagement_score = ((likes + comments) / views) * 100
                
                # Filtra vídeos com baixo engagement
                if views < 1000 or engagement_score < 0.5:
                    continue
                
                video_data = {
                    'id': item['id'],
                    'title': item['snippet']['title'],
                    'description': item['snippet'].get('description', '')[:200],
                    'channel': item['snippet']['channelTitle'],
                    'thumbnail': item['snippet']['thumbnails']['medium']['url'],
                    'views': views,
                    'likes': likes,
                    'comments': comments,
                    'engagement_score': engagement_score,
                    'link': f"https://www.youtube.com/watch?v={item['id']}",
                    'publishedAt': item['snippet']['publishedAt']
                }
                videos.append(video_data)
            
            # Ordena por engagement score
            videos.sort(key=lambda x: (x['engagement_score'], x['views']), reverse=True)
            
            # Extrai transcrições dos melhores vídeos
            final_videos = videos[:max_results]
            self._add_transcripts_to_videos(final_videos)
            
            return final_videos
            
        except Exception as e:
            print(f"Erro ao buscar vídeos por data: {str(e)}")
            return []
    
    def get_trending_last_days(self, query: str, days: int = 7, max_results: int = 10) -> List[Dict]:
        """
        Busca vídeos hypados dos últimos X dias
        
        Args:
            query: Termo de busca
            days: Número de dias para voltar (padrão 7 dias)
            max_results: Número máximo de resultados
        """
        published_after = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%dT00:00:00Z')
        return self.search_trending_videos_by_date(query, published_after=published_after, max_results=max_results)
    
    def _add_transcripts_to_videos(self, videos: List[Dict]) -> None:
        """
        Adiciona transcrições aos vídeos (máximo 3 para não sobrecarregar)
        
        Args:
            videos: Lista de vídeos para adicionar transcrições
        """
        if not videos:
            return
        
        print(f"Extraindo transcrições de {min(len(videos), 3)} vídeos...")
        
        # Extrai transcrições dos 3 melhores vídeos
        video_ids = [video['id'] for video in videos[:3]]
        transcripts = self.transcript_extractor.extract_multiple_transcripts(video_ids, max_videos=3)
        
        # Adiciona as transcrições aos dados dos vídeos
        for video in videos:
            video_id = video['id']
            if video_id in transcripts:
                # Adiciona transcrição completa
                video['transcript'] = transcripts[video_id]
                # Adiciona resumo para análise mais eficiente
                video['transcript_summary'] = self.transcript_extractor.get_transcript_summary(
                    transcripts[video_id], max_length=1000
                )
                video['has_transcript'] = True
                print(f"✓ Transcrição extraída do vídeo: {video['title'][:50]}...")
            else:
                video['transcript'] = ""
                video['transcript_summary'] = ""
                video['has_transcript'] = False
                print(f"✗ Transcrição não disponível: {video['title'][:50]}...")
        
        # Log do resultado
        with_transcript = sum(1 for v in videos if v.get('has_transcript', False))
        print(f"Resultado: {with_transcript}/{len(videos)} vídeos com transcrições disponíveis")