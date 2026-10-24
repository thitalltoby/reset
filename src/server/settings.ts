import 'server-only';
import { db } from './db';

export * from './settings-defaults';
import { DEFAULTS, type CompanySettings, type ShopSettings, type NotificationSettings, type SecuritySettings, type NoticeSettings, type SeoSettings, type LegalSettings } from './settings-defaults';

export type SettingKey = keyof typeof DEFAULTS;
type Map = { company: CompanySettings; shop: ShopSettings; notifications: NotificationSettings; security: SecuritySettings; notice: NoticeSettings; seo: SeoSettings; legal: LegalSettings };

export async function getSetting<K extends SettingKey>(key: K): Promise<Map[K]> {
  const row = await db.siteSetting.findUnique({ where: { key } });
  const def = DEFAULTS[key] as unknown as Map[K];
  if (!row) return def;
  return { ...(def as object), ...(row.value as object) } as Map[K];
}

export async function setSetting<K extends SettingKey>(key: K, value: Map[K], updatedBy?: string) {
  await db.siteSetting.upsert({
    where: { key },
    create: { key, value: value as object, updatedBy: updatedBy ?? null },
    update: { value: value as object, updatedBy: updatedBy ?? null },
  });
}
