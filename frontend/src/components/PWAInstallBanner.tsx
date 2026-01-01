import React, { useState, useEffect } from 'react';
import {
  Button,
  Box,
  Typography,
  IconButton,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Close as CloseIcon,
  GetApp as InstallIcon,
  Smartphone as SmartphoneIcon
} from '@mui/icons-material';
import { useTheme, useMediaQuery } from '@mui/material';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const PWAInstallBanner: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Não mostrar em desktop ou se já foi dispensado
    if (!isMobile || dismissed) return;

    // Detectar iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    // Detectar se já está instalado
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    if (isInstalled) return;

    // Verificar se já foi dispensado nesta sessão
    if (sessionStorage.getItem('pwa-banner-dismissed')) return;

    // Capturar evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Mostrar banner após 2 segundos no mobile
    const timer = setTimeout(() => {
      if (!isInstalled && !sessionStorage.getItem('pwa-banner-dismissed')) {
        setShowBanner(true);
      }
    }, 2000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, [isMobile, dismissed]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('App instalado com sucesso!');
        setShowBanner(false);
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Erro na instalação:', error);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    sessionStorage.setItem('pwa-banner-dismissed', 'true');
  };

  const handleIOSInstall = () => {
    setShowBanner(false);
    alert('Para instalar este app:\n\n1. Toque no ícone de compartilhar 📤\n2. Role para baixo e toque em "Adicionar à Tela de Início"\n3. Toque em "Adicionar"');
  };

  // Não mostrar se não for mobile ou já foi dispensado
  if (!isMobile || !showBanner || dismissed) {
    return null;
  }

  return (
    <Snackbar
      open={showBanner}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{
        '& .MuiSnackbar-root': {
          bottom: isIOS ? 80 : 20, // Espaço para bottom navigation iOS
        }
      }}
    >
      <Alert
        severity="info"
        icon={<SmartphoneIcon />}
        action={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {isIOS ? (
              <Button
                size="small"
                variant="contained"
                onClick={handleIOSInstall}
                startIcon={<InstallIcon />}
                sx={{ fontSize: '0.75rem' }}
              >
                Instalar
              </Button>
            ) : (
              <Button
                size="small"
                variant="contained"
                onClick={handleInstall}
                startIcon={<InstallIcon />}
                sx={{ fontSize: '0.75rem' }}
              >
                Instalar App
              </Button>
            )}
            <IconButton
              size="small"
              onClick={handleDismiss}
              sx={{ ml: 1 }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        }
        sx={{
          minWidth: 300,
          '& .MuiAlert-message': {
            fontSize: '0.875rem',
            fontWeight: 500
          }
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          Instale o Controle Financeiro para acesso rápido!
        </Typography>
      </Alert>
    </Snackbar>
  );
};

export default PWAInstallBanner;
