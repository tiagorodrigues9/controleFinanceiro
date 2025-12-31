import { useState, useEffect } from 'react';

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
      console.log('Service Worker registrado:', registration);
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
          pushSubscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlB64ToUint8Array(
              'BDd3fhVQH-q4Jy3S2kBDjQYcK9-6a2Y5L6nX8mP7rQ9sT0uV1wX2yZ3a4b5c6d7e8f9g0h1i2j3k4l5m6n7o8p9q0r1s2t3u4v5w6x7y8z9'
            )
          });
          
          setSubscription(pushSubscription);
          console.log('Inscrição push criada:', pushSubscription);
          
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
      const response = await fetch('/api/notificacoes/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(subscription)
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar inscrição para o backend');
      }

      const result = await response.json();
      console.log('Inscrição enviada para o backend:', result);
      return result;
    } catch (error) {
      console.error('Erro ao enviar inscrição:', error);
      throw error;
    }
  };

  // Enviar notificação local (para testes)
  const sendLocalNotification = (title, body, url = '/notificacoes') => {
    if (permission === 'granted' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.active.postMessage({
          type: 'NOTIFICATION',
          payload: { title, body, url, timestamp: Date.now() }
        });
      });
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
