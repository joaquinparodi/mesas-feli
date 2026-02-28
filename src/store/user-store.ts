import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { UserSession, NotificationInfo } from '@/types';

interface UserState {
  // User session data
  user: UserSession | null;
  isAuthenticated: boolean;

  // Notifications
  notifications: NotificationInfo[];
  unreadCount: number;

  // Loading state
  isLoading: boolean;

  // Actions
  setUser: (user: UserSession) => void;
  clearUser: () => void;
  updateUser: (data: Partial<UserSession>) => void;

  // Notification actions
  setNotifications: (notifications: NotificationInfo[]) => void;
  addNotification: (notification: NotificationInfo) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  removeNotification: (notificationId: string) => void;
  clearNotifications: () => void;

  // Loading
  setLoading: (loading: boolean) => void;
}

export const useUserStore = create<UserState>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        isAuthenticated: false,
        notifications: [],
        unreadCount: 0,
        isLoading: false,

        setUser: (user: UserSession) =>
          set(
            { user, isAuthenticated: true },
            false,
            'setUser'
          ),

        clearUser: () =>
          set(
            {
              user: null,
              isAuthenticated: false,
              notifications: [],
              unreadCount: 0,
            },
            false,
            'clearUser'
          ),

        updateUser: (data: Partial<UserSession>) =>
          set(
            (state) => ({
              user: state.user ? { ...state.user, ...data } : null,
            }),
            false,
            'updateUser'
          ),

        setNotifications: (notifications: NotificationInfo[]) =>
          set(
            {
              notifications,
              unreadCount: notifications.filter((n) => !n.read).length,
            },
            false,
            'setNotifications'
          ),

        addNotification: (notification: NotificationInfo) =>
          set(
            (state) => {
              const notifications = [notification, ...state.notifications];
              return {
                notifications,
                unreadCount: notifications.filter((n) => !n.read).length,
              };
            },
            false,
            'addNotification'
          ),

        markNotificationRead: (notificationId: string) =>
          set(
            (state) => {
              const notifications = state.notifications.map((n) =>
                n.id === notificationId ? { ...n, read: true } : n
              );
              return {
                notifications,
                unreadCount: notifications.filter((n) => !n.read).length,
              };
            },
            false,
            'markNotificationRead'
          ),

        markAllNotificationsRead: () =>
          set(
            (state) => ({
              notifications: state.notifications.map((n) => ({ ...n, read: true })),
              unreadCount: 0,
            }),
            false,
            'markAllNotificationsRead'
          ),

        removeNotification: (notificationId: string) =>
          set(
            (state) => {
              const notifications = state.notifications.filter(
                (n) => n.id !== notificationId
              );
              return {
                notifications,
                unreadCount: notifications.filter((n) => !n.read).length,
              };
            },
            false,
            'removeNotification'
          ),

        clearNotifications: () =>
          set(
            { notifications: [], unreadCount: 0 },
            false,
            'clearNotifications'
          ),

        setLoading: (loading: boolean) =>
          set({ isLoading: loading }, false, 'setLoading'),
      }),
      {
        name: 'mesavip-user-store',
        // Only persist user session, not notifications (those come from the server)
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    { name: 'user-store' }
  )
);
