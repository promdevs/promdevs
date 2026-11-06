import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import "./services.css";

export default function ServicesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header homePath="/?view=html" />
      {children}
      <Footer homePath="/?view=html" />
    </>
  );
}
