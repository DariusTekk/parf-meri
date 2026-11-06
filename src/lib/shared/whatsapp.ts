/** Yalnızca kullanıcı tıkladığında açılan wa.me bağlantısı; sayfa yüklenirken dış istek olmaz. */
export function whatsappUrl(number: string, text: string): string | null {
  const digits = number.replace(/\D/g, '');
  if (digits.length < 10) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
