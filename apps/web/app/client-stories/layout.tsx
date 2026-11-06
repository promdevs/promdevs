import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import "./client-stories.css";

export default function ClientStoriesLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <Header homePath="/?view=html" />
      {children}
      <Footer homePath="/?view=html" />
    </>
  );
}
