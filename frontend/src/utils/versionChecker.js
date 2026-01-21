// Sistema de verificação de versão para atualizações automáticas
class VersionChecker {
  constructor() {
    this.currentVersion = process.env.REACT_APP_VERSION || '1.0.0';
    this.checkInterval = 5 * 60 * 1000; // 5 minutos
    this.isUpdateAvailable = false;
    this.updateCallback = null;
    this.intervalId = null;
  }

  // Iniciar verificação periódica
  start(updateCallback) {
    this.updateCallback = updateCallback;
    
    // Verificar imediatamente
    this.checkForUpdates();
    
    // Configurar verificação periódica
    this.intervalId = setInterval(() => {
      this.checkForUpdates();
    }, this.checkInterval);
  }

  // Parar verificação
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  // Verificar se há atualizações
  async checkForUpdates() {
    try {
      // Tenta buscar o arquivo version.json
      const response = await fetch('/version.json', {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        const versionData = await response.json();
        const latestVersion = versionData.version;
        
        if (latestVersion && latestVersion !== this.currentVersion) {
          console.log(`Nova versão disponível: ${latestVersion} (atual: ${this.currentVersion})`);
          this.isUpdateAvailable = true;
          
          if (this.updateCallback) {
            this.updateCallback({
              currentVersion: this.currentVersion,
              latestVersion: latestVersion,
              updateAvailable: true
            });
          }
        }
      }
    } catch (error) {
      // Silenciosamente ignora erros (pode não ter version.json)
      console.debug('Erro ao verificar versão:', error);
    }
  }

  // Forçar verificação manual
  async forceCheck() {
    await this.checkForUpdates();
  }

  // Resetar estado de atualização
  resetUpdateState() {
    this.isUpdateAvailable = false;
  }
}

export default VersionChecker;
