"use client";
// BillingAddressForm.tsx
import React, { useState } from "react";
import "react-phone-number-input/style.css";
import { AddressAutofill } from "@mapbox/search-js-react";
import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Button, TextField, Callout } from "@radix-ui/themes";
import dynamic from "next/dynamic";

interface ShippingAddressFormProps {
  shippingAddress: ShippingAddress;
  setShippingAddress: (address: ShippingAddress) => void;
  handleNextClick: () => void;
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

export default function ShippingAddressForm({
  shippingAddress,
  setShippingAddress,
  handleNextClick,
}: ShippingAddressFormProps) {
  const [error, setError] = useState("");
  const AddressForm = AddressAutofill as any;

  const handleChange = (field: keyof ShippingAddress, value: string) => {
    const updatedAddress = {
      ...shippingAddress,
      [field]: value,
    } as ShippingAddress;
    setShippingAddress(updatedAddress);
  };

  const handleInternalNextClick = () => {
    if (
      !shippingAddress?.name ||
      !shippingAddress?.surname ||
      !shippingAddress?.address ||
      !shippingAddress?.city ||
      !shippingAddress?.state ||
      !shippingAddress?.country ||
      !shippingAddress?.postcode
    ) {
      setError("All fields are required and must be correctly formatted.");
    } else {
      setError("");
      handleNextClick();
    }
  };

  return (
    <form className="space-y-4">
      <div className="flex flex-col justify-between space-y-4 md:flex-row md:space-x-4 md:space-y-0">
        <TextField.Root
          type="text"
          placeholder="Name"
          value={shippingAddress?.name || ""}
          onChange={(e) => handleChange("name", e.target.value)}
          required
          size="3"
        />
        <TextField.Root
          type="text"
          placeholder="Surname"
          value={shippingAddress?.surname || ""}
          onChange={(e) => handleChange("surname", e.target.value)}
          required
          size="3"
        />
      </div>

      <AddressForm accessToken="pk.eyJ1IjoibWFjaHV3ZXkiLCJhIjoiY2x2dHRkYWY1MHp1ZDJqbndqMnZ2M29raSJ9.3cDEvJj0FaCr6A7YzeDQBg">
        <div className="mt-4 space-y-4">
          <TextField.Root
            name="address"
            placeholder="Street address"
            type="text"
            autoComplete="address-line1"
            value={shippingAddress?.address || ""}
            onChange={(e) => handleChange("address", e.target.value)}
            size="3"
          />
          <div className="flex flex-col justify-between space-y-4 md:flex-row md:space-x-4 md:space-y-0">
            <TextField.Root
              name="apartment"
              placeholder="Apartment nº (optional)"
              type="text"
              autoComplete="address-line2"
              value={shippingAddress?.apartment || ""}
              onChange={(e) => handleChange("apartment", e.target.value)}
              size="3"
            />
            <TextField.Root
              name="city"
              placeholder="City"
              type="text"
              autoComplete="address-level2"
              value={shippingAddress?.city || ""}
              onChange={(e) => handleChange("city", e.target.value)}
              size="3"
            />
          </div>
          <div className="flex flex-col justify-between space-y-4 md:flex-row md:space-x-4 md:space-y-0">
            <TextField.Root
              name="state"
              placeholder="State"
              type="text"
              autoComplete="address-level1"
              value={shippingAddress?.state || ""}
              onChange={(e) => handleChange("state", e.target.value)}
              size="3"
            />
            <TextField.Root
              name="country"
              placeholder="Country"
              type="text"
              autoComplete="country"
              value={shippingAddress?.country || ""}
              onChange={(e) => handleChange("country", e.target.value)}
              size="3"
            />
          </div>
          <TextField.Root
            name="postcode"
            placeholder="Postcode"
            type="text"
            autoComplete="postal-code"
            value={shippingAddress?.postcode || ""}
            onChange={(e) => handleChange("postcode", e.target.value)}
            size="3"
          />
        </div>
      </AddressForm>
      {error && (
        <Callout.Root color="red">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}
      <Button
        type="button"
        onClick={handleInternalNextClick}
        className="w-full rounded bg-neutral-800 px-6 py-3 font-semibold text-white hover:bg-gray-600"
        size="3"
      >
        Next
      </Button>
    </form>
  );
}
