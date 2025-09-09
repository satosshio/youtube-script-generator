# YouTube Script Generator 🎬

Aplicativo que utiliza multiagentes com LangGraph para gerar roteiros de vídeo baseados em tendências do YouTube.

## Funcionalidades

- 🔍 Busca vídeos em alta sobre qualquer tópico
- 🤖 Sistema multiagente inteligente (Pesquisador, Analista, Roteirista, Eliseu, Revisor)
- ✨ Geração automática de roteiros personalizados
- 🎨 Interface moderna em dark mode
- 📊 Análise de métricas (views, likes) dos vídeos

## Tecnologias

**Backend:**
- FastAPI
- LangGraph
- YouTube Data API v3
- OpenAI GPT-4

**Frontend:**
- React + Vite
- TailwindCSS
- Axios
- Lucide Icons

## Instalação

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
```

Crie um arquivo `.env` baseado no `.env.example`:
```
YOUTUBE_API_KEY=sua_chave_youtube
OPENAI_API_KEY=sua_chave_openai
```

Inicie o servidor:
```bash
python main.py
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

## Como Usar

1. Acesse http://localhost:5173
2. Digite um tópico na barra de pesquisa
3. O sistema irá:
   - Buscar vídeos em alta sobre o tópico
   - Analisar tendências e padrões
   - Gerar um roteiro completo no estilo Eliseu
4. Copie o roteiro gerado com um clique

## Arquitetura dos Agentes

1. **Agente Pesquisador**: Organiza e analisa dados dos vídeos
2. **Agente Analista**: Identifica tendências e tópicos-chave
3. **Agente Roteirista**: Cria estrutura profissional do roteiro
4. **Agente Eliseu**: Adapta o roteiro com linguagem informal e envolvente
5. **Agente Revisor**: Faz ajustes finais e garante qualidade

## APIs Necessárias

- **YouTube Data API v3**: [Console Google Cloud](https://console.cloud.google.com)
- **OpenAI API**: [OpenAI Platform](https://platform.openai.com)