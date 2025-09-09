from youtube_transcript_api import YouTubeTranscriptApi
from typing import List, Dict, Optional
import re

class TranscriptExtractor:
    def __init__(self):
        self.languages = ['pt', 'pt-BR', 'en', 'es']  # Prioridade de idiomas
    
    def extract_transcript(self, video_id: str) -> Optional[str]:
        """
        Extrai a transcrição de um vídeo do YouTube
        
        Args:
            video_id: ID do vídeo do YouTube
            
        Returns:
            Transcrição completa como string ou None se não encontrar
        """
        try:
            # Tenta obter transcrições em português primeiro
            for lang in self.languages[:2]:  # Tenta pt e pt-BR
                try:
                    transcript_data = YouTubeTranscriptApi.fetch(video_id, [lang])
                    return self._format_transcript(transcript_data)
                except:
                    continue
            
            # Se não encontrou em português, tenta em inglês
            try:
                transcript_data = YouTubeTranscriptApi.fetch(video_id, ['en'])
                return self._format_transcript(transcript_data)
            except:
                pass
            
            # Como último recurso, tenta obter qualquer transcrição disponível
            try:
                transcript_data = YouTubeTranscriptApi.fetch(video_id)
                return self._format_transcript(transcript_data)
            except:
                pass
                
            return None
            
        except Exception as e:
            print(f"Erro ao extrair transcrição do vídeo {video_id}: {str(e)}")
            return None
    
    def _format_transcript(self, transcript_data: List[Dict]) -> str:
        """
        Formata os dados da transcrição em texto corrido
        
        Args:
            transcript_data: Lista de dicionários com texto e timestamp
            
        Returns:
            Texto da transcrição formatado
        """
        if not transcript_data:
            return ""
        
        # Junta todo o texto
        full_text = " ".join([entry['text'] for entry in transcript_data])
        
        # Limpa e formata o texto
        full_text = self._clean_transcript_text(full_text)
        
        return full_text
    
    def _clean_transcript_text(self, text: str) -> str:
        """
        Limpa e melhora a formatação do texto da transcrição
        
        Args:
            text: Texto bruto da transcrição
            
        Returns:
            Texto limpo e formatado
        """
        # Remove quebras de linha desnecessárias
        text = re.sub(r'\n+', ' ', text)
        
        # Remove espaços múltiplos
        text = re.sub(r'\s+', ' ', text)
        
        # Remove tags comuns de transcrição automática
        text = re.sub(r'\[.*?\]', '', text)  # Remove [música], [risos], etc.
        text = re.sub(r'\(.*?\)', '', text)  # Remove (inaudível), etc.
        
        # Adiciona pontuação básica onde falta
        text = re.sub(r'([a-z])([A-Z])', r'\1. \2', text)
        
        # Limpa espaços no início e fim
        text = text.strip()
        
        return text
    
    def extract_multiple_transcripts(self, video_ids: List[str], max_videos: int = 3) -> Dict[str, str]:
        """
        Extrai transcrições de múltiplos vídeos
        
        Args:
            video_ids: Lista de IDs dos vídeos
            max_videos: Número máximo de vídeos para processar (para economizar API calls)
            
        Returns:
            Dicionário com video_id como chave e transcrição como valor
        """
        transcripts = {}
        processed = 0
        
        for video_id in video_ids:
            if processed >= max_videos:
                break
                
            transcript = self.extract_transcript(video_id)
            if transcript and len(transcript.strip()) > 100:  # Só inclui transcrições substanciais
                transcripts[video_id] = transcript
                processed += 1
            
        return transcripts
    
    def get_transcript_summary(self, transcript: str, max_length: int = 500) -> str:
        """
        Cria um resumo da transcrição para análise mais eficiente
        
        Args:
            transcript: Transcrição completa
            max_length: Tamanho máximo do resumo em caracteres
            
        Returns:
            Resumo da transcrição
        """
        if not transcript or len(transcript) <= max_length:
            return transcript
        
        # Pega o início, meio e fim da transcrição
        part_size = max_length // 3
        
        beginning = transcript[:part_size]
        middle_start = len(transcript) // 2 - part_size // 2
        middle = transcript[middle_start:middle_start + part_size]
        end = transcript[-part_size:]
        
        summary = f"{beginning}... [MEIO] ...{middle}... [FINAL] ...{end}"
        
        return summary