// Define the session data type with all possible properties
export interface SessionData {
  sessionId: string;
  totalPrice: number;
  totalPriceToken: string;
  payment_type: string;
  successUrl: string;
  cancelUrl: string;
  lineItems: any;
  depositAddress: string;
  status: string;
  billing_address_collection?: string;
  shipping_address_collection?: string;
  shippingAddress?: ShippingAddress;
  contactInformation?: ContactInformation;
}

export interface ShippingAddress {
  name: string;
  surname: string;
  address: string;
  apartment: string;
  city: string;
  state: string;
  country: string;
  postcode: string;
}

export interface ContactInformation {
  name: string;
  surname: string;
  phoneNumber: string;
  email: string;
}
