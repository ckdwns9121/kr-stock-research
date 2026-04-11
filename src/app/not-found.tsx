import Link from "next/link";
import { Card } from "@/components/ui/Card";

export default function NotFound() {
  return (
    <div className="py-12">
      <Card className="text-center py-12">
        <p className="text-3xl sm:text-4xl font-bold text-dark-text-muted mb-4">404</p>
        <p className="text-dark-text-primary font-medium">
          페이지를 찾을 수 없습니다
        </p>
        <Link
          href="/"
          className="inline-block mt-4 px-4 py-2 bg-toss-blue text-white rounded-xl text-sm font-medium hover:bg-toss-blue-dark transition-colors"
        >
          홈으로 돌아가기
        </Link>
      </Card>
    </div>
  );
}
