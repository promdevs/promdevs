"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Home", href: "#home" },
  { label: "Services", href: "#services" },
  { label: "About", href: "#about" },
  { label: "Contact", href: "#contact" }
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200/70 bg-white/90 backdrop-blur-sm dark:border-white/10 dark:bg-black/90">
      <div className="mx-auto w-full max-w-6xl px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between">
          <Link
            href="#home"
            onClick={closeMenu}
            className="flex items-center gap-1 rounded-xl pr-3 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black sm:gap-2"
            aria-label="PromDevs home"
          >
            <span className="relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl sm:h-11 sm:w-11">
              <Image
                src="/images/nobg-logo-black.png"
                alt="PromDevs logo"
                width={44}
                height={44}
                className="block dark:hidden"
                priority
              />
              <Image
                src="/images/nobg-logo-white.png"
                alt="PromDevs logo"
                width={44}
                height={44}
                className="hidden dark:block"
                priority
              />
            </span>
            <span className="text-lg font-museo-moderno font-semibold tracking-tight sm:text-xl">
              <span className="text-black dark:text-white">prom</span>
              <span className="text-accent">devs</span>
            </span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <nav className="hidden items-center gap-5 md:flex">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="text-sm text-neutral-600 transition-colors hover:text-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:text-neutral-300 dark:focus-visible:ring-offset-black"
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <ThemeToggle />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              aria-label="Toggle navigation menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="h-10 w-10 md:hidden"
            >
              {menuOpen ? (
                <X aria-hidden className="h-4 w-4" />
              ) : (
                <Menu aria-hidden className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <nav
          id="mobile-nav"
          className={`overflow-hidden transition-all duration-300 md:hidden ${
            menuOpen ? "max-h-80 pt-3 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="rounded-2xl border border-neutral-200 bg-white p-2 shadow-soft dark:border-white/10 dark:bg-neutral-950 dark:shadow-soft-dark">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className="block rounded-xl px-3 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 dark:text-neutral-200 dark:hover:bg-white/10 dark:focus-visible:ring-offset-black"
              >
                {item.label}
              </a>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
