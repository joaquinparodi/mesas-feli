import Pusher from 'pusher';
import PusherClient from 'pusher-js';

// Server-side Pusher instance (singleton)
let pusherServerInstance: Pusher | null = null;

export function getPusherServer(): Pusher {
  if (pusherServerInstance) {
    return pusherServerInstance;
  }

  pusherServerInstance = new Pusher({
    appId: process.env.PUSHER_APP_ID!,
    key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
    secret: process.env.PUSHER_SECRET!,
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    useTLS: true,
  });

  return pusherServerInstance;
}

// Client-side Pusher instance (singleton)
let pusherClientInstance: PusherClient | null = null;

export function getPusherClient(): PusherClient {
  if (pusherClientInstance) {
    return pusherClientInstance;
  }

  pusherClientInstance = new PusherClient(
    process.env.NEXT_PUBLIC_PUSHER_KEY!,
    {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    }
  );

  return pusherClientInstance;
}

// Channel name helpers for consistent naming across the app
export const channels = {
  /** Private channel for a specific user's notifications */
  userNotifications: (userId: string) => `private-user-${userId}`,

  /** Channel for real-time table status updates for an event */
  eventTables: (eventId: string) => `event-tables-${eventId}`,

  /** Channel for reservation updates for a specific event */
  eventReservations: (eventId: string) => `event-reservations-${eventId}`,

  /** Private channel for organizer dashboard updates */
  organizerDashboard: (organizerId: string) => `private-organizer-${organizerId}`,

  /** Private channel for promoter updates */
  promoterUpdates: (promoterId: string) => `private-promoter-${promoterId}`,
} as const;

// Event name constants for consistent event naming
export const pusherEvents = {
  TABLE_STATUS_CHANGED: 'table-status-changed',
  RESERVATION_CREATED: 'reservation-created',
  RESERVATION_UPDATED: 'reservation-updated',
  PAYMENT_RECEIVED: 'payment-received',
  NOTIFICATION_NEW: 'notification-new',
  COMMISSION_EARNED: 'commission-earned',
} as const;

// Helper to trigger a server-side event
export async function triggerEvent(
  channel: string,
  event: string,
  data: Record<string, any>
): Promise<void> {
  const pusher = getPusherServer();
  await pusher.trigger(channel, event, data);
}
