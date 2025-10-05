export interface Order {
  id: string;
  userId: string;
  bookId: string;
  status: 'requested' | 'confirmed' | 'borrowed' | 'returned' | 'cancelled';
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  deliveryAddress?: string;
  deliveryStatus?: 'pending' | 'in_transit' | 'delivered';
}

export interface DeliveryInfo {
  orderId: string;
  address: string;
  phoneNumber: string;
  preferredTime?: string;
  specialInstructions?: string;
}