import { useState, useEffect } from 'react';

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Check if notifications are supported
    setIsSupported('Notification' in window);
    
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async (): Promise<NotificationPermission> => {
    if (!isSupported) return 'denied';

    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  };

  const showNotification = (title: string, options?: NotificationOptions) => {
    if (permission !== 'granted') return;

    const defaultOptions: NotificationOptions = {
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      ...options
    };

    return new Notification(title, defaultOptions);
  };

  const showQuoteNotification = (quoteTitle: string, clientName: string, status: string) => {
    const statusMessages = {
      approved: 'aprovado',
      rejected: 'rejeitado',
      pending: 'pendente'
    };

    showNotification('Atualização de Orçamento', {
      body: `Orçamento "${quoteTitle}" para ${clientName} foi ${statusMessages[status as keyof typeof statusMessages] || status}`,
      tag: 'quote-update',
      requireInteraction: true
    });
  };

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification,
    showQuoteNotification
  };
}