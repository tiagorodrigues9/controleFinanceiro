// @ts-nocheck
import { useState, useEffect } from 'react';
import api from '../utils/api';

const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [subscription, setSubscription] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Verificar se o navegador suporta notificações push
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      
      // Verificar permissão atual
      if ('Notification' in window) {
        setPermission(Notification.permission);
      }
    } else {
      setIsSupported(false);
    }
  }, []);

  // Registrar service worker
  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      return registration;
    } catch (error) {
      console.error('Erro ao registrar Service Worker:', error);
      throw error;
    }
  };

  // Pedir permissão de notificação
  const requestPermission = async () => {
    if (!isSupported) {
      throw new Error('Notificações não são suportadas neste navegador');
    }

    setIsLoading(true);
    
    try {
      // Primeiro, registrar o service worker
      const registration = await registerServiceWorker();
      
      // Pedir permissão de notificação
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      
      if (permissionResult !== 'granted') {
        throw new Error('Permissão de notificação negada');
      }

      // Se suportado, pedir inscrição push
      let pushSubscription = null;
      if ('pushManager' in window) {
        try {
          const vapidKey = process.env.REACT_APP_VAPID_PUBLIC_KEY || 'BHEqzi9eqU0WRAoVjdRP6o_D3vjdV0FuOxBj5Dg8El3ZTTGXolN8_5J7B0LqQtg6BFULAIyHneqhm72fydqCfjI';
          pushSubscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlB64ToUint8Array(vapidKey)
          });
          
          setSubscription(pushSubscription);
          
          // Enviar inscrição para o backend
          await sendSubscriptionToBackend(pushSubscription);
        } catch (error) {
          console.error('Erro ao criar inscrição push:', error);
          // Continuar sem push notifications
        }
      }

      return {
        permission: permissionResult,
        subscription: pushSubscription
      };
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Enviar inscrição para o backend
  const sendSubscriptionToBackend = async (subscription) => {
    try {
      const response = await api.post('/notificacoes/subscribe', subscription);
      
      if (response.status !== 200) {
        throw new Error('Falha ao registrar inscrição no servidor');
      }
    } catch (error) {
      console.error('Erro ao enviar inscrição:', error);
      throw error;
    }
  };

  // Enviar notificação local (para testes)
  const sendLocalNotification = (title, body, url = '/notificacoes') => {
    if (permission !== 'granted') {
      return;
    }

    // Tentar mostrar notificação diretamente primeiro
    if (permission === 'granted' && 'Notification' in window) {
      try {
        const notification = new Notification(title, {
          body: body,
          icon: '/logo192.png',
          badge: '/logo192.png',
          tag: 'controle-financeiro',
          requireInteraction: true,
          vibrate: [100, 50, 100],
          data: { url, timestamp: Date.now() }
        });

        // Adicionar evento de clique
        notification.onclick = function() {
          window.focus();
          window.location.href = url;
          this.close();
        };

        // Auto-fechar após 5 segundos
        setTimeout(() => {
          notification.close();
        }, 5000);

        return;
      } catch (e) {
        console.error('Erro ao mostrar notificação:', e);
      }
    }

    // Fallback: tentar via service worker
    if (permission === 'granted' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.active) {
          registration.active.postMessage({
            type: 'SHOW_NOTIFICATION',
            payload: { title, body, url }
          });
        }
      }).catch(error => {
      });
      console.warn('⚠️ Permissão não concedida ou service worker não disponível');
    }
  };

  return {
    isSupported,
    permission,
    subscription,
    isLoading,
    requestPermission,
    sendLocalNotification
  };
};

// Função auxiliar para converter VAPID key
function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default usePushNotifications;
