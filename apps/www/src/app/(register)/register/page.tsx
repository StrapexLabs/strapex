"use client";
import { useState } from "react";

import ContactInformationForm, {
  ContactInformation,
} from "@/components/contactInformationForm";

export default function Register() {
  const [contactInformation, setContactInformation] =
    useState<ContactInformation | null>(null);

  return (
    <div className="w-full flex-col items-center justify-center">
      <div className="flex h-screen flex-col items-center justify-center space-y-4">
        <ContactInformationForm
          setContactInformation={setContactInformation}
          contactInformation={contactInformation as ContactInformation}
          handleNextClick={() => {}}
        />
      </div>
    </div>
  );
}
