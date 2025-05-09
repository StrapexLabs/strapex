import { Theme } from "@radix-ui/themes";
import localFont from "next/font/local";
import "@radix-ui/themes/styles.css";
import "@/app/globals.css";

import Footer from "@/app/ui/Footer";
import Header from "@/app/ui/Header";
import StarknetProvider from "@/components/lib/starknet-provider";
import { ProviderProvider } from "@/contexts/ProviderContext";
import { UserProvider } from "@/contexts/UserContext";

// Font files can be colocated inside of `pages`
const myFont = localFont({ src: "./SF-Pro.ttf" });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={myFont.className}>
        <StarknetProvider>
          <ProviderProvider>
            <UserProvider>
              <Theme>
                <Header />
                {children}
                <Footer />
              </Theme>
            </UserProvider>
          </ProviderProvider>
        </StarknetProvider>
      </body>
    </html>
  );
}
