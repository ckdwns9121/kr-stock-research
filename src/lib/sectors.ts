export interface SectorStock {
  ticker: string;
  name: string;
  description: string;
}

export interface Sector {
  id: string;
  name: string;
  emoji: string;
  stocks: SectorStock[];
}

export const SECTORS: Sector[] = [
  {
    id: "semiconductor",
    name: "반도체",
    emoji: "🔬",
    stocks: [
      { ticker: "005930", name: "삼성전자", description: "메모리·파운드리" },
      { ticker: "000660", name: "SK하이닉스", description: "메모리·HBM" },
      { ticker: "042700", name: "한미반도체", description: "반도체 장비" },
      { ticker: "403870", name: "HPSP", description: "반도체 장비" },
      { ticker: "058470", name: "리노공업", description: "반도체 검사소켓" },
      { ticker: "036930", name: "주성엔지니어링", description: "반도체 장비" },
      { ticker: "166090", name: "하나머티리얼즈", description: "반도체 소재" },
      { ticker: "357780", name: "솔브레인", description: "반도체 화학소재" },
      { ticker: "240810", name: "원익IPS", description: "반도체 장비" },
      { ticker: "950160", name: "코오롱인더스트리", description: "반도체 소재·필름" },
    ],
  },
  {
    id: "space",
    name: "우주·방산",
    emoji: "🚀",
    stocks: [
      { ticker: "047810", name: "한국항공우주", description: "항공기·위성" },
      { ticker: "012450", name: "한화에어로스페이스", description: "항공엔진·방산" },
      { ticker: "064350", name: "현대로템", description: "방산·철도" },
      { ticker: "014970", name: "삼기이브이", description: "우주부품" },
      { ticker: "006400", name: "삼성SDI", description: "배터리·방산전자" },
      { ticker: "272210", name: "한화시스템", description: "방산전자·위성통신" },
      { ticker: "012750", name: "에스원", description: "보안·방산서비스" },
      { ticker: "079550", name: "LIG넥스원", description: "유도무기·방산" },
      { ticker: "222800", name: "심텍", description: "방산전자·PCB" },
      { ticker: "299660", name: "풍산", description: "탄약·방산" },
    ],
  },
  {
    id: "bio",
    name: "바이오",
    emoji: "🧬",
    stocks: [
      { ticker: "207940", name: "삼성바이오로직스", description: "바이오CMO" },
      { ticker: "068270", name: "셀트리온", description: "바이오시밀러" },
      { ticker: "326030", name: "SK바이오팜", description: "신약개발" },
      { ticker: "145020", name: "휴젤", description: "보톡스·필러" },
      { ticker: "141080", name: "레고켐바이오", description: "ADC 항암제" },
      { ticker: "195940", name: "HK이노엔", description: "위장관·바이오" },
      { ticker: "128940", name: "한미약품", description: "제약·바이오신약" },
      { ticker: "005380", name: "유한양행", description: "제약·항암신약" },
      { ticker: "006280", name: "녹십자", description: "혈액제제·백신" },
      { ticker: "302440", name: "SK바이오사이언스", description: "백신·CMO" },
    ],
  },
  {
    id: "battery",
    name: "2차전지",
    emoji: "🔋",
    stocks: [
      { ticker: "373220", name: "LG에너지솔루션", description: "배터리 셀" },
      { ticker: "006400", name: "삼성SDI", description: "배터리 셀" },
      { ticker: "051910", name: "LG화학", description: "양극재·배터리소재" },
      { ticker: "096770", name: "SK이노베이션", description: "배터리·에너지" },
      { ticker: "003670", name: "포스코퓨처엠", description: "양·음극재" },
      { ticker: "247540", name: "에코프로비엠", description: "양극재" },
      { ticker: "086520", name: "에코프로", description: "배터리소재" },
      { ticker: "066970", name: "엘앤에프", description: "양극재" },
      { ticker: "278280", name: "천보", description: "전해질소재" },
      { ticker: "005490", name: "POSCO홀딩스", description: "2차전지 소재" },
    ],
  },
  {
    id: "auto",
    name: "자동차",
    emoji: "🚗",
    stocks: [
      { ticker: "005380", name: "현대차", description: "완성차" },
      { ticker: "000270", name: "기아", description: "완성차" },
      { ticker: "012330", name: "현대모비스", description: "부품" },
      { ticker: "086280", name: "현대글로비스", description: "물류" },
      { ticker: "204320", name: "HL만도", description: "부품" },
      { ticker: "161390", name: "한국타이어앤테크놀로지", description: "타이어" },
      { ticker: "018880", name: "한온시스템", description: "열관리" },
      { ticker: "005850", name: "에스엘", description: "램프" },
      { ticker: "073240", name: "금호타이어", description: "타이어" },
      { ticker: "011210", name: "현대위아", description: "부품·기계" },
    ],
  },
  {
    id: "platform",
    name: "인터넷·플랫폼",
    emoji: "🌐",
    stocks: [
      { ticker: "035420", name: "NAVER", description: "포털·커머스" },
      { ticker: "035720", name: "카카오", description: "플랫폼·모빌리티" },
      { ticker: "036570", name: "엔씨소프트", description: "게임" },
      { ticker: "181710", name: "NHN", description: "결제·게임" },
      { ticker: "067160", name: "SOOP", description: "스트리밍" },
      { ticker: "042000", name: "카페24", description: "쇼핑몰 솔루션" },
      { ticker: "053800", name: "안랩", description: "보안SW" },
      { ticker: "123570", name: "이엠넷", description: "디지털마케팅" },
      { ticker: "064260", name: "다날", description: "결제" },
      { ticker: "078340", name: "컴투스", description: "게임" },
    ],
  },
  {
    id: "finance",
    name: "금융",
    emoji: "🏦",
    stocks: [
      { ticker: "105560", name: "KB금융", description: "은행지주" },
      { ticker: "055550", name: "신한지주", description: "은행지주" },
      { ticker: "086790", name: "하나금융지주", description: "은행지주" },
      { ticker: "316140", name: "우리금융지주", description: "은행지주" },
      { ticker: "138040", name: "메리츠금융지주", description: "종합금융" },
      { ticker: "032830", name: "삼성생명", description: "보험" },
      { ticker: "000810", name: "삼성화재", description: "보험" },
      { ticker: "005830", name: "DB손해보험", description: "보험" },
      { ticker: "071050", name: "한국금융지주", description: "증권" },
      { ticker: "006800", name: "미래에셋증권", description: "증권" },
    ],
  },
  {
    id: "shipbuilding",
    name: "조선·기계",
    emoji: "🛳️",
    stocks: [
      { ticker: "329180", name: "HD현대중공업", description: "조선" },
      { ticker: "009540", name: "HD한국조선해양", description: "조선지주" },
      { ticker: "010140", name: "삼성중공업", description: "조선" },
      { ticker: "042660", name: "한화오션", description: "조선" },
      { ticker: "010620", name: "HD현대미포", description: "중형선" },
      { ticker: "241560", name: "두산밥캣", description: "건설기계" },
      { ticker: "034020", name: "두산에너빌리티", description: "발전설비" },
      { ticker: "010120", name: "LS ELECTRIC", description: "전력기기" },
      { ticker: "298040", name: "효성중공업", description: "전력기기" },
      { ticker: "267260", name: "HD현대일렉트릭", description: "전력기기" },
    ],
  },
  {
    id: "consumer",
    name: "유통·소비재",
    emoji: "🛍️",
    stocks: [
      { ticker: "090430", name: "아모레퍼시픽", description: "화장품" },
      { ticker: "051900", name: "LG생활건강", description: "생활용품" },
      { ticker: "139480", name: "이마트", description: "유통" },
      { ticker: "023530", name: "롯데쇼핑", description: "유통" },
      { ticker: "271560", name: "오리온", description: "식품" },
      { ticker: "097950", name: "CJ제일제당", description: "식품" },
      { ticker: "004370", name: "농심", description: "식품" },
      { ticker: "008770", name: "호텔신라", description: "면세" },
      { ticker: "282330", name: "BGF리테일", description: "편의점" },
      { ticker: "004170", name: "신세계", description: "유통" },
    ],
  },
  {
    id: "media",
    name: "통신·미디어",
    emoji: "📡",
    stocks: [
      { ticker: "017670", name: "SK텔레콤", description: "통신" },
      { ticker: "030200", name: "KT", description: "통신" },
      { ticker: "032640", name: "LG유플러스", description: "통신" },
      { ticker: "035760", name: "CJ ENM", description: "콘텐츠" },
      { ticker: "253450", name: "스튜디오드래곤", description: "드라마 제작" },
      { ticker: "352820", name: "하이브", description: "엔터" },
      { ticker: "035900", name: "JYP Ent.", description: "엔터" },
      { ticker: "041510", name: "에스엠", description: "엔터" },
      { ticker: "122870", name: "와이지엔터테인먼트", description: "엔터" },
      { ticker: "034120", name: "SBS", description: "방송" },
    ],
  },
];

export function getSectorById(sectorId: string): Sector | undefined {
  return SECTORS.find((sector) => sector.id === sectorId);
}
