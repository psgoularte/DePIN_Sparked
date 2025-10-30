'use client';
import { useState, useEffect } from 'react';
// Removido 'useSearchParams' de 'react-router-dom'
import { Dataset, Sensor } from '../../lib/types';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
// import { Label } from '../../components/ui/label'; // Removido, pois está redefinido abaixo
import { Copy, Check, CheckCircle2, ExternalLink, Shield, ArrowLeft, Mail, Info } from 'lucide-react';
import { publicAPI } from '../../lib/api';
import { toast } from 'sonner';

interface AuditPageProps {
  dataset?: Dataset;
  sensor?: Sensor;
  onBack: () => void;
}

export function AuditPage({ dataset: propDataset, sensor: propSensor, onBack }: AuditPageProps) {
  // const [searchParams] = useSearchParams(); // Removido
  const [dataset, setDataset] = useState<Dataset | null>(propDataset || null);
  const [sensor, setSensor] = useState<Sensor | null>(propSensor || null);
  const [loading, setLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [accessRequestOpen, setAccessRequestOpen] = useState(false);
  const [requestName, setRequestName] = useState('');
  const [requestEmail, setRequestEmail] = useState('');
  const [requestPrice, setRequestPrice] = useState('');
  const [verifyMerkleInput, setVerifyMerkleInput] = useState('');
  const [verifySingleHashInput, setVerifySingleHashInput] = useState('');

  // Lógica de carregamento de sensor público removida
  // pois os dados agora são passados via props pelo 'main-view.tsx'

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse" style={{ color: 'var(--text-primary)' }}>
          Carregando dados do sensor...
        </div>
      </div>
    );
  }

  if (!dataset || !sensor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <p style={{ color: 'var(--text-primary)' }}>Nenhum dataset disponível para auditoria</p>
          <Button onClick={onBack} className="mt-4" variant="outline">
            Voltar
          </Button>
        </Card>
      </div>
    );
  }

  const handleCopy = async (text: string, field: string) => {
    try {
      // Try modern clipboard API first
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      // Fallback for environments where Clipboard API is blocked
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) {
          setCopiedField(field);
          setTimeout(() => setCopiedField(null), 2000);
        }
      } catch (fallbackErr) {
        console.error('Failed to copy:', fallbackErr);
      }
    }
  };

  const handleVerify = () => {
    setVerifying(true);
    // Simulate verification process for last hour data
    setTimeout(() => {
      setVerifying(false);
      setVerified(true);
      toast.success('Dados da última hora verificados com sucesso!');
    }, 2000);
  };

  const handleAccessRequest = () => {
    if (!requestName || !requestEmail) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(requestEmail)) {
      toast.error('Por favor, insira um endereço de e-mail válido');
      return;
    }

    // Simulate request submission
    toast.info('Enviando solicitação de acesso ao dataset...');
    setTimeout(() => {
      toast.success('Solicitação enviada! O proprietário dos dados revisará sua solicitação em 24-48 horas.');
      setAccessRequestOpen(false);
      setRequestName('');
      setRequestEmail('');
      setRequestPrice('');
    }, 1500);
  };

  // Helper function to safely format dates
  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString();
  };

  const metadata = [
    { label: 'Nome do Dataset', value: dataset.name },
    { label: 'Sensor de Origem', value: sensor.name },
    { label: 'Tipo de Sensor', value: sensor.type.charAt(0).toUpperCase() + sensor.type.slice(1) },
    { label: 'Período de Tempo', value: `${formatDate(dataset.startDate)} - ${formatDate(dataset.endDate)}` },
    { label: 'Total de Leituras', value: dataset.readingsCount.toLocaleString() },
    { label: 'Criado em', value: formatDate(dataset.createdAt) },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-lg tracking-tight" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                SPARKED SENSE
              </h1>
            </div>
            <Badge variant="outline" className="bg-success/20 text-success border-success/30">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Auditoria Pública
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-6 -ml-2 hover:bg-muted"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        {/* Title */}
        <div className="mb-8 text-center">
          <h1 className="mb-3" style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Verificação de Dataset
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Página de verificação pública para dataset de sensor ancorado na blockchain
          </p>
        </div>

        {/* Metadata */}
        <Card className="p-8 bg-card border-border mb-6">
          <h2 className="mb-6 pb-4 border-b border-border" style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Metadados do Dataset
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {metadata.map((item, index) => (
              <div key={index}>
                <p className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>
                  {item.label}
                </p>
                <p style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* Public Dataset Info */}
        {/* A lógica 'publicSensorId' foi simplificada, assumindo que se estamos aqui, é relevante */}
        <Card className="p-4 bg-primary/5 border-primary/20 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                <strong>Preview de Dataset Público</strong>
              </p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Você está vendo um preview dos dados mais recentes. A verificação abaixo aplica-se apenas a este dataset de preview.
              </p>
              <Button
                size="sm"
                onClick={() => setAccessRequestOpen(true)}
                className="bg-primary text-primary-foreground"
              >
                <Mail className="w-4 h-4 mr-2" />
                Solicitar Acesso ao Dataset Completo
              </Button>
            </div>
          </div>
        </Card>

        {/* Blockchain Verification */}
        <Card className="p-8 bg-card border-border mb-6">
          <h2 className="mb-6 pb-4 border-b border-border" style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Verificação na Blockchain
          </h2>

          {/* Merkle Root Display */}
          <div className="mb-6">
            <Label className="mb-2 block text-sm" style={{ color: 'var(--text-muted)' }}>
              Merkle Root do Dataset
            </Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono p-3 rounded bg-muted/50 border border-border text-sm break-all" style={{ color: 'var(--text-primary)' }}>
                {dataset.merkleRoot || 'N/A (Dataset não ancorado)'}
              </code>
              {dataset.merkleRoot && (
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => handleCopy(dataset.merkleRoot || '', 'merkle')}
                  className="shrink-0 border-border"
                >
                  {copiedField === 'merkle' ? (
                    <Check className="w-4 h-4 text-success" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* View Proof Button */}
          <div className="mb-6">
            <Button
              variant="outline"
              className="w-full border-border hover:bg-muted"
              onClick={() => window.open('https://explorer.solana.com/', '_blank')}
              disabled={!dataset.merkleRoot}
            >
              Ver Prova dos Dados da Última Hora no Solana Explorer
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              Abre o Solana Explorer para inspecionar a Merkle root das leituras da última hora do dataset, ancorada na blockchain.
            </p>
          </div>

          {/* Verification Input Fields */}
          <div className="space-y-4 mb-6">
            <h3 className="mb-2" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              Verificar Integridade dos Dados
            </h3>
            
            {/* Hourly Data (Merkle Root) Verification */}
            <div className="space-y-2">
              <Label htmlFor="verify-merkle-root">
                Verificação de Dados da Hora (Merkle Root)
              </Label>
              <div className="flex gap-2">
                <Input
                  id="verify-merkle-root"
                  value={verifyMerkleInput}
                  onChange={(e) => setVerifyMerkleInput(e.target.value)}
                  placeholder="Cole a Merkle root para verificar..."
                  className="flex-1 bg-input border-border font-mono text-sm"
                />
                <Button
                  onClick={() => {
                    if (!verifyMerkleInput.trim()) {
                      toast.error('Por favor, insira uma Merkle root para verificar');
                      return;
                    }
                    if (verifyMerkleInput === dataset.merkleRoot) {
                      toast.success('Merkle root verificada! Os dados são autênticos.');
                    } else {
                      toast.error('Merkle root não confere');
                    }
                  }}
                  variant="outline"
                  className="border-primary/50 hover:bg-primary/10"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Verificar
                </Button>
              </div>
            </div>

            {/* Single Hash Verification */}
            <div className="space-y-2">
              <Label htmlFor="verify-single-hash">
                Verificação de Hash Único
              </Label>
              <div className="flex gap-2">
                <Input
                  id="verify-single-hash"
                  value={verifySingleHashInput}
                  onChange={(e) => setVerifySingleHashInput(e.target.value)}
                  placeholder="Cole o hash de uma única leitura para verificar..."
                  className="flex-1 bg-input border-border font-mono text-sm"
                />
                <Button
                  onClick={() => {
                    if (!verifySingleHashInput.trim()) {
                      toast.error('Por favor, insira um hash para verificar');
                      return;
                    }
                    // Simulate verification
                    toast.info('Verificando hash...');
                    setTimeout(() => {
                      toast.success('Hash verificado! Leitura faz parte do dataset ancorado.');
                    }, 1500);
                  }}
                  variant="outline"
                  className="border-primary/50 hover:bg-primary/10"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Verificar
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Verify Button */}
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-start gap-3 mb-4">
              <Shield className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h3 className="mb-1" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  Verificação Rápida (Client-Side)
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {sensor.visibility === 'public'
                    ? 'Verifique a integridade dos dados de preview da última hora recomputando a prova Merkle contra a root on-chain'
                    : 'Verifique a integridade dos dados localmente recomputando a prova Merkle contra a root on-chain'
                  }
                </p>
              </div>
            </div>
            <Button
              onClick={handleVerify}
              disabled={verifying || verified || !dataset.merkleRoot}
              className="w-full bg-primary text-primary-foreground"
            >
              {verifying ? (
                <>
                  <span className="animate-pulse">Verificando...</span>
                </>
              ) : verified ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Verificado com Sucesso
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Verificar Prova Rápida
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Verification Result */}
        {verified && (
          <Card className="p-6 bg-success/10 border-success/30">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-success mt-0.5" />
              <div>
                <h3 className="mb-2" style={{ fontWeight: 600, color: 'var(--success)' }}>
                  Verificação Bem-Sucedida
                </h3>
                <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                  A Merkle root do dataset confere com a âncora on-chain. Todas as {dataset.readingsCount.toLocaleString()} leituras estão verificadas e à prova de adulteração.
                </p>
                <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-background/50">
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                      Status de Integridade
                    </p>
                    <p className="text-sm" style={{ fontWeight: 500, color: 'var(--success)' }}>
                      Válido ✓
                    </p>
                  </div>
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                      Confirmação na Blockchain
                    </p>
                    <p className="text-sm" style={{ fontWeight: 500, color: 'var(--success)' }}>
                      Confirmado ✓
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* How to Verify */}
        <Card className="p-6 bg-muted/30 border-border mt-6">
          <h3 className="mb-3" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            Como Verificar Independentemente
          </h3>
          <ol className="text-sm space-y-2" style={{ color: 'var(--text-secondary)' }}>
            <li>1. Copie a Merkle root e o ID da transação acima</li>
            <li>2. Consulte a blockchain Solana usando o ID da transação</li>
            <li>3. Compare a Merkle root on-chain com o valor exibido</li>
            <li>4. Se baterem, a integridade do dataset está criptograficamente verificada</li>
          </ol>
        </Card>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 mt-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Powered by <span className="text-primary">Sparked Sense</span> — Uma infraestrutura aberta para dados físicos verificáveis
            </p>
          </div>
        </div>
      </footer>

      {/* Dataset Access Request Modal */}
      <Dialog open={accessRequestOpen} onOpenChange={setAccessRequestOpen}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle style={{ color: 'var(--text-primary)' }}>
              Solicitar Acesso ao Dataset Completo
            </DialogTitle>
            <DialogDescription style={{ color: 'var(--text-secondary)' }}>
              Envie uma solicitação para acessar o dataset completo. O proprietário revisará manualmente e responderá em 24-48 horas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="request-name">
                Nome Completo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="request-name"
                value={requestName}
                onChange={(e) => setRequestName(e.target.value)}
                placeholder="Seu nome completo"
                className="bg-input border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-email">
                Endereço de E-mail <span className="text-destructive">*</span>
              </Label>
              <Input
                id="request-email"
                type="email"
                value={requestEmail}
                onChange={(e) => setRequestEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="bg-input border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-price">
                Oferta ou Preço Proposto (Opcional)
              </Label>
              <Input
                id="request-price"
                type="number"
                value={requestPrice}
                onChange={(e) => setRequestPrice(e.target.value)}
                placeholder="Insira o valor em USD"
                className="bg-input border-border"
              />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Opcional: Proponha um preço se estiver disposto a pagar pelo acesso
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setAccessRequestOpen(false)}
              className="flex-1 border-border"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAccessRequest}
              className="flex-1 bg-primary text-primary-foreground"
            >
              Enviar Solicitação
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Definição do Label inline para evitar conflito de import
function Label({ children, className, ...props }: React.ComponentProps<'label'>) {
  return (
    <label className={`text-sm font-medium leading-none ${className}`} {...props}>
      {children}
    </label>
  );
}

