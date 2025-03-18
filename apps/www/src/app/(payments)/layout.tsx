import { Theme } from "@radix-ui/themes";

import { ProviderProvider } from "@/contexts/ProviderContext";
import "@radix-ui/themes/styles.css";

// Font files can be colocated inside of `pages`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProviderProvider>
      <Theme>{children}</Theme>
    </ProviderProvider>
  );
}
