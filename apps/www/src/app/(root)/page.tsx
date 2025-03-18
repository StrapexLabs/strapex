import Image from "next/image";

import Footer from "../ui/Footer";
import Header from "../ui/Header";
import Main from "../ui/Main";

export default function Home() {
  return (
    <div className="bg-main-light flex min-h-screen flex-col items-center justify-between">
      <Main />
    </div>
  );
}
