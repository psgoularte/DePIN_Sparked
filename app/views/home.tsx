'use client';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Wifi, Shield, Database, CheckCircle2, ArrowRight, Activity, TrendingUp, GraduationCap, Users, Github, Linkedin, FileText, BookOpen } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { publicAPI } from '../../lib/api';
import { SensorMetrics, Sensor } from '../../lib/types'; // Import Sensor
import { supabase } from '../../lib/supabaseClient'; // Caminho corrigido para bater com sua imagem

interface HomePageProps {
  onGetStarted: () => void;
  // Removidas props desnecessárias, já que o componente usa 'useNavigate'
}

export function HomePage({ onGetStarted }: HomePageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [featuredSensors, setFeaturedSensors] = useState<SensorMetrics[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [visibleCount, setVisibleCount] = useState(0);

  // Definições de 'steps' e 'features' movidas para fora do return
  const steps = [
    { number: 1, title: 'Conectar', description: 'Crie sua conta' },
    { number: 2, title: 'Registrar', description: 'Registre seus sensores IoT' },
    { number: 3, title: 'Transmitir', description: 'Envie dados verificáveis' },
    { number: 4, title: 'Auditar', description: 'Verifique na blockchain' },
  ];

  const features = [
    {
      icon: <Wifi className="w-6 h-6" />,
      title: 'Streaming em Tempo Real',
      description: 'Dados de sensor ao vivo com verificação criptográfica no nível do dispositivo',
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Ancoragem na Blockchain',
      description: 'Provas de integridade de datasets ancoradas na Solana para verificação imutável',
    },
    {
      icon: <Database className="w-6 h-6" />,
      title: 'Armazenamento Descentralizado',
      description: 'Sem dependência de nuvem centralizada - propriedade e proveniência total dos dados',
    },
  ];

  useEffect(() => {
    loadFeaturedSensors();
  }, []);

  // Real-time subscription for sensor changes
  useEffect(() => {
    const channel = supabase
      .channel('featured-sensor-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kv_store_4a89e1c9', // ATENÇÃO: Nome de tabela estranho
          filter: 'key=like.sensor:%',
        },
        () => {
          // Reload featured sensors when any sensor changes
          console.log('Sensor change detected, reloading featured sensors');
          loadFeaturedSensors();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadFeaturedSensors = async () => {
    try {
      setLoadingFeatured(true);
      setVisibleCount(0); // Reset progressive rendering
      const data = await publicAPI.getFeaturedSensors();
      console.log('Featured sensors loaded:', data.sensors?.length || 0);
      setFeaturedSensors(data.sensors || []);
      setLoadingFeatured(false);
      
      // Progressive rendering: reveal sensors one by one
      if (data.sensors && data.sensors.length > 0) {
        // CORREÇÃO: Trocado 'any' por 'SensorMetrics'
        data.sensors.forEach((_: SensorMetrics, index: number) => {
          setTimeout(() => {
            setVisibleCount(index + 1);
          }, index * 100); // 100ms delay between each card
        });
      }
    } catch (error) {
      console.error('Failed to load featured sensors:', error);
      setFeaturedSensors([]);
      setLoadingFeatured(false);
    }
  };

  const handleGetStarted = () => {
    if (user) {
      onGetStarted(); // Chama a função do 'app-routes'
    } else {
      // Se não houver usuário, o 'app-routes' já o mantém na home.
      // A prop onGetStarted (do 'app-routes') pode abrir o modal de login.
      onGetStarted();
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span className="text-sm" style={{ color: 'var(--primary)' }}>
              Infraestrutura Web3 para Validação de Dados IoT
            </span>
          </div>
          
          <h1 className="mb-6" style={{ fontSize: '2.5rem', fontWeight: 600, lineHeight: '1.2', color: 'var(--text-primary)' }}>
            Transforme Sensores do Mundo Real em
            <br />
            <span className="text-primary">Streams de Dados Verificáveis</span>
          </h1>
          
          <p className="mb-8 max-w-2xl mx-auto text-lg" style={{ color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            Sparked Sense conecta sensores IoT diretamente à blockchain Solana, transformando medições físicas em dados auditáveis e economicamente valiosos sem intermediários centralizados.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Button 
              onClick={handleGetStarted}
              size="lg"
              className="bg-primary text-primary-foreground"
            >
              {user ? 'Ir para o Dashboard' : 'Conectar para Começar'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button 
              variant="outline"
              size="lg"
              className="border-primary/50 hover:bg-primary/5"
              onClick={() => navigate('/public-sensors')}
            >
              <Database className="w-4 h-4" />
              Ver Sensores Públicos
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Public Sensors */}
      {featuredSensors.length > 0 && (
        <section className="px-4 py-16 border-t border-border">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Sensores Públicos em Destaque
                </h2>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Principais sensores verificados da nossa infraestrutura
                </p>
              </div>
              <Button 
                variant="outline"
                onClick={() => navigate('/public-sensors')}
              >
                Ver Todos
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {loadingFeatured ? (
                [1, 2, 3].map((i) => (
                  <Card key={i} className="p-6 animate-pulse">
                    <div className="h-48 bg-muted rounded mb-4"></div>
                    <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                    <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </Card>
                ))
              ) : (
                featuredSensors.map((sensor, index) => (
                  <div
                    key={sensor.id}
                    className={`transition-all duration-500 ${
                      index < visibleCount 
                        ? 'opacity-100 translate-y-0' 
                        : 'opacity-0 translate-y-4'
                    }`}
                  >
                    <Card 
                      className="p-6 bg-card border-border hover:border-primary/50 transition-all duration-200 cursor-pointer"
                      onClick={() => navigate(`/audit?sensor=${sensor.id}`)}
                    >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Activity className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                        </div>
                        <div>
                          <h3 style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                            {sensor.name}
                          </h3>
                          <Badge variant="outline" style={{ textTransform: 'uppercase', fontSize: '0.75rem' }}>
                            {sensor.type}
                          </Badge>
                        </div>
                      </div>
                      <div className={`w-2 h-2 rounded-full ${
                        sensor.status === 'active' ? 'bg-success' : 'bg-[#4A4F59]'
                      }`}></div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-t border-border">
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                          Datasets Públicos
                        </span>
                        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                          {sensor.publicDatasetsCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-t border-border">
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                          Total Verificado
                        </span>
                        <div className="flex items-center gap-2">
                          {(sensor.totalVerified || 0) > 0 && (
                            <Shield className="w-3 h-3" style={{ color: 'var(--success)' }} />
                          )}
                          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                            {sensor.totalVerified || 0}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between py-2 border-t border-border">
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                          Total de Leituras
                        </span>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-3 h-3" style={{ color: 'var(--primary)' }} />
                          <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                            {sensor.totalReadingsCount.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button 
                      size="sm"
                      className="w-full mt-4 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
                      // CORREÇÃO: Adicionado tipo 'React.MouseEvent' ao 'e'
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        navigate(`/audit?sensor=${sensor.id}`);
                      }}
                    >
                      Ver & Auditar
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Card>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="px-4 py-16 border-t border-border bg-card/30">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-center mb-12" style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Como Funciona
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <div key={step.number} className="relative">
                <Card className="p-6 bg-card border-border text-center h-full">
                  <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center mx-auto mb-4" style={{ fontWeight: 600 }}>
                    {step.number}
                  </div>
                  <h3 className="mb-2" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {step.title}
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {step.description}
                  </p>
                </Card>
                {index < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-6 h-6 text-primary/50" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-center mb-4" style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Uma Infraestrutura Aberta para Dados Físicos Verificáveis
          </h2>
          <p className="text-center mb-12 max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Sparked Sense une dispositivos IoT, redes descentralizadas e sistemas abertos de inteligência ambiental
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 bg-card border-border hover:border-primary/50 transition-all duration-200">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center text-primary mb-4">
                  {feature.icon}
                </div>
                <h3 className="mb-2" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {feature.title}
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Research Foundation */}
      <section className="px-4 py-16 border-t border-border bg-card/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="mb-3" style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              <span style={{ color: 'var(--text-muted)' }}>//</span> Fundação de Pesquisa
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Construído sobre pesquisa acadêmica rigorosa e validação científica
            </p>
          </div>

          {/* Academic Partners Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6 bg-card border-border">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="mb-1" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    Parceiros Acadêmicos
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Colaboração com instituições de pesquisa líderes mundialmente
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card border-border">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="mb-1" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    Revisado por Pares
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Artigos de pesquisa publicados em conferências de blockchain e IoT
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card border-border">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="mb-1" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    Ciência Aberta
                  </h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Metodologia transparente e resultados reproduzíveis
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Research Partnerships */}
          <Card className="p-6 bg-card border-border mb-8">
            <h3 className="mb-4" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              Parcerias de Pesquisa
            </h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Parcerias em discussão para expandir o desenvolvimento científico e a cobertura de sensores
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
                <div className="flex-1">
                  <h4 style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    Laboratórios Universitários
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Expandindo o desenvolvimento científico por trás da infraestrutura
                  </p>
                </div>
                <Badge variant="outline" className="bg-accent/20 text-accent border-accent/30">
                  Em Discussão
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
                <div className="flex-1">
                  <h4 style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    Desenvolvedores IoT
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Validação da cobertura de sensores e desenvolvimento de casos de uso
                  </p>
                </div>
                <Badge variant="outline" className="bg-success/20 text-success border-success/30">
                  Formando Parcerias
                </Badge>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border">
                <div className="flex-1">
                  <h4 style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                    Ecossistema DePIN
                  </h4>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Integração com redes de infraestrutura física descentralizada
                  </p>
                </div>
                <Badge variant="outline" className="bg-secondary/20 text-secondary border-secondary/30">
                  Explorando
                </Badge>
              </div>
            </div>
          </Card>

          {/* Scientific Advisors */}
          <div className="mb-4">
            <h3 className="mb-6" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              Conselheiros Científicos
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Prof. Dr. Eduardo Zancul */}
            <Card className="p-6 bg-card border-border">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="mb-1" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    Prof. Dr. Eduardo Zancul
                  </h3>
                  <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Conselheiro Científico
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Professor Associado da Universidade de São Paulo (USP)
                </p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Coordenador do Laboratório Future Factory 4.0 • PhD em Engenharia de Produção
                </p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Orientando a validação metodológica e técnica para o Sparked Sense
                </p>
              </div>
            </Card>

            {/* Otávio Vacari */}
            <Card className="p-6 bg-card border-border">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="mb-1" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    Otávio Vacari
                  </h3>
                  <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Conselheiro Técnico
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Engenharia da Computação (Poli-USP) e atual mestrando na mesma instituição
                </p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Trabalhando em projetos acadêmicos investigando criptografia aplicada, sistemas distribuídos e suas otimizações
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Core Team */}
      <section className="px-4 py-16 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="mb-3" style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              <span style={{ color: 'var(--text-muted)' }}>//</span> Time Principal
            </h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Construtores experientes combinando rigor acadêmico com expertise da indústria
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Vinicio Mendes */}
            <Card className="p-6 bg-card border-border">
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/20 mb-3">
                  <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--primary)' }}>VM</span>
                </div>
                <h3 className="mb-1" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  Vinicio Mendes
                </h3>
                <p className="text-sm mb-3" style={{ color: 'var(--primary)' }}>
                  Criador do Projeto & Líder de Produto
                </p>
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  Engenharia de Produção (POLI-USP) • Ex-Fundador de 2 startups educacionais • 3+ anos de experiência em desenvolvimento de produtos
                </p>
              </div>
              <div className="mb-4 pb-4 border-b border-border">
                <p className="text-xs mb-2" style={{ color: 'var(--success)' }}>
                  Expertise
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">Pesquisador de Blockchain</Badge>
                  <Badge variant="outline" className="text-xs">Designer de Produto</Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Github className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Linkedin className="w-4 h-4" />
                </Button>
              </div>
            </Card>

            {/* Nicolas Gabriel */}
            <Card className="p-6 bg-card border-border">
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/20 mb-3">
                  <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--primary)' }}>NG</span>
                </div>
                <h3 className="mb-1" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  Nicolas Gabriel
                </h3>
                <p className="text-sm mb-3" style={{ color: 'var(--primary)' }}>
                  Criador do Projeto & Líder de Desenvolvimento
                </p>
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  Engenharia da Computação (UFMT) • Ex-Fundador de 2 startups educacionais • Desenvolvedor Full-Stack Pleno
                </p>
              </div>
              <div className="mb-4 pb-4 border-b border-border">
                <p className="text-xs mb-2" style={{ color: 'var(--success)' }}>
                  Expertise
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">Desenvolvedor Full-Stack</Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Github className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Linkedin className="w-4 h-4" />
                </Button>
              </div>
            </Card>

            {/* Pedro Goularte */}
            <Card className="p-6 bg-card border-border">
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/20 mb-3">
                  <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--primary)' }}>PG</span>
                </div>
                <h3 className="mb-1" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  Pedro Goularte
                </h3>
                <p className="text-sm mb-3" style={{ color: 'var(--primary)' }}>
                  Criador do Projeto & Líder de Infraestrutura
                </p>
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  Engenharia da Computação (POLI-USP) • Especializado em infraestrutura descentralizada
                </p>
              </div>
              <div className="mb-4 pb-4 border-b border-border">
                <p className="text-xs mb-2" style={{ color: 'var(--success)' }}>
                  Expertise
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">Sistemas Distribuídos</Badge>
                  <Badge variant="outline" className="text-xs">Infraestrutura</Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Github className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Linkedin className="w-4 h-4" />
                </Button>
              </div>
            </Card>

            {/* Paulo Ricardo */}
            <Card className="p-6 bg-card border-border">
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/20 mb-3">
                  <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--primary)' }}>PR</span>
                </div>
                <h3 className="mb-1" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  Paulo Ricardo
                </h3>
                <p className="text-sm mb-3" style={{ color: 'var(--primary)' }}>
                  Criador do Projeto & Líder de Comunicação
                </p>
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  Engenheiro de Produção (UFJF), especializado em gerenciamento de projetos e produtos, e comunicação institucional
                </p>
              </div>
              <div className="mb-4 pb-4 border-b border-border">
                <p className="text-xs mb-2" style={{ color: 'var(--success)' }}>
                  Expertise
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-xs">Gerenciamento de Projetos</Badge>
                  <Badge variant="outline" className="text-xs">Comunicação</Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Github className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <Linkedin className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 border-t border-border bg-card/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="mb-4" style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Pronto para Começar?
          </h2>
          <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>
            Conecte sua carteira e registre seu primeiro sensor em minutos
          </p>
          <Button 
            onClick={onGetStarted}
            size="lg"
            className="bg-primary text-primary-foreground"
          >
            Conectar Carteira
          </Button>
        </div>
      </section>
    </div>
  );
}