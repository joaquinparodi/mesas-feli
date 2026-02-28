import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  TableWithCategory,
  EventSummary,
  CheckoutStep,
  CheckoutFormData,
  PaymentProvider,
} from '@/types';

interface ReservationState {
  // Selected table and event
  selectedTable: TableWithCategory | null;
  selectedEvent: EventSummary | null;

  // Checkout flow step
  step: CheckoutStep;

  // Checkout form data
  formData: CheckoutFormData;

  // Payment preference (MercadoPago init_point URL)
  paymentUrl: string | null;

  // Reservation ID after creation
  reservationId: string | null;

  // Loading / error states
  isLoading: boolean;
  error: string | null;

  // Actions
  selectTable: (table: TableWithCategory, event: EventSummary) => void;
  clearSelection: () => void;
  setStep: (step: CheckoutStep) => void;
  updateFormData: (data: Partial<CheckoutFormData>) => void;
  setPaymentUrl: (url: string) => void;
  setReservationId: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialFormData: CheckoutFormData = {
  guestCount: 1,
  guestNames: [],
  notes: '',
  paymentMethod: 'mercadopago' as PaymentProvider,
  promoterToken: undefined,
};

const initialState = {
  selectedTable: null,
  selectedEvent: null,
  step: 'select' as CheckoutStep,
  formData: { ...initialFormData },
  paymentUrl: null,
  reservationId: null,
  isLoading: false,
  error: null,
};

export const useReservationStore = create<ReservationState>()(
  devtools(
    (set) => ({
      ...initialState,

      selectTable: (table: TableWithCategory, event: EventSummary) =>
        set(
          {
            selectedTable: table,
            selectedEvent: event,
            step: 'checkout',
            error: null,
          },
          false,
          'selectTable'
        ),

      clearSelection: () =>
        set(
          {
            selectedTable: null,
            selectedEvent: null,
            step: 'select',
            formData: { ...initialFormData },
            paymentUrl: null,
            reservationId: null,
            error: null,
          },
          false,
          'clearSelection'
        ),

      setStep: (step: CheckoutStep) =>
        set({ step, error: null }, false, 'setStep'),

      updateFormData: (data: Partial<CheckoutFormData>) =>
        set(
          (state) => ({
            formData: { ...state.formData, ...data },
          }),
          false,
          'updateFormData'
        ),

      setPaymentUrl: (url: string) =>
        set({ paymentUrl: url }, false, 'setPaymentUrl'),

      setReservationId: (id: string) =>
        set({ reservationId: id }, false, 'setReservationId'),

      setLoading: (loading: boolean) =>
        set({ isLoading: loading }, false, 'setLoading'),

      setError: (error: string | null) =>
        set({ error, isLoading: false }, false, 'setError'),

      reset: () =>
        set({ ...initialState, formData: { ...initialFormData } }, false, 'reset'),
    }),
    { name: 'reservation-store' }
  )
);
