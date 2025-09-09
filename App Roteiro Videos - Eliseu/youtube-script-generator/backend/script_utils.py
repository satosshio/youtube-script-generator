import re
from typing import Tuple

class ScriptUtils:
    """Utilitários para processar e analisar roteiros"""
    
    @staticmethod
    def extract_spoken_words(script: str) -> Tuple[str, int]:
        """
        Extrai apenas as palavras que serão faladas pelo apresentador
        Remove indicações de cena, instruções técnicas, etc.
        
        Args:
            script: Roteiro completo com indicações
            
        Returns:
            Tupla com (texto_falado, contagem_palavras)
        """
        # Remove linhas que são claramente indicações (entre colchetes ou parênteses)
        script_lines = script.split('\n')
        spoken_lines = []
        
        for line in script_lines:
            # Pula linhas vazias
            if not line.strip():
                continue
            
            # Remove indicações entre colchetes [assim]
            line = re.sub(r'\[.*?\]', '', line)
            
            # Remove indicações entre parênteses (assim)
            line = re.sub(r'\(.*?\)', '', line)
            
            # Pula linhas que começam com indicadores comuns de não-fala
            skip_patterns = [
                r'^#',  # Headers markdown
                r'^\d+\.',  # Listas numeradas estruturais
                r'^-\s*\*\*.*\*\*:',  # Bullets com negrito seguido de dois pontos
                r'^GANCHO:',
                r'^INTRODUÇÃO:',
                r'^DESENVOLVIMENTO:',
                r'^CLÍMAX:',
                r'^CONCLUSÃO:',
                r'^CTA:',
                r'^⏱️',  # Indicadores de tempo
                r'^\*\*.*:\*\*$',  # Títulos de seção em negrito
                r'^---',  # Separadores
            ]
            
            should_skip = False
            for pattern in skip_patterns:
                if re.match(pattern, line.strip(), re.IGNORECASE):
                    should_skip = True
                    break
            
            if should_skip:
                continue
            
            # Remove marcações de negrito/itálico que não são faladas
            line = re.sub(r'\*\*(.*?)\*\*', r'\1', line)  # Remove **negrito**
            line = re.sub(r'\*(.*?)\*', r'\1', line)  # Remove *itálico*
            line = re.sub(r'__(.*?)__', r'\1', line)  # Remove __sublinhado__
            
            # Se ainda tem conteúdo após limpeza, é fala
            cleaned = line.strip()
            if cleaned and len(cleaned) > 5:  # Ignora linhas muito curtas
                spoken_lines.append(cleaned)
        
        # Junta todo o texto falado
        spoken_text = ' '.join(spoken_lines)
        
        # Remove espaços múltiplos
        spoken_text = re.sub(r'\s+', ' ', spoken_text)
        
        # Conta palavras reais
        words = spoken_text.split()
        word_count = len(words)
        
        return spoken_text, word_count
    
    @staticmethod
    def calculate_duration(word_count: int, words_per_minute: int = 155) -> float:
        """
        Calcula duração estimada baseada na contagem de palavras
        
        Args:
            word_count: Número de palavras faladas
            words_per_minute: Velocidade de fala (padrão 155 palavras/min - velocidade normal)
            
        Returns:
            Duração estimada em minutos
        """
        return word_count / words_per_minute
    
    @staticmethod
    def calculate_all_durations(word_count: int) -> dict:
        """
        Calcula duração em 3 velocidades diferentes
        
        Args:
            word_count: Número de palavras faladas
            
        Returns:
            Dicionário com durações em minutos e formato MM:SS
        """
        speeds = {
            'lenta': 130,     # Lento/Pausado
            'normal': 155,    # Velocidade normal
            'rapida': 184     # Rápido/Dinâmico
        }
        
        durations = {}
        for speed_name, wpm in speeds.items():
            minutes = word_count / wpm
            total_seconds = int(minutes * 60)
            mins = total_seconds // 60
            secs = total_seconds % 60
            
            durations[speed_name] = {
                'minutes': minutes,
                'formatted': f"{mins:02d}:{secs:02d}",
                'seconds': total_seconds,
                'wpm': wpm
            }
        
        return durations
    
    @staticmethod
    def format_script_with_markers(script: str) -> str:
        """
        Formata o roteiro distinguindo claramente falas de indicações
        
        Args:
            script: Roteiro original
            
        Returns:
            Roteiro formatado com marcadores claros
        """
        lines = script.split('\n')
        formatted_lines = []
        
        for line in lines:
            stripped = line.strip()
            
            # Se é uma indicação estrutural
            if any([
                stripped.startswith('GANCHO'),
                stripped.startswith('INTRODUÇÃO'),
                stripped.startswith('DESENVOLVIMENTO'),
                stripped.startswith('CLÍMAX'),
                stripped.startswith('CONCLUSÃO'),
                stripped.startswith('CTA'),
                re.match(r'^\d+\.', stripped),
                re.match(r'^#', stripped),
                stripped.startswith('⏱️'),
            ]):
                formatted_lines.append(f"\n📋 **{stripped}**")
            # Se tem indicações entre colchetes
            elif '[' in stripped:
                # Separa fala de indicação
                parts = re.split(r'(\[.*?\])', stripped)
                formatted_parts = []
                for part in parts:
                    if part.startswith('[') and part.endswith(']'):
                        formatted_parts.append(f"🎬 {part}")
                    elif part.strip():
                        formatted_parts.append(f"🎙️ {part}")
                formatted_lines.append(' '.join(formatted_parts))
            # Se é fala pura
            elif stripped and len(stripped) > 5:
                formatted_lines.append(f"🎙️ {stripped}")
            else:
                formatted_lines.append(line)
        
        return '\n'.join(formatted_lines)
    
    @staticmethod
    def adjust_script_to_duration(script: str, target_minutes: int, current_word_count: int) -> str:
        """
        Ajusta o roteiro para atingir a duração desejada (baseado em velocidade normal: 155 wpm)
        
        Args:
            script: Roteiro atual
            target_minutes: Duração alvo em minutos
            current_word_count: Contagem atual de palavras faladas
            
        Returns:
            Sugestões de ajuste
        """
        target_words = target_minutes * 155  # Velocidade normal: 155 palavras/minuto
        difference = target_words - current_word_count
        
        if abs(difference) < 40:  # Margem de erro aceitável (aproximadamente 15 segundos)
            return "✅ Roteiro está no tempo ideal!"
        
        if difference > 0:
            # Precisa adicionar conteúdo
            minutes_to_add = difference / 155
            return f"""
⚠️ ROTEIRO MUITO CURTO!
Palavras atuais: {current_word_count}
Palavras necessárias: {target_words}
Faltam: {difference} palavras (~{minutes_to_add:.1f} minutos)

SUGESTÕES:
- Adicione mais exemplos práticos
- Desenvolva melhor cada ponto principal
- Inclua histórias ou casos de uso
- Adicione mais detalhes explicativos
"""
        else:
            # Precisa reduzir conteúdo
            minutes_to_cut = abs(difference) / 155
            return f"""
⚠️ ROTEIRO MUITO LONGO!
Palavras atuais: {current_word_count}
Palavras máximas: {target_words}
Excesso: {abs(difference)} palavras (~{minutes_to_cut:.1f} minutos)

SUGESTÕES:
- Remova exemplos menos importantes
- Seja mais direto em explicações
- Elimine repetições
- Foque nos pontos essenciais
"""