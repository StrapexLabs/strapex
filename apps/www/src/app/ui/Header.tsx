import {
  ChevronDownIcon,
  MagnifyingGlassIcon,
  PersonIcon,
} from "@radix-ui/react-icons";
import { TextField, Button } from "@radix-ui/themes";

import ConnectWalletBtn from "./ConnectWalletBtn";

export default function Header() {
  const navLinks = [
    { name: "Home", href: "#" },
    { name: "About", href: "#" },
    { name: "Hire", href: "#" },
    { name: "Contact", href: "#" },
  ];

  return (
    <header className="flex w-full items-center justify-between px-6 py-4">
      {/* Left side */}
      <div className="flex items-center">
        {/* Logo */}
        <a href="/">
          <div className="text-main flex items-center text-3xl font-bold">
            <img
              src="/StrapexBlackLogo.png"
              alt="Logo"
              className="mr-2 inline-block w-24"
            />
          </div>
        </a>
        {/*
        {navLinks.map((link) => (
          <a
            key={link.name}
            href={link.href}
            className="ml-6 hover:text-main-light flex flex-row items-center text-xl text-black hidden lg:flex"
          >
            {link.name}
            <ChevronDownIcon />
          </a>
        ))}
          */}
      </div>

      {/* Right side */}
      <ConnectWalletBtn />
    </header>
  );
}
