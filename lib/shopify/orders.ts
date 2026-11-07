// Reads orders from Shopify, with the visit details that say how each customer arrived. Read-only.
import { shopifyGraphql } from './client';

export interface OrderVisit {
  source: string | null; // Shopify's name for where the visit came from, e.g. "google"
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
}

export interface ShopifyOrderItem {
  productId: string | null; // null when the product no longer exists
  variantId: string | null;
  title: string;
  quantity: number;
  amount: string;
}

export interface ShopifyOrder {
  id: string;
  name: string;
  placedAt: string;
  currency: string;
  total: string;
  refunded: string;
  paymentStatus: string | null;
  cancelledAt: string | null;
  firstVisit: OrderVisit | null;
  lastVisit: OrderVisit | null;
  items: ShopifyOrderItem[];
}

interface RawVisit {
  source: string | null;
  utmParameters: { source: string | null; medium: string | null; campaign: string | null } | null;
}

interface RawOrder {
  id: string;
  name: string;
  createdAt: string;
  test: boolean;
  cancelledAt: string | null;
  displayFinancialStatus: string | null;
  currentTotalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  totalRefundedSet: { shopMoney: { amount: string } };
  customerJourneySummary: { firstVisit: RawVisit | null; lastVisit: RawVisit | null } | null;
  lineItems: {
    nodes: { title: string; quantity: number; product: { id: string } | null; variant: { id: string } | null; discountedTotalSet: { shopMoney: { amount: string } } }[];
  };
}

interface OrdersPage {
  orders: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: RawOrder[] };
}

// Small pages, because Shopify refuses a query whose orders × line items adds up to too high a "cost".
const ORDERS_QUERY = `
  query Orders($after: String) {
    orders(first: 10, after: $after, sortKey: CREATED_AT, reverse: true) {
      pageInfo { hasNextPage endCursor }
      nodes {
        id name createdAt test cancelledAt displayFinancialStatus
        currentTotalPriceSet { shopMoney { amount currencyCode } }
        totalRefundedSet { shopMoney { amount } }
        customerJourneySummary {
          firstVisit { source utmParameters { source medium campaign } }
          lastVisit { source utmParameters { source medium campaign } }
        }
        lineItems(first: 25) {
          nodes { title quantity product { id } variant { id } discountedTotalSet { shopMoney { amount } } }
        }
      }
    }
  }`;

function toVisit(raw: RawVisit | null | undefined): OrderVisit | null {
  if (!raw) return null;
  return {
    source: raw.source,
    utmSource: raw.utmParameters?.source ?? null,
    utmMedium: raw.utmParameters?.medium ?? null,
    utmCampaign: raw.utmParameters?.campaign ?? null,
  };
}

function toOrder(raw: RawOrder): ShopifyOrder {
  return {
    id: raw.id,
    name: raw.name,
    placedAt: raw.createdAt,
    currency: raw.currentTotalPriceSet.shopMoney.currencyCode,
    total: raw.currentTotalPriceSet.shopMoney.amount,
    refunded: raw.totalRefundedSet.shopMoney.amount,
    paymentStatus: raw.displayFinancialStatus,
    cancelledAt: raw.cancelledAt,
    firstVisit: toVisit(raw.customerJourneySummary?.firstVisit),
    lastVisit: toVisit(raw.customerJourneySummary?.lastVisit),
    items: raw.lineItems.nodes.map((item) => ({
      productId: item.product?.id ?? null,
      variantId: item.variant?.id ?? null,
      title: item.title,
      quantity: item.quantity,
      amount: item.discountedTotalSet.shopMoney.amount,
    })),
  };
}

/** Every order Shopify lets us read, newest first. Test orders are left out so they never count as sales. */
export async function fetchOrders(): Promise<ShopifyOrder[]> {
  const orders: ShopifyOrder[] = [];
  let after: string | null = null;
  do {
    const page: OrdersPage = await shopifyGraphql<OrdersPage>(ORDERS_QUERY, { after });
    orders.push(...page.orders.nodes.filter((o) => !o.test).map(toOrder));
    after = page.orders.pageInfo.hasNextPage ? page.orders.pageInfo.endCursor : null;
  } while (after);
  return orders;
}
