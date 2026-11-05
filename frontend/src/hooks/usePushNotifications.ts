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
        const currentPermission = Notification.permission;
        setPermission(currentPermission);

        // Se já tiver permissão concedida, sincronizar inscrição
        if (currentPermission === 'granted') {
          navigator.serviceWorker.ready.then(async (registration) => {
            if (registration && registration.pushManager) {
              try {
                const existingSub = await registration.pushManager.getSubscription();
                if (existingSub) {
                  setSubscription(existingSub);
                  const payload = existingSub.toJSON ? existingSub.toJSON() : existingSub;
                  await api.post('/notificacoes/subscribe', payload);
                }
              } catch (err) {
                console.warn('Sincronização de push em background:', err);
              }
            }
          }).catch(() => {});
        }
      }
    } else {
      setIsSupported(false);
    }
  }, []);

  // Registrar service worker
  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/service-worker.js');
      await navigator.serviceWorker.ready;
      return registration;
    } catch (error) {
      console.error('Erro ao registrar Service Worker:', error);
      throw error;
    }
  };

  // Pedir permissão de notificação e inscrever no push
  const requestPermission = async () => {
    if (!isSupported) {
      throw new Error('Notificações não são suportadas neste navegador');
    }

    setIsLoading(true);
    
    try {
      // 1. Registrar e aguardar o service worker
      const registration = await registerServiceWorker();
      
      // 2. Pedir permissão ao usuário
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);
      
      if (permissionResult !== 'granted') {
        throw new Error('Permissão de notificação negada');
      }

      // 3. Obter ou criar inscrição push
      let pushSubscription = null;
      if ('PushManager' in window && registration.pushManager) {
        try {
          const vapidKey = process.env.REACT_APP_VAPID_PUBLIC_KEY || 'BHEqzi9eqU0WRAoVjdRP6o_D3vjdV0FuOxBj5Dg8El3ZTTGXolN8_5J7B0LqQtg6BFULAIyHneqhm72fydqCfjI';
          
          pushSubscription = await registration.pushManager.getSubscription();
          
          if (!pushSubscription) {
            pushSubscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: urlB64ToUint8Array(vapidKey)
            });
          }
          
          setSubscription(pushSubscription);
          
          // Enviar inscrição serializada para o backend
          const payload = pushSubscription.toJSON ? pushSubscription.toJSON() : pushSubscription;
          await sendSubscriptionToBackend(payload);
        } catch (error) {
          console.error('Erro ao criar inscrição push:', error);
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
  const sendSubscriptionToBackend = async (subPayload) => {
    try {
      const response = await api.post('/notificacoes/subscribe', subPayload);
      if (response.status !== 200 && response.status !== 201) {
        throw new Error('Falha ao registrar inscrição no servidor');
      }
    } catch (error) {
      console.error('Erro ao enviar inscrição:', error);
      throw error;
    }
  };

  // Enviar notificação local (para testes ou feedback imediato)
  const sendLocalNotification = (title, body, url = '/notificacoes') => {
    if (permission !== 'granted') {
      return;
    }

    // Tentar via Service Worker para comportamento idêntico ao push nativo
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        if (registration && registration.active) {
          registration.active.postMessage({
            type: 'SHOW_NOTIFICATION',
            payload: { title, body, url }
          });
          return;
        }
        mostrarFallback(title, body, url);
      }).catch(() => {
        mostrarFallback(title, body, url);
      });
    } else {
      mostrarFallback(title, body, url);
    }
  };

  const mostrarFallback = (title, body, url) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notification = new Notification(title, {
          body: body,
          icon: '/icons/icon-192x192.svg',
          badge: '/icons/icon-192x192.svg',
          tag: 'controle-financeiro',
          requireInteraction: true,
          vibrate: [100, 50, 100],
          data: { url, timestamp: Date.now() }
        });

        notification.onclick = function() {
          window.focus();
          window.location.href = url;
          this.close();
        };

        setTimeout(() => {
          notification.close();
        }, 6000);
      } catch (e) {
        console.error('Erro no fallback de notificação:', e);
      }
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
