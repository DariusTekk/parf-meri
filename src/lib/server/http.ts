import { NextResponse } from 'next/server';

export type ErrorCode =
  | 'yetkisiz'
  | 'yasak'
  | 'bulunamadi'
  | 'gecersiz'
  | 'cakisma'
  | 'cok_fazla_istek'
  | 'cok_buyuk'
  | 'desteklenmeyen_tur'
  | 'sunucu_hatasi';

const STATUS: Record<ErrorCode, number> = {
  yetkisiz: 401,
  yasak: 403,
  bulunamadi: 404,
  gecersiz: 422,
  cakisma: 409,
  cok_fazla_istek: 429,
  cok_buyuk: 413,
  desteklenmeyen_tur: 415,
  sunucu_hatasi: 500,
};

export function apiError(
  code: ErrorCode,
  message: string,
  fields?: Record<string, string>,
): NextResponse {
  return NextResponse.json(
    { hata: { kod: code, mesaj: message, ...(fields ? { alanlar: fields } : {}) } },
    { status: STATUS[code], headers: { 'Cache-Control': 'no-store' } },
  );
}

export function apiOk(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export class HttpError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

/** Route handler sarmalayıcısı: beklenen hataları tutarlı gövdeye çevirir, yığın izi sızdırmaz. */
export function handle<Args extends unknown[]>(
  fn: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof HttpError) return apiError(error.code, error.message, error.fields);
      console.error('İstek işlenemedi:', error instanceof Error ? error.name : 'bilinmeyen hata');
      return apiError('sunucu_hatasi', 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };
}
