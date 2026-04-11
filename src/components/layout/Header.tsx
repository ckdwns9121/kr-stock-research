"use client";

import { useState } from "react";
import Link from "next/link";

const links = [
  { href: "/", label: "홈" },
  { href: "/dashboard", label: "시황" },
  { href: "/sectors", label: "섹터" },
  { href: "/portfolio", label: "AI포트폴리오" },
  { href: "/mindmap", label: "마인드맵" },
  { href: "/discovery", label: "발굴" },
  { href: "/watchlist", label: "관심종목" },
  { href: "/screener", label: "스크리너" },
  { href: "/news", label: "뉴스" },
  { href: "/calendar", label: "캘린더" },
  { href: "/briefing", label: "브리핑" },
];

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-dark-bg/80 backdrop-blur-lg border-b border-dark-border">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-dark-text-primary">
          주식리서치
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-dark-text-secondary hover:text-dark-text-primary transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile hamburger button */}
        <button
          onClick={() => setMenuOpen(true)}
          className="md:hidden text-dark-text-primary p-2 -mr-2"
          aria-label="메뉴 열기"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {/* Mobile overlay menu */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-dark-bg">
          <div className="flex items-center justify-between px-4 h-14 border-b border-dark-border">
            <span className="text-lg font-bold text-dark-text-primary">
              주식리서치
            </span>
            <button
              onClick={() => setMenuOpen(false)}
              className="text-dark-text-primary p-2 -mr-2"
              aria-label="메뉴 닫기"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <nav className="flex flex-col p-6 gap-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="text-lg font-medium text-dark-text-secondary hover:text-dark-text-primary transition-colors py-2 border-b border-dark-border last:border-0"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
