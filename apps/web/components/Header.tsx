"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ActionLink } from "@/components/Action";

type Group = "expertise" | "work";
const labels = { expertise: "Expertise", work: "Our Work" };

function GroupContent({ group, close }: { group: Group; close: () => void }) {
  return group === "expertise" ? (
    <>
      <p className="nav-intro">Build, improve, and launch.</p>
      {["Replit", "Lovable", "Base44"].map((platform) => (
        <Link
          className="nav-item"
          key={platform}
          href="/#contact"
          onClick={close}
        >
          <span>
            {platform}
            <ArrowUpRight size={15} aria-hidden />
          </span>
          <small>Discuss building or improving your {platform} project.</small>
        </Link>
      ))}
    </>
  ) : (
    <>
      <Link className="nav-item" href="/projects" onClick={close}>
        <span>
          Selected Work
          <ArrowUpRight size={15} aria-hidden />
        </span>
        <small>Explore our products and digital experiences.</small>
      </Link>
      <div className="nav-item nav-unavailable" aria-disabled="true">
        <span>
          Client Stories<small className="nav-soon">Coming soon</small>
        </span>
        <small>The people and stories behind the work.</small>
      </div>
    </>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Group | null>(null);
  const header = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const groupTriggers = useRef<
    Partial<Record<Group, HTMLButtonElement | null>>
  >({});
  const hoverOpened = useRef(false);
  const close = () => {
    setOpen(false);
    setActive(null);
    hoverOpened.current = false;
  };
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) {
        setOpen(false);
        setActive(null);
      }
    };
    const desktop = window.matchMedia("(min-width: 1024px)");
    const resize = () => {
      setOpen(false);
      setActive(null);
    };
    document.addEventListener("pointerdown", outside);
    desktop.addEventListener("change", resize);
    return () => {
      document.removeEventListener("pointerdown", outside);
      desktop.removeEventListener("change", resize);
    };
  }, []);
  const group = (id: Group, mobile = false) => (
    <div
      key={id}
      className={mobile ? "mobile-group" : "nav-group"}
      onPointerEnter={(event) => {
        if (!mobile && event.pointerType === "mouse") {
          hoverOpened.current = true;
          setActive(id);
        }
      }}
      onPointerLeave={(event) => {
        if (!mobile && !event.currentTarget.contains(document.activeElement)) {
          setActive((current) => (current === id ? null : current));
          hoverOpened.current = false;
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setActive((current) => (current === id ? null : current));
      }}
    >
      <button
        type="button"
        className="nav-disclosure"
        ref={(node) => {
          if (mobile === open) groupTriggers.current[id] = node;
        }}
        aria-expanded={active === id}
        aria-controls={(mobile ? "mobile-" : "desktop-") + id}
        onClick={() => {
          setActive(
            !mobile && hoverOpened.current ? id : active === id ? null : id,
          );
          hoverOpened.current = false;
        }}
      >
        {labels[id]}
        <ChevronDown size={13} aria-hidden />
      </button>
      {active === id && (
        <div
          id={(mobile ? "mobile-" : "desktop-") + id}
          className={mobile ? "mobile-group-content" : "nav-panel-wrap"}
        >
          <div className="nav-panel">
            <GroupContent group={id} close={close} />
          </div>
        </div>
      )}
    </div>
  );
  return (
    <header
      ref={header}
      className="site-header"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        if (active) {
          groupTriggers.current[active]?.focus();
          setActive(null);
          hoverOpened.current = false;
        } else if (open) {
          setOpen(false);
          trigger.current?.focus();
        }
        event.stopPropagation();
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
    >
      <div className="shell">
        <div className="header-row">
          <Link
            href="/"
            className="brand"
            aria-label="PromDevs home"
            onClick={close}
          >
            <Image
              src="/images/nobg-logo-black.png"
              width={40}
              height={40}
              alt=""
              className="dark:hidden"
            />
            <Image
              src="/images/nobg-logo-white.png"
              width={40}
              height={40}
              alt=""
              className="hidden dark:block"
            />
            <span>
              <span className="text-black dark:text-white">prom</span>
              <span className="text-accent">devs</span>
            </span>
          </Link>
          <nav className="desktop-nav" aria-label="Main navigation">
            <Link href="/#services" onClick={close}>
              Services
            </Link>
            {group("expertise")}
            {group("work")}
            <Link href="/#about" onClick={close}>
              About
            </Link>
          </nav>
          <div className="header-actions">
            <ThemeToggle />
            <ActionLink
              href="/#contact"
              label="Let's talk"
              className="header-cta"
              onClick={close}
            />
            <button
              ref={trigger}
              type="button"
              className="icon-button mobile-toggle"
              aria-label={open ? "Close navigation" : "Open navigation"}
              aria-expanded={open}
              aria-controls="mobile-nav"
              onClick={() => {
                setOpen(!open);
                setActive(null);
              }}
            >
              {open ? (
                <X size={19} aria-hidden />
              ) : (
                <Menu size={19} aria-hidden />
              )}
            </button>
          </div>
        </div>
        {open && (
          <nav
            id="mobile-nav"
            className="mobile-nav"
            aria-label="Mobile navigation"
          >
            <Link href="/#services" onClick={close}>
              Services
            </Link>
            {group("expertise", true)}
            {group("work", true)}
            <Link href="/#about" onClick={close}>
              About
            </Link>
            <ActionLink
              href="/#contact"
              label="Let's talk"
              className="mobile-contact"
              onClick={close}
            />
          </nav>
        )}
      </div>
    </header>
  );
}
