import { useState, useEffect } from 'react';
import { Search, Loader2, Video, Eye, ThumbsUp, FileText, Calendar, Clock, Filter, Timer, User, Play, TrendingUp, Zap, Settings } from 'lucide-react';
import { AuthProvider, useAuth } from './AuthContext';
import Auth from './components/Auth';
import Header from './components/Header';
import { api } from './api';

function AppContent() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          <p className="text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }
  const [topic, setTopic] = useState('');
  const [videos, setVideos] = useState([]);
  const [script, setScript] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingScript, setLoadingScript] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentAgent, setCurrentAgent] = useState('');
  const [agentDescription, setAgentDescription] = useState('');
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [error, setError] = useState('');
  
  // New state for date filtering
  const [searchMode, setSearchMode] = useState('general'); // 'general', 'recent', 'dateRange'
  const [recentDays, setRecentDays] = useState(7);
  const [dateAfter, setDateAfter] = useState('');
  const [dateBefore, setDateBefore] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // New state for script customization
  const [targetMinutes, setTargetMinutes] = useState(15);
  const [useEliseuStyle, setUseEliseuStyle] = useState(true);
  const [personalityPrompt, setPersonalityPrompt] = useState('');
  const [showCustomStyleModal, setShowCustomStyleModal] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  
  // New state for AI model selection
  const [modelProvider, setModelProvider] = useState('gpt-4.1'); // 'gpt-4.1', 'gpt-5', 'claude-sonnet-4', 'claude-opus-4.1'

  const placeholders = [
    "Ex: Jovem e engraçado, com gírias atuais",
    "Ex: Profissional, objetivo e formal", 
    "Ex: Inspirador, motivacional e envolvente",
    "Ex: Casual, descontraído e próximo"
  ];

  // Rotate placeholder every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Function to extract time estimates from script
  const extractTimeEstimates = (script) => {
    // Try to extract the timing info that the backend generates
    const timePattern = /📅 TEMPO ESTIMADO DE LEITURA:\s*🐌 Lenta \(130 wpm\): (\d{2}:\d{2})\s*🎯 Normal \(155 wpm\): (\d{2}:\d{2})\s*🚀 Rápida \(184 wpm\): (\d{2}:\d{2})/;
    const match = script.match(timePattern);
    
    if (match) {
      return {
        slow: match[1],
        normal: match[2], 
        fast: match[3]
      };
    }

    // Fallback: calculate from word count if timing info not found
    const wordCount = countSpokenWords(script);
    
    return {
      slow: formatTime(Math.round((wordCount / 130) * 60)),
      normal: formatTime(Math.round((wordCount / 155) * 60)), 
      fast: formatTime(Math.round((wordCount / 184) * 60))
    };
  };

  // Function to count spoken words (exclude stage directions)
  const countSpokenWords = (text) => {
    if (!text) return 0;
    
    // Simple approach: count all words except obvious metadata
    let cleanText = text;
    
    // Remove [stage directions] and (instructions)
    cleanText = cleanText.replace(/\[.*?\]/g, '');
    cleanText = cleanText.replace(/\(.*?\)/g, '');
    
    // Remove emoji lines and metadata
    cleanText = cleanText.replace(/^[📅🐌🎯🚀📈🎬👤🔍🎙️📊✍️✅❌⚠️🚨].*$/gm, '');
    
    // Remove markdown headers
    cleanText = cleanText.replace(/^#+.*$/gm, '');
    
    // Remove section headers
    cleanText = cleanText.replace(/^(GANCHO|INTRODUÇÃO|DESENVOLVIMENTO|CLÍMAX|CONCLUSÃO|CTA|REGRAS|ESTRATÉGIAS|FORMATO):.*/gm, '');
    
    // Remove lines that are clearly not speech
    cleanText = cleanText.replace(/^---+$/gm, '');
    cleanText = cleanText.replace(/^\d+\.\s+/gm, ''); // Remove numbered lists
    cleanText = cleanText.replace(/^[-•]\s+/gm, ''); // Remove bullet points
    
    // Count all remaining words
    const words = cleanText.trim().split(/\s+/).filter(word => word.length > 0);
    
    // If we got less than 100 words (seems too short), try a simpler approach
    if (words.length < 100) {
      // Fallback: count approximately based on script length
      // Assume average of 5 characters per word including spaces
      const estimatedWords = Math.round(text.length / 6);
      // Cap it to something reasonable (10-20 minutes of speech)
      return Math.min(Math.max(estimatedWords, 1000), 3000);
    }
    
    return words.length;
  };

  // Helper to format seconds to MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const searchVideos = async () => {
    if (!topic.trim()) {
      setError('Por favor, digite um assunto para pesquisar');
      return;
    }

    setLoading(true);
    setIsGenerating(true);
    setError('');
    setVideos([]);
    setScript('');

    try {
      let response;
      let endpoint = '/api/search-videos';
      let payload = {
        topic: topic,
        max_results: 10
      };

      // Choose endpoint based on search mode
      if (searchMode === 'recent') {
        endpoint = '/api/search-trending-recent';
        payload.days = recentDays;
      } else if (searchMode === 'dateRange') {
        endpoint = '/api/search-videos-by-date';
        if (dateAfter) payload.published_after = dateAfter;
        if (dateBefore) payload.published_before = dateBefore;
      } else {
        endpoint = '/api/search-videos';
      }

      response = await api.post(endpoint, payload);
      // Ordenar vídeos por visualizações (maior primeiro) com fallback para 0
      const sortedVideos = response.data.sort((a, b) => (b.views || 0) - (a.views || 0));
      setVideos(sortedVideos);
      
      if (sortedVideos.length > 0) {
        generateScript(sortedVideos);
      }
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erro ao buscar vídeos. Verifique sua conexão e tente novamente.';
      setError(errorMsg);
      setIsGenerating(false); // Resetar em caso de erro
      console.error('Erro:', error);
    } finally {
      setLoading(false);
      // isGenerating será resetado apenas após completar a geração do script ou em caso de erro
    }
  };

  const generateScript = async (videoList) => {
    setLoadingScript(true);
    setCurrentAgent('🚀 Iniciando');
    setAgentDescription('Preparando sistema...');
    setProgressPercentage(0);
    
    // Define os agentes e seus tempos estimados
    const agents = [
      { name: '🔍 Pesquisador', description: 'Analisando vídeos em alta...', percentage: 20, delay: 2000 },
      { name: '📊 Analista', description: 'Identificando tendências virais...', percentage: 40, delay: 3000 },
      { name: '✍️ Roteirista', description: 'Criando estrutura do roteiro...', percentage: 60, delay: 4000 },
      { name: '🎙️ Eliseu', description: 'Aplicando estilo e personalidade...', percentage: 80, delay: 3000 },
      { name: '✅ Revisor', description: 'Finalizando e ajustando tempo...', percentage: 95, delay: 2000 }
    ];
    
    try {
      const payload = {
        topic: topic,
        videos: videoList,
        target_minutes: targetMinutes,
        model_provider: modelProvider
      };
      
      // Add personality prompt only if using custom style
      if (!useEliseuStyle && personalityPrompt.trim()) {
        payload.personality_prompt = personalityPrompt.trim();
      }
      
      // Inicia a requisição do script
      const scriptPromise = api.post('/api/generate-script', payload);
      
      // Simula progresso através dos agentes
      for (const agent of agents) {
        setCurrentAgent(agent.name);
        setAgentDescription(agent.description);
        
        // Anima a progress bar suavemente
        const startPercentage = agent.percentage - 20;
        const steps = 20;
        for (let i = 0; i <= steps; i++) {
          const progress = startPercentage + (agent.percentage - startPercentage) * (i / steps);
          setProgressPercentage(Math.round(progress));
          await new Promise(resolve => setTimeout(resolve, agent.delay / steps));
        }
      }
      
      // Aguarda o script real
      const response = await scriptPromise;
      
      // Finaliza com 100%
      setCurrentAgent('🎉 Concluído');
      setAgentDescription('Roteiro pronto!');
      setProgressPercentage(100);
      
      setScript(response.data.script);
      
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erro ao gerar roteiro. Tente novamente.';
      setError(errorMsg);
      setIsGenerating(false);
      console.error('Erro:', error);
    } finally {
      setLoadingScript(false);
      setTimeout(() => {
        setIsGenerating(false);
        setProgressPercentage(0);
      }, 1000);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <>
      <Header />
      <div className="min-h-screen relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-dark-950 via-dark-900 to-dark-950"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-900/20 via-transparent to-transparent"></div>
        
        <div className="relative z-10">

        <div className="container mx-auto px-6 py-12 max-w-7xl">
          {/* Simplified Header */}
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-200 mb-2">
              Gerador de Roteiros com IA
            </h1>
            <p className="text-gray-400 mb-6">
              Pesquise um tópico e gere roteiros baseados em vídeos em alta
            </p>
          </div>

            {/* Main Search Bar */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ex: tecnologia, receitas, negócios, fitness..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchVideos()}
                  className="w-full bg-dark-800/80 backdrop-blur-xl border-2 border-dark-600/50 rounded-2xl px-8 py-5 text-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:border-primary-500/80 focus:ring-4 focus:ring-primary-500/20 transition-all duration-300 hover:border-dark-500/60 shadow-2xl pr-32"
                  disabled={loading || loadingScript}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-3">
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className={`p-3 rounded-xl hover:bg-dark-700/50 transition-all duration-200 ${showAdvanced ? 'text-primary-400 bg-primary-500/10' : 'text-gray-400'}`}
                    disabled={loading || loadingScript}
                    title="Filtros Avançados"
                  >
                    <Filter className="w-5 h-5" />
                  </button>
                  <button
                    onClick={searchVideos}
                    disabled={loading || loadingScript}
                    className="bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-xl hover:shadow-primary-500/30 flex items-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        <span className="hidden sm:block">Gerar Roteiro</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Controls Section - Prominent Card or Loading State */}
          <div className="max-w-4xl mx-auto mb-8">
            {isGenerating ? (
              /* Loading State with Progress Bar */
              <div className="card-premium">
                <div className="flex flex-col items-center justify-center py-12">
                  {/* Agent Icon with Animation */}
                  <div className="relative mb-6">
                    <div className="text-6xl animate-pulse">
                      {currentAgent.split(' ')[0] || '🚀'}
                    </div>
                  </div>
                  
                  {/* Current Agent Name */}
                  <h3 className="text-2xl font-bold text-gray-200 mb-2">
                    {currentAgent || 'Processando...'}
                  </h3>
                  
                  {/* Agent Description */}
                  <p className="text-gray-400 mb-8 text-center max-w-md">
                    {agentDescription || 'Preparando sistema...'}
                  </p>
                  
                  {/* Progress Bar Container */}
                  <div className="w-full max-w-2xl mb-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-2">
                      <span>Progresso</span>
                      <span>{progressPercentage}%</span>
                    </div>
                    
                    {/* Progress Bar Background */}
                    <div className="w-full bg-dark-800/50 rounded-full h-3 overflow-hidden">
                      {/* Progress Bar Fill */}
                      <div 
                        className="h-full bg-gradient-to-r from-primary-600 to-primary-500 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
                        style={{ width: `${progressPercentage}%` }}
                      >
                        {/* Shimmer Effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Agent Steps Indicators */}
                  <div className="flex items-center gap-3 mt-6">
                    {['Pesquisador', 'Analista', 'Roteirista', 'Eliseu', 'Revisor'].map((agent, index) => {
                      const stepPercentage = (index + 1) * 20;
                      const isActive = progressPercentage >= stepPercentage - 10 && progressPercentage <= stepPercentage + 10;
                      const isCompleted = progressPercentage > stepPercentage;
                      
                      return (
                        <div 
                          key={agent}
                          className={`
                            w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                            ${isCompleted ? 'bg-success-500/20 text-success-400 scale-90' : 
                              isActive ? 'bg-primary-500/20 text-primary-400 scale-110 animate-pulse' : 
                              'bg-dark-800/50 text-gray-600'}
                          `}
                        >
                          {index + 1}
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="mt-8 flex items-center gap-3 text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <Timer className="w-4 h-4" />
                      <span>{targetMinutes} minutos</span>
                    </div>
                    <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{useEliseuStyle ? 'Estilo Eliseu' : 'Estilo Personalizado'}</span>
                    </div>
                    <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      <span>
                        {modelProvider === 'gpt-4.1' ? 'GPT-4.1' : 
                         modelProvider === 'gpt-5' ? 'GPT-5' :
                         modelProvider === 'claude-sonnet-4' ? 'Claude Sonnet 4' :
                         'Claude Opus 4.1'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Normal Controls Card */
              <div className="card-premium">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20">
                    <Settings className="w-5 h-5 text-gradient" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-200">Personalizar Roteiro</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:divide-x lg:divide-dark-700/30">
                  {/* Duration Slider - Enhanced */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-success-500/10">
                        <Timer className="w-4 h-4 text-success-400" />
                      </div>
                      <span className="font-semibold text-gray-300">Duração do Vídeo</span>
                    </div>
                    
                    {/* Prominent Duration Display */}
                    <div className="text-center mb-6">
                      <div className="text-3xl font-bold bg-gradient-to-r from-primary-400 via-primary-500 to-accent-500 bg-clip-text text-transparent mb-1">
                        {targetMinutes} min
                      </div>
                      <div className="text-sm text-gray-400">
                        ~{targetMinutes * 155} palavras estimadas
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <input
                        type="range"
                        min="3"
                        max="30"
                        step="1"
                        value={targetMinutes}
                        onChange={(e) => setTargetMinutes(parseInt(e.target.value))}
                        className="w-full h-2 bg-dark-700/50 rounded-lg appearance-none cursor-pointer slider-thumb"
                        style={{
                          background: `linear-gradient(to right, 
                            rgb(59 130 246) 0%, 
                            rgb(59 130 246) ${((targetMinutes - 3) / (30 - 3)) * 100}%, 
                            rgb(75 85 99 / 0.5) ${((targetMinutes - 3) / (30 - 3)) * 100}%, 
                            rgb(75 85 99 / 0.5) 100%)`
                        }}
                      />
                      <div className="flex justify-between text-xs font-semibold">
                        <span className={`px-2 py-1 rounded-full ${targetMinutes <= 5 ? 'text-primary-400 bg-primary-500/10' : 'text-gray-500'}`}>3min</span>
                        <span className={`px-2 py-1 rounded-full ${targetMinutes >= 13 && targetMinutes <= 17 ? 'text-primary-400 bg-primary-500/10' : 'text-gray-500'}`}>15min</span>
                        <span className={`px-2 py-1 rounded-full ${targetMinutes >= 28 ? 'text-primary-400 bg-primary-500/10' : 'text-gray-500'}`}>30min</span>
                      </div>
                    </div>
                  </div>

                  {/* AI Model Selection */}
                  <div className="space-y-4 lg:pl-8 mb-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-primary-500/10">
                        <Zap className="w-4 h-4 text-primary-400" />
                      </div>
                      <span className="font-semibold text-gray-300">Modelo de IA</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {/* GPT-4.1 Option */}
                      <button
                        onClick={() => setModelProvider('gpt-4.1')}
                        className={`p-4 rounded-xl border-2 text-left transition-all duration-300 ${
                          modelProvider === 'gpt-4.1'
                            ? 'border-primary-500 bg-primary-500/10 shadow-lg shadow-primary-500/20' 
                            : 'border-dark-700/50 bg-dark-800/30 hover:border-dark-600/60 hover:bg-dark-800/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-green-400 font-bold text-xs">4.1</span>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-200 mb-1 text-sm">GPT-4.1</h3>
                            <p className="text-xs text-gray-400 leading-relaxed">
                              Modelo mais recente e poderoso da OpenAI
                            </p>
                          </div>
                          {modelProvider === 'gpt-4.1' && (
                            <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          )}
                        </div>
                      </button>

                      {/* GPT-5 Option */}
                      <button
                        onClick={() => setModelProvider('gpt-5')}
                        className={`p-4 rounded-xl border-2 text-left transition-all duration-300 ${
                          modelProvider === 'gpt-5'
                            ? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/20' 
                            : 'border-dark-700/50 bg-dark-800/30 hover:border-dark-600/60 hover:bg-dark-800/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-purple-400 font-bold text-xs">5</span>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-200 mb-1 text-sm">GPT-5</h3>
                            <p className="text-xs text-gray-400 leading-relaxed">
                              Próxima geração com capacidades avançadas
                            </p>
                          </div>
                          {modelProvider === 'gpt-5' && (
                            <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          )}
                        </div>
                      </button>

                      {/* Claude Sonnet 4 Option */}
                      <button
                        onClick={() => setModelProvider('claude-sonnet-4')}
                        className={`p-4 rounded-xl border-2 text-left transition-all duration-300 ${
                          modelProvider === 'claude-sonnet-4'
                            ? 'border-orange-500 bg-orange-500/10 shadow-lg shadow-orange-500/20' 
                            : 'border-dark-700/50 bg-dark-800/30 hover:border-dark-600/60 hover:bg-dark-800/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-orange-400 font-bold text-xs">S4</span>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-200 mb-1 text-sm">Claude Sonnet 4</h3>
                            <p className="text-xs text-gray-400 leading-relaxed">
                              Modelo equilibrado e eficiente da Anthropic
                            </p>
                          </div>
                          {modelProvider === 'claude-sonnet-4' && (
                            <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          )}
                        </div>
                      </button>

                      {/* Claude Opus 4.1 Option */}
                      <button
                        onClick={() => setModelProvider('claude-opus-4.1')}
                        className={`p-4 rounded-xl border-2 text-left transition-all duration-300 ${
                          modelProvider === 'claude-opus-4.1'
                            ? 'border-accent-500 bg-accent-500/10 shadow-lg shadow-accent-500/20' 
                            : 'border-dark-700/50 bg-dark-800/30 hover:border-dark-600/60 hover:bg-dark-800/50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-cyan-400 font-bold text-xs">O4</span>
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-200 mb-1 text-sm">Claude Opus 4.1</h3>
                            <p className="text-xs text-gray-400 leading-relaxed">
                              Modelo mais poderoso da Anthropic
                            </p>
                          </div>
                          {modelProvider === 'claude-opus-4.1' && (
                            <div className="w-5 h-5 rounded-full bg-accent-500 flex items-center justify-center flex-shrink-0">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          )}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Style Toggle - Clean */}
                  <div className="space-y-4 lg:pl-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-accent-500/10">
                        <User className="w-4 h-4 text-accent-400" />
                      </div>
                      <span className="font-semibold text-gray-300">Estilo de Apresentação</span>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Style Options */}
                      <div className="grid grid-cols-1 gap-3">
                        {/* Eliseu Style - Default */}
                        <button
                          onClick={() => setUseEliseuStyle(true)}
                          className={`p-4 rounded-xl border-2 text-left transition-all duration-300 ${
                            useEliseuStyle 
                              ? 'border-primary-500 bg-primary-500/10 shadow-lg shadow-primary-500/20' 
                              : 'border-dark-700/50 bg-dark-800/30 hover:border-dark-600/60 hover:bg-dark-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-8 h-8 rounded-full overflow-hidden ring-1 ${useEliseuStyle ? 'ring-primary-500/50' : 'ring-dark-600/50'}`}>
                              <img
                                src="/eliseu-manica.jpg"
                                alt="Eliseu Style"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div>
                              <span className={`font-semibold ${useEliseuStyle ? 'text-primary-300' : 'text-gray-300'}`}>
                                Estilo Eliseu
                              </span>
                              <div className={`text-xs ${useEliseuStyle ? 'text-primary-400/80' : 'text-gray-500'}`}>
                                Tom pessoal, carismático e próximo
                              </div>
                            </div>
                          </div>
                        </button>
                        
                        {/* Custom Style */}
                        <button
                          onClick={() => {
                            setUseEliseuStyle(false);
                            setShowCustomStyleModal(true);
                          }}
                          className={`p-4 rounded-xl border-2 text-left transition-all duration-300 ${
                            !useEliseuStyle 
                              ? 'border-primary-500 bg-primary-500/10 shadow-lg shadow-primary-500/20' 
                              : 'border-dark-700/50 bg-dark-800/30 hover:border-dark-600/60 hover:bg-dark-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg ${!useEliseuStyle ? 'bg-primary-500/20' : 'bg-dark-700/50'}`}>
                              <Settings className={`w-4 h-4 ${!useEliseuStyle ? 'text-primary-400' : 'text-gray-400'}`} />
                            </div>
                            <div>
                              <span className={`font-semibold ${!useEliseuStyle ? 'text-primary-300' : 'text-gray-300'}`}>
                                Estilo Personalizado
                              </span>
                              <div className={`text-xs ${!useEliseuStyle ? 'text-primary-400/80' : 'text-gray-500'}`}>
                                {personalityPrompt ? 'Estilo customizado definido' : 'Defina seu próprio estilo'}
                              </div>
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Filters Modal */}
            {showAdvanced && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
                  onClick={() => setShowAdvanced(false)}
                />
                
                {/* Modal */}
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl mx-4 animate-scale-in">
                  <div className="card-premium">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-accent-500/10">
                          <Filter className="w-5 h-5 text-accent-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-200">Filtros Avançados</h3>
                      </div>
                      <button
                        onClick={() => setShowAdvanced(false)}
                        className="p-2 hover:bg-dark-800/50 rounded-lg transition-colors text-gray-400 hover:text-gray-300"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    {/* Search Mode Cards */}
                    <div className="mb-8">
                      <label className="block text-sm font-medium text-gray-300 mb-4">Tipo de Busca:</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button
                          onClick={() => setSearchMode('general')}
                          className={`group p-4 rounded-xl border-2 text-left transition-all duration-300 ${
                            searchMode === 'general' 
                              ? 'border-primary-500 bg-primary-500/10 shadow-lg shadow-primary-500/20' 
                              : 'border-dark-700/50 bg-dark-800/30 hover:border-dark-600/60 hover:bg-dark-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg ${searchMode === 'general' ? 'bg-primary-500/20' : 'bg-dark-700/50 group-hover:bg-dark-600/50'}`}>
                              <TrendingUp className={`w-4 h-4 ${searchMode === 'general' ? 'text-primary-400' : 'text-gray-400'}`} />
                            </div>
                            <span className={`font-semibold ${searchMode === 'general' ? 'text-primary-300' : 'text-gray-300'}`}>
                              Busca Geral
                            </span>
                          </div>
                          <p className={`text-xs ${searchMode === 'general' ? 'text-primary-400/80' : 'text-gray-500'}`}>
                            Todos os vídeos populares
                          </p>
                        </button>
                        
                        <button
                          onClick={() => setSearchMode('recent')}
                          className={`group p-4 rounded-xl border-2 text-left transition-all duration-300 ${
                            searchMode === 'recent' 
                              ? 'border-primary-500 bg-primary-500/10 shadow-lg shadow-primary-500/20' 
                              : 'border-dark-700/50 bg-dark-800/30 hover:border-dark-600/60 hover:bg-dark-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg ${searchMode === 'recent' ? 'bg-primary-500/20' : 'bg-dark-700/50 group-hover:bg-dark-600/50'}`}>
                              <Clock className={`w-4 h-4 ${searchMode === 'recent' ? 'text-primary-400' : 'text-gray-400'}`} />
                            </div>
                            <span className={`font-semibold ${searchMode === 'recent' ? 'text-primary-300' : 'text-gray-300'}`}>
                              Últimos Dias
                            </span>
                          </div>
                          <p className={`text-xs ${searchMode === 'recent' ? 'text-primary-400/80' : 'text-gray-500'}`}>
                            Vídeos recentes em alta
                          </p>
                        </button>
                        
                        <button
                          onClick={() => setSearchMode('dateRange')}
                          className={`group p-4 rounded-xl border-2 text-left transition-all duration-300 ${
                            searchMode === 'dateRange' 
                              ? 'border-primary-500 bg-primary-500/10 shadow-lg shadow-primary-500/20' 
                              : 'border-dark-700/50 bg-dark-800/30 hover:border-dark-600/60 hover:bg-dark-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg ${searchMode === 'dateRange' ? 'bg-primary-500/20' : 'bg-dark-700/50 group-hover:bg-dark-600/50'}`}>
                              <Calendar className={`w-4 h-4 ${searchMode === 'dateRange' ? 'text-primary-400' : 'text-gray-400'}`} />
                            </div>
                            <span className={`font-semibold ${searchMode === 'dateRange' ? 'text-primary-300' : 'text-gray-300'}`}>
                              Período Específico
                            </span>
                          </div>
                          <p className={`text-xs ${searchMode === 'dateRange' ? 'text-primary-400/80' : 'text-gray-500'}`}>
                            Escolha as datas
                          </p>
                        </button>
                      </div>
                    </div>

                    {/* Recent Days Filter */}
                    {searchMode === 'recent' && (
                      <div className="mb-6">
                        <label className="block text-sm font-medium mb-2">Últimos quantos dias:</label>
                        <select
                          value={recentDays}
                          onChange={(e) => setRecentDays(parseInt(e.target.value))}
                          className="input-primary w-full md:w-auto"
                        >
                          <option value={1}>1 dia</option>
                          <option value={3}>3 dias</option>
                          <option value={7}>7 dias</option>
                          <option value={14}>14 dias</option>
                          <option value={30}>30 dias</option>
                        </select>
                      </div>
                    )}

                    {/* Date Range Filter */}
                    {searchMode === 'dateRange' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                          <label className="block text-sm font-medium mb-2">De (opcional):</label>
                          <input
                            type="date"
                            value={dateAfter}
                            onChange={(e) => setDateAfter(e.target.value)}
                            className="input-primary w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Até (opcional):</label>
                          <input
                            type="date"
                            value={dateBefore}
                            onChange={(e) => setDateBefore(e.target.value)}
                            className="input-primary w-full"
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Action Button */}
                    <div className="flex justify-end pt-4 border-t border-dark-700/50">
                      <button
                        onClick={() => setShowAdvanced(false)}
                        className="btn-primary"
                      >
                        Aplicar Filtros
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Custom Style Modal */}
            {showCustomStyleModal && (
              <>
                {/* Backdrop */}
                <div 
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
                  onClick={() => setShowCustomStyleModal(false)}
                />
                
                {/* Modal */}
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg mx-4 animate-scale-in">
                  <div className="card-premium">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-accent-500/10">
                          <Settings className="w-5 h-5 text-accent-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-200">Estilo Personalizado</h3>
                      </div>
                      <button
                        onClick={() => setShowCustomStyleModal(false)}
                        className="p-2 hover:bg-dark-800/50 rounded-lg transition-colors text-gray-400 hover:text-gray-300"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    {/* Content */}
                    <div className="space-y-4">
                      <p className="text-sm text-gray-400">
                        Descreva como você quer que o roteiro seja escrito. Seja específico sobre tom, linguagem e estilo.
                      </p>
                      
                      <div className="space-y-3">
                        <textarea
                          value={personalityPrompt}
                          onChange={(e) => setPersonalityPrompt(e.target.value)}
                          placeholder={placeholders[placeholderIndex]}
                          className="w-full input-primary text-sm h-32 resize-none"
                          maxLength={300}
                        />
                        
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-500">
                            {personalityPrompt.length === 0 ? 'Campo opcional' : 'Estilo personalizado ativo'}
                          </span>
                          <span className={personalityPrompt.length > 250 ? 'text-warning-400' : 'text-gray-500'}>
                            {personalityPrompt.length}/300
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-6 border-t border-dark-700/50">
                      <button
                        onClick={() => {
                          setPersonalityPrompt('');
                          setUseEliseuStyle(true);
                          setShowCustomStyleModal(false);
                        }}
                        className="btn-ghost"
                      >
                        Usar Estilo Eliseu
                      </button>
                      <button
                        onClick={() => setShowCustomStyleModal(false)}
                        className="btn-primary"
                      >
                        Salvar Estilo
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {error && (
            <p className="text-red-400 mt-3 text-center text-sm animate-slide-up">{error}</p>
          )}

          {/* Results Section - More Compact */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
            {/* Videos Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary-500/10">
                    <Video className="w-5 h-5 text-primary-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-200">Vídeos Encontrados</h2>
                  {videos.length > 0 && (
                    <div className="flex items-center gap-1.5 ml-3">
                      <TrendingUp className="w-4 h-4 text-primary-400" />
                      <span className="text-xs text-gray-400 font-medium">Ordenados por visualizações</span>
                    </div>
                  )}
                </div>
                {videos.length > 0 && (
                  <div className="status-success">
                    {videos.length} {videos.length === 1 ? 'vídeo' : 'vídeos'}
                  </div>
                )}
              </div>
            
              {loading ? (
                <div className="card flex flex-col items-center justify-center h-64">
                  <div className="animate-spin">
                    <Loader2 className="w-12 h-12 text-primary-500" />
                  </div>
                  <p className="text-gray-400 mt-4 animate-pulse">Buscando vídeos...</p>
                </div>
              ) : videos.length > 0 ? (
                <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar">
                  {videos.map((video, index) => (
                    <div 
                      key={video.id} 
                      className="card group hover:shadow-lg hover:shadow-primary-500/10 transition-all duration-300 animate-slide-up relative"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {/* Ranking Badge */}
                      <div className={`absolute -top-2 -left-2 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm z-10 ${
                        index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-yellow-900' :
                        index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-gray-900' :
                        index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-orange-900' :
                        'bg-gradient-to-br from-dark-700 to-dark-800 text-gray-400'
                      }`}>
                        #{index + 1}
                      </div>
                      
                      <div className="flex gap-4">
                        <div className="relative overflow-hidden rounded-xl">
                          <img
                            src={video.thumbnail}
                            alt={video.title}
                            className="w-32 h-20 object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <Play className="absolute inset-0 m-auto w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-gray-200 mb-2 line-clamp-2 group-hover:text-primary-300 transition-colors duration-200">
                            {video.title}
                          </h3>
                          <p className="text-xs text-gray-500 mb-3 font-medium">
                            {video.channel}
                          </p>
                          
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5 bg-dark-800/50 rounded-lg px-2 py-1">
                              <Eye className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-300 font-medium">{formatNumber(video.views || 0)}</span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-dark-800/50 rounded-lg px-2 py-1">
                              <ThumbsUp className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-300 font-medium">{formatNumber(video.likes || 0)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <a
                        href={video.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary-400 hover:text-primary-300 text-xs mt-4 font-medium transition-colors duration-200"
                      >
                        Assistir no YouTube
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card text-center py-16">
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-primary-500/20 to-accent-500/20 rounded-2xl flex items-center justify-center mb-6">
                    <Video className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">Nenhum vídeo encontrado</h3>
                  <p className="text-sm text-gray-500">Faça uma pesquisa para descobrir conteúdos em alta!</p>
                </div>
              )}
          </div>

            {/* Script Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent-500/10">
                    <FileText className="w-5 h-5 text-accent-400" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-200">Roteiro Gerado</h2>
                </div>
                {script && (
                  <div className="status-success">
                    IA Powered
                  </div>
                )}
              </div>
              
              {isGenerating ? (
                <div className="card text-center py-16">
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-accent-500/20 to-primary-500/20 rounded-2xl flex items-center justify-center mb-6">
                    <FileText className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">Aguardando geração...</h3>
                  <p className="text-sm text-gray-500">Seu roteiro aparecerá aqui em instantes</p>
                </div>
              ) : script ? (
                <div className="card-premium animate-slide-up">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-success-400 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-success-400">Roteiro Completo</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Zap className="w-3 h-3" />
                      {targetMinutes} min solicitado
                    </div>
                  </div>
                  
                  {/* Time Estimates Display */}
                  {(() => {
                    const timeEstimates = extractTimeEstimates(script);
                    const wordCount = countSpokenWords(script);
                    return (
                      <div className="bg-dark-900/50 rounded-xl p-4 border border-dark-700/50 mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Clock className="w-4 h-4 text-primary-400" />
                          <span className="text-sm font-medium text-gray-200">Tempo Estimado de Leitura</span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                          <div className="bg-dark-800/60 rounded-lg p-3 border border-dark-700/30">
                            <div className="text-xs text-gray-400 mb-1">🐌 Lenta</div>
                            <div className="font-mono text-sm font-semibold text-blue-400">{timeEstimates.slow}</div>
                            <div className="text-xs text-gray-500">130 wpm</div>
                          </div>
                          <div className="bg-dark-800/60 rounded-lg p-3 border border-primary-500/20">
                            <div className="text-xs text-gray-400 mb-1">🎯 Normal</div>
                            <div className="font-mono text-sm font-semibold text-primary-400">{timeEstimates.normal}</div>
                            <div className="text-xs text-gray-500">155 wpm</div>
                          </div>
                          <div className="bg-dark-800/60 rounded-lg p-3 border border-dark-700/30">
                            <div className="text-xs text-gray-400 mb-1">🚀 Rápida</div>
                            <div className="font-mono text-sm font-semibold text-green-400">{timeEstimates.fast}</div>
                            <div className="text-xs text-gray-500">184 wpm</div>
                          </div>
                        </div>
                        <div className="text-center mt-3 pt-3 border-t border-dark-700/50">
                          <span className="text-xs text-gray-500">
                            📈 {wordCount.toLocaleString()} palavras faladas
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                  
                  <div className="bg-dark-900/50 rounded-xl p-6 border border-dark-700/50 mb-6 max-h-96 overflow-y-auto custom-scrollbar">
                    <div className="prose prose-invert max-w-none">
                      <div className="whitespace-pre-wrap text-gray-100 leading-relaxed text-sm">
                        {script}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => navigator.clipboard.writeText(script)}
                      className="btn-primary flex-1 flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copiar Roteiro
                    </button>
                    <button
                      onClick={() => {
                        const blob = new Blob([script], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `roteiro-${topic.replace(/\s+/g, '-').toLowerCase()}.txt`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="btn-secondary px-4"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="card text-center py-16">
                  <div className="mx-auto w-20 h-20 bg-gradient-to-br from-accent-500/20 to-primary-500/20 rounded-2xl flex items-center justify-center mb-6">
                    <FileText className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">Roteiro em espera</h3>
                  <p className="text-sm text-gray-500">Pesquise um tópico para gerar seu roteiro personalizado!</p>
                </div>
              )}
            </div>
          </div>
          </div>
        </div>
      </div>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
