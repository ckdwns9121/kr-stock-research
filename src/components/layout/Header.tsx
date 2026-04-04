import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-toss-gray-100">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold text-toss-gray-900">
          주식리서치
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/"
            className="text-sm font-medium text-toss-gray-600 hover:text-toss-gray-900 transition-colors"
          >
            홈
          </Link>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-toss-gray-600 hover:text-toss-gray-900 transition-colors"
          >
            시황
          </Link>
          <Link
            href="/sectors"
            className="text-sm font-medium text-toss-gray-600 hover:text-toss-gray-900 transition-colors"
          >
            섹터
          </Link>
          <Link
            href="/portfolio"
            className="text-sm font-medium text-toss-gray-600 hover:text-toss-gray-900 transition-colors"
          >
            포트폴리오
          </Link>
          <Link
            href="/news"
            className="text-sm font-medium text-toss-gray-600 hover:text-toss-gray-900 transition-colors"
          >
            뉴스
          </Link>
        </nav>
      </div>
    </header>
  );
}
