// PWA Install Prompt Component
import React, { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  IconButton
} from '@mui/material';
import {
  Close as CloseIcon,
  GetApp as InstallIcon,
  Smartphone as SmartphoneIcon
} from '@mui/icons-material';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detectar iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Detectar se já está instalado
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    if (isInstalled) {
      console.log('App já está instalado como PWA');
      return;
    }

    // Capturar evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Mostrar diálogo após 3 segundos (mais tempo para usuário ver o app)
      setTimeout(() => {
        setShowInstallDialog(true);
      }, 3000);
    };

    // Também mostrar após interação do usuário
    const showPromptAfterInteraction = () => {
      if (!isInstalled && !sessionStorage.getItem('pwa-prompt-shown')) {
        setTimeout(() => {
          setShowInstallDialog(true);
          sessionStorage.setItem('pwa-prompt-shown', 'true');
        }, 5000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Mostrar após scroll ou clique (engajamento do usuário)
    if (!isInstalled) {
      window.addEventListener('scroll', showPromptAfterInteraction, { once: true });
      window.addEventListener('click', showPromptAfterInteraction, { once: true });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('scroll', showPromptAfterInteraction);
      window.removeEventListener('click', showPromptAfterInteraction);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('App instalado com sucesso!');
      }
      
      setDeferredPrompt(null);
      setShowInstallDialog(false);
    } catch (error) {
      console.error('Erro na instalação:', error);
    }
  };

  const handleIOSInstall = () => {
    setShowInstallDialog(false);
    // Mostrar instruções para iOS
    alert('Para instalar este app:\n\n1. Toque no ícone de compartilhar \ud83d\udce4\n2. Role para baixo e toque em "Adicionar à Tela de Início"\n3. Toque em "Adicionar"');
  };

  const handleClose = () => {
    setShowInstallDialog(false);
  };

  // Não mostrar se já foi instalado ou não houver prompt
  if (!showInstallDialog || (!deferredPrompt && !isIOS)) {
    return null;
  }

  return (
    <Dialog 
      open={showInstallDialog} 
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 1
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <InstallIcon color="primary" />
            <Typography variant="h6">Instalar Aplicativo</Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box textAlign="center" py={2}>
          <SmartphoneIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          
          <Typography variant="body1" paragraph>
            Instale o Controle Financeiro na sua tela inicial para acesso rápido e uma experiência melhor!
          </Typography>
          
          {isIOS ? (
            <Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                Como instalar no iPhone/iPad:
              </Typography>
              <Typography variant="body2" component="div">
                <ol style={{ textAlign: 'left', paddingLeft: 20 }}>
                  <li>Toque no ícone de compartilhar <span role="img" aria-label="share">📤</span></li>
                  <li>Role para baixo e toque em "Adicionar à Tela de Início"</li>
                  <li>Toque em "Adicionar"</li>
                </ol>
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Com o app instalado, você poderá:
              <ul style={{ textAlign: 'left', paddingLeft: 20 }}>
                <li>Acessar rapidamente da tela inicial</li>
                <li>Usar offline</li>
                <li>Receber notificações push</li>
                <li>Experiência nativa</li>
              </ul>
            </Typography>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ pb: 2, px: 3 }}>
        <Button onClick={handleClose}>
          Agora não
        </Button>
        <Button 
          onClick={isIOS ? handleIOSInstall : handleInstallClick}
          variant="contained"
          startIcon={<InstallIcon />}
        >
          {isIOS ? 'Ver Instruções' : 'Instalar Agora'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PWAInstallPrompt;
