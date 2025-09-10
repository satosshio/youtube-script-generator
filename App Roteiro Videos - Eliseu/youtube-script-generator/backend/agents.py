from typing import Dict, List, TypedDict, Annotated, Sequence
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain.schema import HumanMessage, BaseMessage
import operator
import os
from dotenv import load_dotenv
from script_utils import ScriptUtils

load_dotenv()

class ScriptState(TypedDict):
    videos: List[Dict]
    topic: str
    target_minutes: int
    personality_prompt: str
    model_provider: str
    trends: List[str]
    script_structure: Dict
    raw_script: str
    final_script: str
    messages: Annotated[Sequence[BaseMessage], operator.add]

class MultiAgentSystem:
    def __init__(self, model_provider: str = "openai"):
        self.model_provider = model_provider
        
        if model_provider == "anthropic":
            anthropic_api_key = os.getenv("ANTHROPIC_API_KEY")
            print(f"DEBUG: Anthropic API Key encontrada: {'Sim' if anthropic_api_key else 'Não'}")
            if anthropic_api_key:
                print(f"DEBUG: Claude Key começa com: {anthropic_api_key[:7]}...")
            if not anthropic_api_key:
                print("Warning: Anthropic API key not found. Using OpenAI as fallback.")
                model_provider = "openai"
            else:
                self.llm = ChatAnthropic(
                    model="claude-3-5-sonnet-20241022",
                    temperature=0.7,
                    api_key=anthropic_api_key,
                    max_tokens=4096
                )
                print("DEBUG: Using Claude 3.5 Sonnet")
        
        if model_provider == "openai":
            openai_api_key = os.getenv("OPENAI_API_KEY")
            print(f"DEBUG: OpenAI API Key encontrada: {'Sim' if openai_api_key else 'Não'}")
            if openai_api_key:
                print(f"DEBUG: OpenAI Key começa com: {openai_api_key[:7]}...")
            if not openai_api_key:
                print("Warning: OpenAI API key not found. AI functionality will be limited.")
                self.llm = None
            else:
                self.llm = ChatOpenAI(
                    model="gpt-4o",
                    temperature=0.7,
                    api_key=openai_api_key
                )
                print("DEBUG: Using GPT-4o")
        self.graph = self._build_graph()
        self.progress_callback = None
        self.agent_info = {
            "pesquisador": {"name": "🔍 Pesquisador", "description": "Analisando vídeos em alta..."},
            "analista": {"name": "📊 Analista", "description": "Identificando tendências virais..."},
            "roteirista": {"name": "✍️ Roteirista", "description": "Criando estrutura do roteiro..."},
            "eliseu": {"name": "🎙️ Eliseu", "description": "Aplicando estilo e personalidade..."},
            "revisor": {"name": "✅ Revisor", "description": "Finalizando e ajustando tempo..."}
        }
    
    def _build_graph(self):
        workflow = StateGraph(ScriptState)
        
        workflow.add_node("pesquisador", self.pesquisador_agent)
        workflow.add_node("analista", self.analista_agent)
        workflow.add_node("roteirista", self.roteirista_agent)
        workflow.add_node("eliseu", self.eliseu_agent)
        workflow.add_node("revisor", self.revisor_agent)
        
        workflow.set_entry_point("pesquisador")
        workflow.add_edge("pesquisador", "analista")
        workflow.add_edge("analista", "roteirista")
        workflow.add_edge("roteirista", "eliseu")
        workflow.add_edge("eliseu", "revisor")
        workflow.add_edge("revisor", END)
        
        return workflow.compile()
    
    async def _notify_progress(self, agent_name: str, step: int, total_steps: int = 5):
        """Notifica o progresso para o callback se disponível"""
        if self.progress_callback:
            agent_data = self.agent_info.get(agent_name, {})
            await self.progress_callback({
                "step": step,
                "total": total_steps,
                "agent": agent_data.get("name", agent_name),
                "description": agent_data.get("description", "Processando..."),
                "percentage": int((step / total_steps) * 100)
            })
    
    def pesquisador_agent(self, state: ScriptState) -> ScriptState:
        """Agente que organiza e analisa os dados dos vídeos"""
        # Notifica progresso se possível
        if self.progress_callback:
            import asyncio
            loop = asyncio.new_event_loop()
            loop.run_until_complete(self._notify_progress("pesquisador", 1))
            loop.close()
        
        videos = state["videos"]
        topic = state["topic"]
        
        # Verifica se há transcrições disponíveis
        videos_with_transcripts = [v for v in videos if v.get('has_transcript', False)]
        
        transcript_analysis = ""
        if videos_with_transcripts:
            transcript_analysis = "\n\nANÁLISE DETALHADA DAS TRANSCRIÇÕES DOS VÍDEOS MAIS HYPADOS:\n"
            for i, video in enumerate(videos_with_transcripts[:3], 1):
                transcript_analysis += f"""
                
                VÍDEO {i}: {video['title']}
                Engagement: {video.get('engagement_score', 0):.2f}% | Views: {video['views']:,}
                
                CONTEÚDO REAL DO VÍDEO:
                {video.get('transcript_summary', '')}
                
                ---"""
        
        prompt = f"""
        Você é um agente pesquisador especializado em YouTube com acesso às TRANSCRIÇÕES REAIS dos vídeos hypados.
        Analise os seguintes vídeos sobre "{topic}" e organize as informações mais relevantes:
        
        METADADOS DOS VÍDEOS:
        {self._format_videos(videos)}
        
        {transcript_analysis}
        
        Com base nas TRANSCRIÇÕES REAIS dos vídeos hypados, extraia:
        1. Principais temas e abordagens que realmente funcionam (baseado no conteúdo real)
        2. Estruturas de apresentação e ganchos usados nos vídeos de sucesso
        3. Linguagem e tom que geram engagement
        4. Elementos específicos que prendem a atenção (baseado nas transcrições)
        5. Padrões de conteúdo que viralizam
        6. Gaps de conteúdo (o que falta ser abordado)
        
        IMPORTANTE: Priorize insights das transcrições reais em vez de apenas metadados.
        Seja específico e detalhado com base no conteúdo real dos vídeos.
        """
        
        response = self.llm.invoke([HumanMessage(content=prompt)])
        state["messages"].append(response)
        return state
    
    def analista_agent(self, state: ScriptState) -> ScriptState:
        """Agente que identifica tendências e sugere tópicos-chave baseado em transcrições reais"""
        last_message = state["messages"][-1].content if state["messages"] else ""
        videos = state["videos"]
        
        # Conta quantos vídeos têm transcrições
        videos_with_transcripts = [v for v in videos if v.get('has_transcript', False)]
        transcript_count = len(videos_with_transcripts)
        
        transcript_context = ""
        if transcript_count > 0:
            transcript_context = f"""
            
            VANTAGEM COMPETITIVA: Temos acesso às TRANSCRIÇÕES REAIS de {transcript_count} vídeos hypados!
            Isso nos permite identificar padrões exatos de linguagem, estrutura e conteúdo que geram viral.
            """
        
        prompt = f"""
        Você é um analista de tendências de conteúdo com acesso privilegiado às transcrições dos vídeos mais hypados.
        
        ANÁLISE DETALHADA ANTERIOR (baseada em conteúdo real):
        {last_message}
        
        {transcript_context}
        
        Com base nas TRANSCRIÇÕES REAIS dos vídeos hypados, identifique:
        1. As 5 principais tendências de conteúdo que realmente funcionam (não suposições)
        2. Padrões de linguagem e frases que geram engagement
        3. Estruturas de apresentação comprovadamente eficazes
        4. Elementos específicos de abertura/gancho que prendem atenção
        5. Tópicos-chave que devem ser abordados no roteiro
        6. Timing e ritmo de apresentação dos vídeos de sucesso
        7. Calls-to-action que realmente convertem
        
        IMPORTANTE: Base suas recomendações no CONTEÚDO REAL dos vídeos hypados, não em teorias.
        Forneça insights específicos e acionáveis para replicar o sucesso viral.
        """
        
        response = self.llm.invoke([HumanMessage(content=prompt)])
        
        trends_prompt = f"""
        Extraia apenas uma lista com os 5 principais tópicos/tendências mencionados.
        
        Texto: {response.content}
        
        Retorne apenas a lista, um item por linha.
        """
        
        trends_response = self.llm.invoke([HumanMessage(content=trends_prompt)])
        state["trends"] = trends_response.content.split('\n')
        state["messages"].append(response)
        return state
    
    def roteirista_agent(self, state: ScriptState) -> ScriptState:
        """Agente que cria a estrutura do roteiro"""
        last_message = state["messages"][-1].content if state["messages"] else ""
        trends = state.get("trends", [])
        topic = state["topic"]
        target_minutes = state["target_minutes"]
        personality_prompt = state["personality_prompt"]
        
        # Calculate target word count (velocidade normal: 155 palavras/minuto)
        target_words = target_minutes * 155
        min_words = target_words - 50  # Margem mínima
        max_words = target_words + 50  # Margem máxima
        
        personality_section = ""
        if personality_prompt:
            personality_section = f"""
        
        ESTILO E PERSONALIDADE ESPECÍFICA:
        {personality_prompt}
        """
        
        # Ajusta estrutura baseada na duração
        if target_minutes <= 5:
            desenvolvimento_time = f"{target_minutes - 2} minutos"
            pontos_principais = "2-3 pontos principais"
        elif target_minutes <= 10:
            desenvolvimento_time = f"{target_minutes - 3} minutos"
            pontos_principais = "3-5 pontos principais"
        elif target_minutes <= 20:
            desenvolvimento_time = f"{target_minutes - 5} minutos"
            pontos_principais = "5-7 pontos principais com mais profundidade"
        else:
            desenvolvimento_time = f"{target_minutes - 8} minutos"
            pontos_principais = "7-10 pontos principais com exemplos detalhados"
        
        # Verifica se temos transcrições para usar como referência
        videos = state["videos"]
        videos_with_transcripts = [v for v in videos if v.get('has_transcript', False)]
        
        transcript_reference = ""
        if videos_with_transcripts:
            transcript_reference = "\n\nREFERÊNCIAS DE ESTRUTURA DOS VÍDEOS HYPADOS:\n"
            for i, video in enumerate(videos_with_transcripts[:2], 1):
                transcript_reference += f"""
                
                REFERÊNCIA {i} - {video['title']} ({video.get('engagement_score', 0):.1f}% engagement):
                Estrutura real usada no vídeo:
                {video.get('transcript_summary', '')[:800]}
                ---"""
        
        prompt = f"""
        Você é um roteirista profissional de YouTube com acesso às TRANSCRIÇÕES dos vídeos mais hypados do nicho.
        
        Crie um roteiro completo sobre "{topic}" considerando:
        
        DURAÇÃO ALVO: {target_minutes} minutos (~{target_words} palavras)
        
        ANÁLISE BASEADA EM CONTEÚDO REAL:
        {last_message}
        
        Tendências identificadas nas transcrições:
        {', '.join(trends)}{personality_section}
        
        {transcript_reference}
        
        Estrutura obrigatória (adaptada para {target_minutes} minutos):
        
        1. GANCHO (primeiros 5-10 segundos)
        - Pergunta impactante ou afirmação polêmica
        - Promessa clara do que o viewer vai aprender
        
        2. INTRODUÇÃO (15-30 segundos)
        - Contextualização rápida
        - Por que isso é importante AGORA
        
        3. DESENVOLVIMENTO ({desenvolvimento_time})
        - {pontos_principais}
        - Exemplos práticos
        - Dados ou estatísticas relevantes
        - Storytelling se possível
        
        4. CLÍMAX (30-60 segundos)
        - Revelação principal ou insight mais valioso
        - Momento "aha"
        
        5. CONCLUSÃO (20-40 segundos)
        - Recapitulação rápida
        - Aplicação prática
        
        6. CTA (10-15 segundos)
        - Ação específica para o viewer
        - Pedido de like/inscrição contextualizado
        
        🚨 REQUISITO CRÍTICO DE DURAÇÃO:
        ⚠️ O roteiro DEVE ter entre {min_words} e {max_words} palavras FALADAS
        🎯 ALVO IDEAL: {target_words} palavras para {target_minutes} minutos
        
        REGRAS RÍGIDAS DE CONTAGEM:
        - Conte APENAS o que o apresentador vai FALAR
        - NÃO conte [indicações entre colchetes]
        - NÃO conte (instruções entre parênteses)
        - NÃO conte títulos de seções ou estrutura
        - APENAS texto corrido que será dito em voz alta
        
        ✅ FORMATO DE ROTEIRO PROFISSIONAL:
        
        [GANCHO - 10 segundos]
        Eliseu 👤: Aqui começa o que eu vou realmente falar para a câmera.
        
        [TRANSIÇÃO PARA INTRODUÇÃO]
        Eliseu 👤: Continuo falando aqui...
        
        [INDICAÇÃO VISUAL - mostrar gráfico]
        Eliseu 👤: E como vocês podem ver neste exemplo...
        
        🔥 ESTRATÉGIAS PARA ATINGIR {target_words} PALAVRAS:
        - Desenvolva CADA ponto em profundidade
        - Adicione exemplos práticos e concretos
        - Use histórias curtas e casos reais
        - Inclua dados, estatísticas e números
        - Faça transições elaboradas entre tópicos
        - Explique o "porquê" por trás de cada informação
        - Adicione contexto histórico quando relevante
        - Use analogias e comparações
        
        DIRETRIZES DE CONTEÚDO:
        - BASEIE-SE nas estruturas dos vídeos hypados acima
        - Use GANCHOS das transcrições reais
        - Mantenha o estilo solicitado{': ' + personality_prompt if personality_prompt else ''}
        - NUNCA seja superficial - desenvolva completamente cada ideia
        
        🎯 META FINAL: Escreva um roteiro com PELO MENOS {min_words} palavras de FALA (ideal: {target_words}) para garantir {target_minutes} minutos completos de vídeo.
        
        🚨 PROIBIÇÕES ABSOLUTAS:
        ❌ NÃO escreva explicações sobre o roteiro ("Este roteiro possui...", "A estrutura inclui...", "Agora você tem...")
        ❌ NÃO faça comentários meta sobre o conteúdo criado
        ❌ NÃO inclua resumos ou descrições da estrutura
        ❌ NÃO adicione comentários finais ("Esse roteiro agora tem...", "Espero que atenda...")
        ❌ NÃO use formatação markdown (**negrito**, *itálico*, # títulos)
        ✅ TERMINE com a última fala do Eliseu, SEM comentários adicionais
        ✅ APENAS o roteiro puro no formato profissional solicitado
        """
        
        response = self.llm.invoke([HumanMessage(content=prompt)])
        state["raw_script"] = response.content
        state["messages"].append(response)
        return state
    
    def eliseu_agent(self, state: ScriptState) -> ScriptState:
        """Agente que reescreve no estilo personalizado ou do Eliseu"""
        raw_script = state.get("raw_script", "")
        personality_prompt = state.get("personality_prompt", "")
        target_minutes = state.get("target_minutes", 10)
        target_words = target_minutes * 155  # Velocidade normal: 155 wpm
        min_words = target_words - 50  # Margem mínima
        max_words = target_words + 50  # Margem máxima
        
        if personality_prompt:
            # Use custom personality
            prompt = f"""
        Você é um criador de conteúdo que deve seguir exatamente este estilo:
        
        {personality_prompt}
        
        Reescreva este roteiro seguindo EXATAMENTE o estilo e personalidade solicitados:
        """
        else:
            # Use Eliseu's default style
            prompt = f"""
        Você é o Eliseu, um criador de conteúdo carismático e autêntico.
        
        Reescreva este roteiro no seu estilo único:
        """
        
        prompt += f"""
        
        ROTEIRO ORIGINAL:
        {raw_script}
        
        🚨 META CRÍTICA DE DURAÇÃO: {target_minutes} minutos
        🎯 PALAVRAS NECESSÁRIAS: {min_words} - {max_words} (ideal: {target_words})
        
        ⚠️ IMPORTANTE: O roteiro atual pode estar muito CURTO. 
        Você DEVE expandir o conteúdo para atingir pelo menos {min_words} palavras FALADAS.
        
        📋 FORMATO OBRIGATÓRIO DE SAÍDA - SIGA EXATAMENTE:
        
        🚨 EXEMPLO DO FORMATO CORRETO:
        
        [GANCHO - 10 segundos]
        Eliseu 👤: Fala, galera! Você sabia que...
        
        [INTRODUÇÃO - por que é importante]
        Eliseu 👤: Isso mesmo, é impressionante! Mas e se eu te disser...
        
        [DESENVOLVIMENTO - ponto principal]
        Eliseu 👤: Primeiro, vamos entender que...
        
        [INDICAÇÃO VISUAL - mostrar dados na tela]
        Eliseu 👤: Como vocês podem ver neste gráfico...
        
        🚨 REGRAS RÍGIDAS:
        ❌ NÃO escreva texto corrido sem formatação
        ❌ NÃO omita "Eliseu 👤:" antes de cada fala
        ❌ NÃO omita as seções [ENTRE COLCHETES]
        ✅ SEMPRE quebre em blocos organizados
        ✅ SEMPRE use "Eliseu 👤:" para cada fala
        ✅ SEMPRE marque seções com [NOME DA SEÇÃO]
        """
        
        if not personality_prompt:
            prompt += """
        
        SEU ESTILO DE FALA AUTÊNTICO (Eliseu Manica Jr.):
        
        TOM DIDÁTICO E ACESSÍVEL:
        - Explique conceitos de forma simplificada e clara
        - Antecipe dúvidas do espectador ("eu sei que você pode estar pensando...")
        - Use exemplos concretos com números para facilitar
        - Mantenha credibilidade técnica mesmo sendo informal
        
        LINGUAGEM COLOQUIAL CARACTERÍSTICA:
        - Use "tá" ao invés de "está"
        - Use "pra" ao invés de "para"
        - Use "pro" ao invés de "para o"
        - Expressões típicas: "de jeito nenhum", "isso aí", "ó" (ao invés de "olha")
        - Alongue palavras para manter ritmo
        
        VÍCIOS DE LINGUAGEM AUTÊNTICOS (USE COM MODERAÇÃO):
        - Adicione "né" ocasionalmente no final das frases ("isso é importante né", "você vai investir né")
        - Use "ou seja" para reformular ideias
        - Marcadores discursivos: "além disso", "dessa forma", "porém", "mas"
        - Estrutura repetitiva: "como funciona [isso]" para introduzir tópicos
        
        ESTILO YOUTUBER:
        - Perguntas retóricas para manter atenção
        - Ganchos no início ("É disso que eu vou falar nesse vídeo")
        - Pedidos diretos mas naturais ("se inscreve no canal", "deixa o seu like")
        - Humor sutil ("como o próprio nome diz... ó quem diria")
        
        INFORMALIDADES NATURAIS:
        - Fragmentação de frases longas com múltiplas conexões
        - Concordâncias informais ocasionais
        - Tom de conversa com um amigo
        
        🚨 REQUISITOS CRÍTICOS:
        - Mantenha TODA a estrutura e informações
        - EXPANDA o conteúdo para ter pelo menos {min_words} palavras FALADAS
        - Use os vícios de linguagem com MODERAÇÃO (especialmente o "né")
        - Seja natural e fluido, não forçado
        - Mantenha o equilíbrio entre informal e educativo
        - DESENVOLVA cada ponto completamente - NÃO seja superficial
        - Adicione exemplos, contexto e detalhes para atingir a duração alvo
        
        🚨 INSTRUÇÕES FINAIS OBRIGATÓRIAS:
        
        1. REESCREVA TODO O ROTEIRO no formato especificado acima
        2. QUEBRE o texto em seções organizadas com [TÍTULOS]
        3. TODA fala DEVE começar com "Eliseu 👤:"
        4. ADICIONE indicações técnicas [entre colchetes] quando necessário
        5. MANTENHA o conteúdo original mas organize no formato correto
        
        🚨 PROIBIÇÕES ABSOLUTAS:
        ❌ PROIBIDO texto corrido sem "Eliseu 👤:"
        ❌ PROIBIDO omitir seções [ENTRE COLCHETES]
        ❌ PROIBIDO explicações sobre o roteiro
        ❌ PROIBIDO comentários finais ou resumos
        ❌ PROIBIDO formatação markdown
        
        ✅ COMECE imediatamente com: [GANCHO - 10 segundos]
        ✅ TERMINE com a última fala: "Eliseu 👤: [última fala]"
        ✅ SEM comentários adicionais após a última fala
        """
        
        response = self.llm.invoke([HumanMessage(content=prompt)])
        state["messages"].append(response)
        return state
    
    def revisor_agent(self, state: ScriptState) -> ScriptState:
        """Agente que faz a revisão final e ajusta o tempo precisamente com validação rigorosa"""
        last_message = state["messages"][-1].content if state["messages"] else ""
        target_minutes = state.get("target_minutes", 10)
        personality_prompt = state.get("personality_prompt", "")
        
        # Analisa o roteiro atual para contar palavras FALADAS
        script_utils = ScriptUtils()
        spoken_text, word_count = script_utils.extract_spoken_words(last_message)
        actual_duration = script_utils.calculate_duration(word_count)
        
        target_words = target_minutes * 155  # Velocidade normal: 155 wpm
        min_words = target_words - 50  # Margem mínima
        max_words = target_words + 50  # Margem máxima
        
        # Determina a ação necessária
        if word_count < min_words:
            action_needed = f"🚨 ROTEIRO MUITO CURTO! Adicione {min_words - word_count} palavras FALADAS mínimo"
            expansion_strategy = f"""
        
        🔥 ESTRATÉGIAS OBRIGATÓRIAS PARA EXPANDIR:
        - Desenvolva cada ponto em MUITO mais profundidade
        - Adicione 2-3 exemplos práticos para cada conceito principal
        - Inclua histórias pessoais, casos reais e contexto histórico
        - Adicione dados, estatísticas e comparações
        - Elabore transições mais longas e detalhadas entre seções
        - Explique o "como" e "por que" de cada afirmação
        - Use analogias e metáforas elaboradas
        - Adicione sub-tópicos e desdobramentos
        - Inclua antecipação de dúvidas e objeções
        - Desenvolva mais o CTA e conclusão
        
        ⚠️ VOCÊ DEVE REESCREVER O ROTEIRO COMPLETAMENTE para ter pelo menos {min_words} palavras FALADAS!
            """
        elif word_count > max_words:
            action_needed = f"✂️ ROTEIRO MUITO LONGO! Remova {word_count - max_words} palavras FALADAS"
            expansion_strategy = """
        
        📏 ESTRATÉGIAS PARA REDUZIR:
        - Remova exemplos menos importantes
        - Seja mais direto nas explicações
        - Elimine repetições e redundancias
        - Foque apenas nos pontos essenciais
            """
        else:
            action_needed = "✅ Tempo está na margem aceitável - fazer apenas ajustes finos"
            expansion_strategy = ""
        
        estilo_info = "estilo personalizado" if personality_prompt else "tom Eliseu"
        
        # Recalcula as durações após análise atual
        all_durations = script_utils.calculate_all_durations(word_count)
        
        prompt = f"""
        🚨 REVISOR FINAL - AJUSTE OBRIGATÓRIO DE DURAÇÃO 🚨
        
        📈 ANÁLISE ATUAL DO ROTEIRO:
        - Palavras FALADAS (sem indicações): {word_count} palavras
        - Duração atual: {actual_duration:.1f} minutos  
        - META OBRIGATÓRIA: {target_minutes} minutos ({target_words} palavras)
        - FAIXA ACEITÁVEL: {min_words} - {max_words} palavras
        
        🚨 AÇÃO NECESSÁRIA: {action_needed}{expansion_strategy}
        
        ROTEIRO ATUAL PARA REVISÃO:
        {last_message}
        
        📋 INSTRUÇÕES RÍGIDAS:
        
        1. 🎯 AJUSTE DE TEMPO OBRIGATÓRIO:
           - O roteiro final DEVE ter entre {min_words} e {max_words} palavras FALADAS
           - Conte APENAS o que será dito em voz alta
           - NÃO conte [indicações] ou (instruções) ou títulos de seção
           - Se estiver abaixo de {min_words} palavras, REESCREVA expandindo dramaticamente
        
        2. 🎨 ESTRUTURA FINAL:
           - Separe claramente FALAS de INDICAÇÕES
           - Use [colchetes] para ações/visuais que NÃO são faladas
           - Todo texto corrido = fala que conta para o tempo
        
        3. ✨ QUALIDADE:
           - Gancho ultra impactante nos primeiros 10 segundos
           - Fluidez e {estilo_info} consistente
           - CTAs naturais e persuasivos
           - Ritmo envolvente do começo ao fim
        
        📁 FORMATO OBRIGATÓRIO DO OUTPUT:
        📅 TEMPO ESTIMADO DE LEITURA:
        🐌 Lenta (130 wpm): {all_durations['lenta']['formatted']}
        🎯 Normal (155 wpm): {all_durations['normal']['formatted']} 
        🚀 Rápida (184 wpm): {all_durations['rapida']['formatted']}
        
        📈 Palavras faladas: {word_count}
        
        🎬 FORMATO OBRIGATÓRIO - ROTEIRO PROFISSIONAL:
        
        🚨 ATENÇÃO: Você DEVE seguir este formato EXATAMENTE:
        
        [GANCHO - 10 segundos]
        Eliseu 👤: Fala, pessoal! Hoje eu vou mostrar pra vocês...
        
        [INTRODUÇÃO - transição suave]
        Eliseu 👤: E por que isso é tão importante? Olha só...
        
        [DESENVOLVIMENTO - ponto 1]
        Eliseu 👤: Primeiro, vamos entender que...
        
        [INDICAÇÃO VISUAL - mostrar gráfico na tela]
        Eliseu 👤: Como vocês podem ver neste exemplo...
        
        [CONCLUSÃO - call to action]
        Eliseu 👤: Então, deixa nos comentários o que vocês acharam...
        
        🚨 REGRAS CRÍTICAS - FORMATO OBRIGATÓRIO:
        ❌ PROIBIDO texto corrido sem formatação
        ❌ PROIBIDO parágrafos longos sem quebras
        ❌ PROIBIDO omitir as marcações [SEÇÃO]
        ❌ PROIBIDO omitir "Eliseu 👤:" antes de TODA fala
        ❌ PROIBIDO explicações sobre o roteiro
        ❌ PROIBIDO comentários finais ou resumos
        
        ✅ OBRIGATÓRIO: Toda fala DEVE começar com "Eliseu 👤:"
        ✅ OBRIGATÓRIO: Toda seção DEVE ter [TÍTULO DA SEÇÃO]
        ✅ OBRIGATÓRIO: Indicações técnicas sempre [entre colchetes]
        ✅ OBRIGATÓRIO: Quebrar o texto em blocos organizados
        ✅ OBRIGATÓRIO: Terminar com última fala do Eliseu
        
        🎯 LEMBRE-SE: Se o roteiro atual tem menos de {min_words} palavras, você DEVE expandi-lo completamente. NÃO aceite roteiros curtos!
        """
        
        response = self.llm.invoke([HumanMessage(content=prompt)])
        
        # Verifica se o resultado ainda está curto e tenta uma segunda vez
        new_spoken_text, new_word_count = script_utils.extract_spoken_words(response.content)
        
        if new_word_count < min_words:
            # Segunda tentativa com prompt ainda mais agressivo
            retry_prompt = f"""
            🚨🚨 SEGUNDA TENTATIVA - ROTEIRO AINDA MUITO CURTO! 🚨🚨
            
            Você retornou {new_word_count} palavras quando o mínimo é {min_words} palavras!
            
            ISSO É INACEITÁVEL! Você DEVE gerar pelo menos {min_words} palavras FALADAS.
            
            Pegue o roteiro abaixo e TRIPLIQUE o conteúdo:
            {response.content}
            
            🚨 FORMATO OBRIGATÓRIO - SIGA RIGOROSAMENTE:
            
            [GANCHO - 10 segundos]
            Eliseu 👤: [Fala de abertura aqui...]
            
            [INTRODUÇÃO - contexto]
            Eliseu 👤: [Explicação do contexto...]
            
            [DESENVOLVIMENTO - pontos principais]
            Eliseu 👤: [Primeiro ponto expandido...]
            
            [INDICAÇÃO VISUAL - mostrar dados]
            Eliseu 👤: [Comentário sobre o visual...]
            
            [CONCLUSÃO - call to action]
            Eliseu 👤: [Finalização e CTA...]
            
            ESTRATÉGIAS OBRIGATÓRIAS:
            - Para CADA ponto, adicione 3-5 frases de explicação
            - Para CADA exemplo, adicione histórias e contexto
            - Adicione sub-tópicos em CADA seção
            - Desenvolva MUITO mais a introdução e conclusão
            - Use o formato [SEÇÃO] e "Eliseu 👤:" OBRIGATORIAMENTE
            
            🚫 REGRAS CRÍTICAS:
            ❌ PROIBIDO texto corrido sem formatação
            ❌ PROIBIDO omitir "Eliseu 👤:" antes de falas
            ❌ PROIBIDO omitir seções [ENTRE COLCHETES]
            ❌ PROIBIDO comentários finais sobre o roteiro
            
            ✅ USE o formato especificado acima OBRIGATORIAMENTE
            ✅ TERMINE com última fala do Eliseu
            ✅ PELO MENOS {min_words} PALAVRAS FALADAS!
            """
            
            retry_response = self.llm.invoke([HumanMessage(content=retry_prompt)])
            response = retry_response
        
        state["final_script"] = response.content
        state["messages"].append(response)
        return state
    
    def _format_videos(self, videos: List[Dict]) -> str:
        formatted = []
        for i, video in enumerate(videos[:5], 1):
            video_info = f"""
            {i}. {video['title']}
            - Views: {video['views']:,}
            - Likes: {video['likes']:,}
            - Canal: {video['channel']}
            - Engagement: {video.get('engagement_score', 0):.2f}%"""
            
            # Adiciona transcrição se disponível
            if video.get('has_transcript', False):
                transcript_preview = video.get('transcript_summary', '')[:300]
                video_info += f"""
            - ✅ TRANSCRIÇÃO DISPONÍVEL
            - Prévia do conteúdo: "{transcript_preview}..." """
            else:
                video_info += f"""
            - ❌ Sem transcrição disponível"""
                
            formatted.append(video_info)
        return '\n'.join(formatted)
    
    async def generate_script(self, videos: List[Dict], topic: str, target_minutes: int = 10, personality_prompt: str = None, model_provider: str = None) -> str:
        if not self.llm:
            provider_name = model_provider or self.model_provider
            return f"Error: {provider_name.upper()} API não está disponível. Por favor configure as chaves de API."
        
        initial_state = ScriptState(
            videos=videos,
            topic=topic,
            target_minutes=target_minutes,
            personality_prompt=personality_prompt or "",
            model_provider=model_provider or self.model_provider,
            trends=[],
            script_structure={},
            raw_script="",
            final_script="",
            messages=[]
        )
        
        result = await self.graph.ainvoke(initial_state)
        return result["final_script"]