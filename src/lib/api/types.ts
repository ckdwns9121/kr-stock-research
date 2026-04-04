export interface DartCompanyInfo {
  corp_code: string;
  corp_name: string;
  stock_code: string;
  corp_cls: string;
  ceo_nm: string;
  induty_code: string;
}

export interface DartFinancialAccount {
  rcept_no: string;
  bsns_year: string;
  corp_code: string;
  stock_code: string;
  reprt_code: string;
  account_nm: string;
  fs_div: string;
  sj_div: string;
  thstrm_nm: string;
  thstrm_amount: string;
  frmtrm_nm: string;
  frmtrm_amount: string;
  bfefrmtrm_nm: string;
  bfefrmtrm_amount: string;
}

export interface DartResponse<T> {
  status: string;
  message: string;
  list?: T[];
}

export interface CorpCodeEntry {
  code: string;
  name: string;
  ticker: string;
  market: string;
}

export interface NaverChartRaw {
  date: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  stale?: boolean;
  cachedAt?: number;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
