declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
  }
}

const track = (eventName: string, params?: Record<string, unknown>) => {
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', eventName, params);
};

export const analytics = {
  applicationSubmitted: () =>
    track('application_submitted', {
      event_category: 'Onboarding',
      event_label: 'Distributor application submitted',
    }),

  partnerLoggedIn: (tier: string) =>
    track('login', {
      method: 'email',
      partner_tier: tier,
    }),

  addToBasket: (sku: string, name: string, partnerPrice: number) =>
    track('add_to_cart', {
      currency: 'USD',
      value: partnerPrice,
      items: [{ item_id: sku, item_name: name, price: partnerPrice }],
    }),

  removeFromBasket: (sku: string, name: string) =>
    track('remove_from_cart', {
      items: [{ item_id: sku, item_name: name }],
    }),

  enquirySubmitted: (totalValue: number, itemCount: number) =>
    track('purchase', {
      transaction_id: Date.now().toString(),
      currency: 'USD',
      value: totalValue,
      items: [],
      item_count: itemCount,
    }),

  quotationAccepted: (quotationId: string, value: number) =>
    track('quotation_accepted', {
      event_category: 'Quotations',
      quotation_id: quotationId,
      value: value,
      currency: 'USD',
    }),

  quotationDeclined: (quotationId: string) =>
    track('quotation_declined', {
      event_category: 'Quotations',
      quotation_id: quotationId,
    }),

  productSearched: (query: string, resultsCount: number) =>
    track('search', {
      search_term: query,
      results_count: resultsCount,
    }),

  familyFilterApplied: (family: string) =>
    track('filter_applied', {
      event_category: 'Product Catalog',
      filter_type: 'family',
      filter_value: family,
    }),

  productFavourited: (sku: string, action: 'added' | 'removed') =>
    track('favourite_toggled', {
      event_category: 'Product Catalog',
      sku,
      action,
    }),

  quotationPdfDownloaded: (quotationId: string) =>
    track('file_download', {
      event_category: 'Quotations',
      file_name: `quotation-${quotationId}.pdf`,
    }),
};
