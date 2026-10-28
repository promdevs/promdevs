import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import "./projects.css";

export default function ProjectsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header homePath="/?view=html" />
      {children}
      <Footer homePath="/?view=html" />
    </>
  );
}
