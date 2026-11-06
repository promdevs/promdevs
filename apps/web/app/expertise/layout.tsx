import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import "../projects/projects.css";
import "./expertise.css";

export default function ExpertiseLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header homePath="/?view=html" />
      {children}
      <Footer homePath="/?view=html" />
    </>
  );
}
