/** Short to-do chips for the admin product list: what still stops a catalogue entry being complete. */
export function catalogueTodo(p: { photo: string | null; imageId: string | null; imageRights: string; infoStatus: string; priceConfirmed: boolean; brandConfirmed: boolean; isDemo: boolean }): string[] {
  const t: string[] = [];
  if (!p.photo && !p.imageId) t.push('No photo');
  else if (p.imageRights === 'NONE' || p.imageRights === 'CLIENT_SUPPLIED') t.push('Photo permission');
  if (!p.brandConfirmed) t.push('Brand');
  if (p.infoStatus !== 'VERIFIED') t.push(p.infoStatus === 'PROVISIONAL' ? 'Label check' : 'Label info');
  if (!p.priceConfirmed) t.push('Price');
  return t;
}
