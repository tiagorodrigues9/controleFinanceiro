import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  IconButton,
  Chip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import UpdateIcon from '@mui/icons-material/Update';
import VersionChecker from '../utils/versionChecker';

const UpdateNotification = () => {
  const [open, setOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [checker] = useState(() => new VersionChecker());

  useEffect(() => {
    // Iniciar verificação de atualizações
    checker.start((info) => {
      setUpdateInfo(info);
      setOpen(true);
    });

    // Limpar ao desmontar
    return () => {
      checker.stop();
    };
  }, [checker]);

  const handleUpdate = () => {
    // Recarregar a página
    window.location.reload(true);
  };

  const handleDismiss = () => {
    setOpen(false);
  };

  const handleForceCheck = async () => {
    await checker.forceCheck();
  };

  if (!open || !updateInfo) return null;

  return (
    <Dialog 
      open={open} 
      maxWidth="sm" 
      fullWidth
      disableEscapeKeyDown
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        bgcolor: 'primary.main',
        color: 'white'
      }}>
        <UpdateIcon />
        Nova Versão Disponível
      </DialogTitle>
      
      <DialogContent sx={{ py: 3 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Uma nova versão do sistema foi implantada com melhorias e correções.
          </Typography>
        </Alert>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Versões:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip 
              label={`Atual: ${updateInfo.currentVersion}`} 
              variant="outlined" 
              size="small" 
              color="default"
            />
            <Typography variant="body2">→</Typography>
            <Chip 
              label={`Nova: ${updateInfo.latestVersion}`} 
              variant="filled" 
              size="small" 
              color="primary"
            />
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary">
          Para aplicar as atualizações e ter acesso às novas funcionalidades, 
          recomendamos recarregar a página.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button 
          onClick={handleDismiss} 
          variant="outlined"
          size="small"
        >
          Agora não
        </Button>
        <Button 
          onClick={handleUpdate} 
          variant="contained"
          startIcon={<RefreshIcon />}
          autoFocus
        >
          Atualizar Agora
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UpdateNotification;
