#!/usr/bin/env python3
"""
DART OpenAPI에서 코스피/코스닥 전체 상장 종목을 다운로드해
src/data/corp-codes.json을 업데이트하는 스크립트.

사용법:
  python3 scripts/update-corp-codes.py

환경변수:
  DART_API_KEY  — DART OpenAPI 인증키 (없으면 .env.local에서 자동 로드)
"""

import io
import json
import os
import sys
import urllib.request
import urllib.error
import zipfile
import xml.etree.ElementTree as ET


# ── 설정 ──────────────────────────────────────────────────────────────────────

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
OUTPUT_PATH = os.path.join(PROJECT_ROOT, "src", "data", "corp-codes.json")
ENV_PATH = os.path.join(PROJECT_ROOT, ".env.local")

DART_CORP_CODE_URL = "https://opendart.fss.or.kr/api/corpCode.xml?crtfc_key={api_key}"

# KIND (KRX) 상장 법인 목록 다운로드 URL (인증 불필요, euc-kr HTML 테이블)
KIND_LIST_URL = "https://kind.krx.co.kr/corpgeneral/corpList.do"
KIND_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    "Referer": "https://kind.krx.co.kr",
    "Content-Type": "application/x-www-form-urlencoded",
}


# ── 유틸 ──────────────────────────────────────────────────────────────────────

def load_env(path: str) -> dict[str, str]:
    env: dict[str, str] = {}
    if not os.path.exists(path):
        return env
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            env[k.strip()] = v.strip()
    return env


def fetch_bytes(url: str, method: str = "GET", data=None,
                headers=None) -> bytes:
    req = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read()


# ── 1단계: DART 전체 법인 코드 다운로드 ────────────────────────────────────────

def fetch_dart_corp_codes(api_key: str) -> dict[str, dict]:
    """
    DART에서 corpCode.zip을 내려받아 상장 종목만 반환.
    반환값: { corp_name: { ticker, corpCode } }
    """
    print("▶ DART 법인 코드 ZIP 다운로드 중…")
    url = DART_CORP_CODE_URL.format(api_key=api_key)
    raw = fetch_bytes(url)

    print("▶ ZIP 파일 파싱 중…")
    with zipfile.ZipFile(io.BytesIO(raw)) as zf:
        xml_name = next(n for n in zf.namelist() if n.upper().endswith(".XML"))
        xml_bytes = zf.read(xml_name)

    root = ET.fromstring(xml_bytes.decode("utf-8"))
    result: dict[str, dict] = {}

    for item in root.findall("list"):
        corp_code = (item.findtext("corp_code") or "").strip()
        corp_name = (item.findtext("corp_name") or "").strip()
        stock_code = (item.findtext("stock_code") or "").strip()

        # 상장 종목만 (stock_code가 비어있으면 비상장)
        if not stock_code or not corp_code or not corp_name:
            continue

        result[corp_name] = {"ticker": stock_code, "corpCode": corp_code}

    print(f"  → DART 상장 종목 {len(result):,}개")
    return result


# ── 2단계: KRX에서 시장 구분 가져오기 ─────────────────────────────────────────

def fetch_kind_tickers(search_type: str) -> set[str]:
    """
    KIND에서 상장 법인 목록을 내려받아 종목코드 집합 반환.
    search_type: '13' = KOSPI, '14' = KOSDAQ
    """
    body = f"method=download&searchType={search_type}".encode("utf-8")
    try:
        raw = fetch_bytes(KIND_LIST_URL, method="POST", data=body, headers=KIND_HEADERS)
        html = raw.decode("euc-kr", errors="replace")
        tickers: set[str] = set()
        # <td> 셀에서 6자리 숫자 종목코드 추출
        import re
        for m in re.finditer(r"<td[^>]*>\s*(\d{6})\s*</td>", html):
            tickers.add(m.group(1))
        return tickers
    except Exception as e:
        print(f"  ⚠ KIND searchType={search_type} 조회 실패: {e}")
        return set()


def fetch_market_map() -> dict[str, str]:
    """{ ticker: 'KOSPI'|'KOSDAQ' } 형태의 시장 구분 맵 반환."""
    print("▶ KIND(KRX) 시장 구분 조회 중 (KOSPI / KOSDAQ)…")
    kospi = fetch_kind_tickers("13")
    kosdaq = fetch_kind_tickers("14")
    print(f"  → KOSPI {len(kospi):,}개, KOSDAQ {len(kosdaq):,}개")

    market_map: dict[str, str] = {}
    for t in kospi:
        market_map[t] = "KOSPI"
    for t in kosdaq:
        market_map[t] = "KOSDAQ"
    return market_map


# ── 3단계: 병합 후 저장 ────────────────────────────────────────────────────────

def merge_and_save(
    dart_codes: dict[str, dict],
    market_map: dict[str, str],
) -> None:
    merged: dict[str, dict] = {}
    for name, entry in dart_codes.items():
        ticker = entry["ticker"]
        merged[name] = {
            "ticker": ticker,
            "corpCode": entry["corpCode"],
            "market": market_map.get(ticker, "KOSPI"),  # 기본값 KOSPI
        }

    # 종목명 가나다 순 정렬
    sorted_merged = dict(sorted(merged.items()))

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(sorted_merged, f, ensure_ascii=False, indent=2)

    kospi_cnt = sum(1 for v in merged.values() if v["market"] == "KOSPI")
    kosdaq_cnt = sum(1 for v in merged.values() if v["market"] == "KOSDAQ")
    print(f"✅ 저장 완료: {OUTPUT_PATH}")
    print(f"   전체 {len(merged):,}개 (KOSPI {kospi_cnt:,} / KOSDAQ {kosdaq_cnt:,})")


# ── 메인 ──────────────────────────────────────────────────────────────────────

def main() -> None:
    # API 키 로드
    env = load_env(ENV_PATH)
    api_key = os.environ.get("DART_API_KEY") or env.get("DART_API_KEY", "")
    if not api_key:
        print("❌ DART_API_KEY 환경변수 또는 .env.local 파일이 필요합니다.")
        sys.exit(1)

    dart_codes = fetch_dart_corp_codes(api_key)
    market_map = fetch_market_map()
    merge_and_save(dart_codes, market_map)


if __name__ == "__main__":
    main()
