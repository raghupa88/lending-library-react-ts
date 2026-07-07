/** Matches backend PaymentInput — a fake checkout, no real card data ever leaves this demo. */
export interface PaymentInput {
  cardholderName: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvc: string;
}
