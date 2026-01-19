import { useCallback, useEffect, useState } from 'react';
import { useSettings } from './useSupabaseSettings';

export type NotificationPermission = 'default' | 'granted' | 'denied';

export function useNotification() {
  const { settings } = useSettings();
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      setPermission('granted');
      return true;
    }

    if (Notification.permission !== 'denied') {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    }

    return false;
  }, []);

  const sendNotification = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (!settings.notificationsEnabled) {
        return null;
      }

      if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return null;
      }

      if (Notification.permission !== 'granted') {
        console.warn('Notification permission not granted');
        return null;
      }

      const notification = new Notification(title, {
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        ...options,
      });

      return notification;
    },
    [settings.notificationsEnabled]
  );

  const notifySessionComplete = useCallback(
    (sessionType: 'work' | 'shortBreak' | 'longBreak') => {
      const messages = {
        work: {
          title: 'Work Session Complete!',
          body: 'Time for a break. Great work!',
        },
        shortBreak: {
          title: 'Break Over!',
          body: 'Ready to get back to work?',
        },
        longBreak: {
          title: 'Long Break Over!',
          body: 'Refreshed and ready to go?',
        },
      };

      const { title, body } = messages[sessionType];
      return sendNotification(title, { body, tag: 'session-complete' });
    },
    [sendNotification]
  );

  return {
    permission,
    isSupported: 'Notification' in window,
    requestPermission,
    sendNotification,
    notifySessionComplete,
  };
}
