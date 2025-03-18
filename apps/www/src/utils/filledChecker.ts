import { ContactInformation } from "../components/contactInformationForm";
import { ShippingAddress as ShippingAddressType } from "../components/shippingAddressForm";

export function isContactInformationFilled(
  contactInformation: ContactInformation,
): boolean {
  return (
    !!contactInformation.name &&
    !!contactInformation.surname &&
    !!contactInformation.phoneNumber &&
    !!contactInformation.email
  );
}

export function isShippingAddressFilled(
  shippingAddress: ShippingAddressType,
): boolean {
  return (
    !!shippingAddress.name &&
    !!shippingAddress.surname &&
    !!shippingAddress.address &&
    !!shippingAddress.city &&
    !!shippingAddress.state &&
    !!shippingAddress.country &&
    !!shippingAddress.postcode
  );
}
