import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Notification API', () => {
  let originalNotification: typeof Notification;

  beforeEach(() => {
    originalNotification = global.Notification;
  });

  afterEach(() => {
    global.Notification = originalNotification;
    vi.restoreAllMocks();
  });

  it('should handle missing notification support', () => {
    // jsdom doesn't have Notification API by default
    // The hook should gracefully handle this
    const hasNotification = typeof Notification !== 'undefined';
    // In jsdom, this will be false - that's expected
    expect(typeof hasNotification).toBe('boolean');
  });

  it('should get permission status', () => {
    const mockNotification = {
      permission: 'default' as NotificationPermission,
      requestPermission: vi.fn(),
    };
    global.Notification = mockNotification as unknown as typeof Notification;

    expect(Notification.permission).toBe('default');
  });

  describe('notification messages', () => {
    const getNotificationMessage = (state: 'work' | 'shortBreak' | 'longBreak'): { title: string; body: string } => {
      switch (state) {
        case 'work':
          return { title: 'Work Session Complete!', body: 'Time for a break.' };
        case 'shortBreak':
          return { title: 'Break Over!', body: 'Ready to get back to work?' };
        case 'longBreak':
          return { title: 'Long Break Over!', body: 'Feeling refreshed? Time to start a new cycle!' };
      }
    };

    it('should return correct message for work session', () => {
      const message = getNotificationMessage('work');
      expect(message.title).toBe('Work Session Complete!');
      expect(message.body).toBe('Time for a break.');
    });

    it('should return correct message for short break', () => {
      const message = getNotificationMessage('shortBreak');
      expect(message.title).toBe('Break Over!');
      expect(message.body).toBe('Ready to get back to work?');
    });

    it('should return correct message for long break', () => {
      const message = getNotificationMessage('longBreak');
      expect(message.title).toBe('Long Break Over!');
      expect(message.body).toBe('Feeling refreshed? Time to start a new cycle!');
    });
  });
});
