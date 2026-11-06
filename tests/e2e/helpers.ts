import fs from 'node:fs';
import path from 'node:path';
import { expect, type Page } from '@playwright/test';
import sharp from 'sharp';

export type Account = { email: string; password: string };

export function accounts(): { main: Account; lock: Account } {
  return JSON.parse(fs.readFileSync(path.join('.e2e', 'admin.json'), 'utf8'));
}

export async function login(page: Page, account: Account = accounts().main) {
  await page.goto('/admin/giris');
  await page.getByLabel('E-posta').fill(account.email);
  await page.getByLabel('Parola').fill(account.password);
  await page.getByRole('button', { name: 'Giriş yap' }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

export async function imageFile(name: string, width = 800, height = 1000, color = '#9a4060') {
  const buffer = await sharp({ create: { width, height, channels: 3, background: color } })
    .png()
    .toBuffer();
  return { name, mimeType: 'image/png', buffer };
}
