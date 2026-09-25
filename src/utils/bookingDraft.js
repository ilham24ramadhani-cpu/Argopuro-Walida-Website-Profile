const DRAFT_KEY = 'walida_booking_draft';

export function saveBookingDraft(draft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

export function loadBookingDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearBookingDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

const INVOICE_KEY = 'walida_last_invoice';

export function saveLastInvoice(invoice) {
  try {
    sessionStorage.setItem(INVOICE_KEY, JSON.stringify(invoice));
  } catch {
    /* ignore */
  }
}

export function loadLastInvoice() {
  try {
    const raw = sessionStorage.getItem(INVOICE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
