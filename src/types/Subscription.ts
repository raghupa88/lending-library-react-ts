export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  maxBooks: number;
  features: string[];
  popular?: boolean;
  deliveryIncluded: boolean;
  description?: string;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'cancelled';
  autoRenew: boolean;
}