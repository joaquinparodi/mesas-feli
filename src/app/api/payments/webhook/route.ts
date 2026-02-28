import { NextRequest } from 'next/server';
import dbConnect from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api-response';
import { webhookLimiter } from '@/lib/rate-limit';
import { getPaymentStatus, validateWebhookSignature } from '@/lib/mercadopago';
import { createReservationQR } from '@/lib/qr';
import { triggerEvent, channels, pusherEvents } from '@/lib/pusher';
import { sendReservationConfirmation, sendCommissionNotification } from '@/lib/resend';
import Reservation from '@/models/Reservation';
import Payment from '@/models/Payment';
import Table from '@/models/Table';
import Event from '@/models/Event';
import User from '@/models/User';
import Promoter from '@/models/Promoter';
import Notification from '@/models/Notification';
import TableCategory from '@/models/TableCategory';

/**
 * POST /api/payments/webhook
 * Handle MercadoPago webhook notifications.
 * Validates signature, updates payment/reservation status, triggers real-time events.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimitResult = webhookLimiter(request);
    if (rateLimitResult) return rateLimitResult;

    const body = await request.json();

    // MercadoPago sends different notification types
    // We only care about payment notifications
    if (body.type !== 'payment') {
      return successResponse({ received: true, processed: false });
    }

    const paymentMPId = body.data?.id;
    if (!paymentMPId) {
      return errorResponse('Missing payment ID in webhook data', 400);
    }

    // Validate webhook signature
    const xSignature = request.headers.get('x-signature') || '';
    const xRequestId = request.headers.get('x-request-id') || '';

    const isValid = await validateWebhookSignature(xSignature, xRequestId, String(paymentMPId));
    if (!isValid) {
      console.error('Invalid webhook signature');
      return errorResponse('Invalid webhook signature', 401);
    }

    await dbConnect();

    // Get payment info from MercadoPago
    const mpPayment = await getPaymentStatus(String(paymentMPId));

    if (!mpPayment.externalReference) {
      console.error('No external reference in payment');
      return successResponse({ received: true, processed: false });
    }

    const reservationId = mpPayment.externalReference;

    // Find the reservation
    const reservation = await Reservation.findById(reservationId);
    if (!reservation) {
      console.error(`Reservation not found for webhook: ${reservationId}`);
      return successResponse({ received: true, processed: false });
    }

    // Find or create payment record
    let payment = await Payment.findOne({
      reservationId: reservation._id,
      provider: 'mercadopago',
    });

    if (!payment) {
      payment = await Payment.create({
        reservationId: reservation._id,
        provider: 'mercadopago',
        externalId: String(mpPayment.id),
        status: 'pending',
        amount: mpPayment.amount,
        currency: 'ARS',
      });
    }

    // Update payment external ID
    payment.externalId = String(mpPayment.id);

    if (mpPayment.status === 'approved') {
      // Payment approved
      payment.status = 'approved';
      payment.paidAt = mpPayment.paidAt ? new Date(mpPayment.paidAt) : new Date();
      payment.metadata = { ...payment.metadata, statusDetail: mpPayment.statusDetail };
      await payment.save();

      // Update reservation to confirmed
      reservation.status = 'confirmed';
      reservation.paymentId = payment._id;

      // Generate final QR code
      const { token: qrToken } = await createReservationQR({
        reservationId: reservation._id.toString(),
        eventId: reservation.eventId.toString(),
        userId: reservation.userId.toString(),
        tableId: reservation.tableId.toString(),
      });
      reservation.qrCode = qrToken;
      await reservation.save();

      // Update table to sold
      await Table.findByIdAndUpdate(reservation.tableId, {
        status: 'sold',
        reservedUntil: null,
      });

      // Get event, table, category, and user info for notifications
      const event = await Event.findById(reservation.eventId)
        .populate('venue', 'name')
        .lean();
      const table = await Table.findById(reservation.tableId).lean();
      const category = table ? await TableCategory.findById(table.categoryId).lean() : null;
      const user = await User.findById(reservation.userId).lean();

      // Send confirmation email
      if (user && event && table) {
        try {
          const { dataUrl: qrDataUrl } = await createReservationQR({
            reservationId: reservation._id.toString(),
            eventId: reservation.eventId.toString(),
            userId: reservation.userId.toString(),
            tableId: reservation.tableId.toString(),
          });

          await sendReservationConfirmation({
            to: user.email,
            userName: user.name,
            eventTitle: event.title,
            eventDate: new Date(event.date).toLocaleDateString('es-AR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
            tableLabel: table.label,
            amount: reservation.amount,
            qrCodeDataUrl: qrDataUrl,
            reservationId: reservation._id.toString(),
          });
        } catch (emailError) {
          console.error('Failed to send confirmation email:', emailError);
        }
      }

      // Create user notification
      await Notification.create({
        userId: reservation.userId,
        type: 'reservation_confirmed',
        title: 'Reserva confirmada',
        message: `Tu reserva para ${event?.title || 'evento'} ha sido confirmada. Tu mesa es ${table?.label || 'N/A'}.`,
        link: `/reservations/${reservation._id}`,
      });

      // Handle promoter commission
      if (reservation.promoterId) {
        const promoter = await Promoter.findOne({
          userId: reservation.promoterId,
          eventId: reservation.eventId,
        });

        if (promoter) {
          const commission = (reservation.amount * promoter.commissionRate) / 100;

          promoter.totalSales += 1;
          promoter.totalEarnings += commission;
          await promoter.save();

          // Notify promoter
          const promoterUser = await User.findById(promoter.userId).lean();
          if (promoterUser) {
            await Notification.create({
              userId: promoter.userId,
              type: 'commission_earned',
              title: 'Comision ganada',
              message: `Ganaste $${commission.toLocaleString('es-AR')} de comision por la venta de mesa ${table?.label || 'N/A'} en ${event?.title || 'evento'}.`,
              link: `/promoter/stats`,
            });

            try {
              await sendCommissionNotification({
                to: promoterUser.email,
                promoterName: promoterUser.name,
                commission,
                eventTitle: event?.title || 'Evento',
                tableLabel: table?.label || 'Mesa',
              });
            } catch (emailError) {
              console.error('Failed to send commission email:', emailError);
            }

            // Pusher event for promoter
            try {
              await triggerEvent(
                channels.promoterUpdates(promoter._id.toString()),
                pusherEvents.COMMISSION_EARNED,
                { commission, reservationId: reservation._id.toString() }
              );
            } catch (pusherError) {
              console.error('Pusher promoter event failed:', pusherError);
            }
          }
        }
      }

      // Trigger Pusher events for real-time updates
      try {
        await triggerEvent(
          channels.eventTables(reservation.eventId.toString()),
          pusherEvents.TABLE_STATUS_CHANGED,
          {
            tableId: reservation.tableId.toString(),
            status: 'sold',
          }
        );

        await triggerEvent(
          channels.eventReservations(reservation.eventId.toString()),
          pusherEvents.RESERVATION_UPDATED,
          {
            reservationId: reservation._id.toString(),
            status: 'confirmed',
          }
        );

        await triggerEvent(
          channels.eventReservations(reservation.eventId.toString()),
          pusherEvents.PAYMENT_RECEIVED,
          {
            reservationId: reservation._id.toString(),
            amount: reservation.amount,
          }
        );

        // Notify organizer
        if (event) {
          await triggerEvent(
            channels.organizerDashboard(event.organizerId.toString()),
            pusherEvents.PAYMENT_RECEIVED,
            {
              reservationId: reservation._id.toString(),
              amount: reservation.amount,
              eventId: event._id.toString(),
            }
          );
        }
      } catch (pusherError) {
        console.error('Pusher event failed:', pusherError);
      }
    } else if (mpPayment.status === 'rejected') {
      // Payment rejected
      payment.status = 'rejected';
      payment.metadata = { ...payment.metadata, statusDetail: mpPayment.statusDetail };
      await payment.save();

      // Update reservation to cancelled
      reservation.status = 'cancelled';
      await reservation.save();

      // Release the table back to available
      await Table.findByIdAndUpdate(reservation.tableId, {
        status: 'available',
        reservedUntil: null,
        reservedBy: null,
      });

      // Create notification
      await Notification.create({
        userId: reservation.userId,
        type: 'system',
        title: 'Pago rechazado',
        message: `Tu pago para la reserva ha sido rechazado. La mesa ha sido liberada.`,
        link: `/reservations/${reservation._id}`,
      });

      // Trigger Pusher events
      try {
        await triggerEvent(
          channels.eventTables(reservation.eventId.toString()),
          pusherEvents.TABLE_STATUS_CHANGED,
          {
            tableId: reservation.tableId.toString(),
            status: 'available',
          }
        );

        await triggerEvent(
          channels.eventReservations(reservation.eventId.toString()),
          pusherEvents.RESERVATION_UPDATED,
          {
            reservationId: reservation._id.toString(),
            status: 'cancelled',
          }
        );
      } catch (pusherError) {
        console.error('Pusher event failed:', pusherError);
      }
    } else {
      // Other statuses (pending, in_process, etc.) - just update payment metadata
      payment.metadata = {
        ...payment.metadata,
        mpStatus: mpPayment.status,
        statusDetail: mpPayment.statusDetail,
      };
      await payment.save();
    }

    return successResponse({ received: true, processed: true });
  } catch (error: any) {
    console.error('POST /api/payments/webhook error:', error);
    // Always return 200 to MP to prevent retries on server errors we handle
    return successResponse({ received: true, error: error.message });
  }
}
