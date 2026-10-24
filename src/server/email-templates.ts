import 'server-only';
import { env } from './env';

export interface TemplateInput {
  heading: string;
  paragraphs: string[];
  details?: [string, string][];
  cta?: { label: string; url: string };
  footnote?: string;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** A plain-text body plus a simple, accessible HTML version in the Reset colours. Inline styles only (email clients ignore stylesheets). */
export function emailTemplate(t: TemplateInput): { body: string; html: string } {
  const text = [
    t.heading,
    '',
    ...t.paragraphs,
    ...(t.details?.length ? ['', ...t.details.map(([k, v]) => `${k}: ${v}`)] : []),
    ...(t.cta ? ['', `${t.cta.label}: ${t.cta.url}`] : []),
    ...(t.footnote ? ['', t.footnote] : []),
    '',
    '— Reset Pharmacy',
  ].join('\n');
  const rows = (t.details ?? []).map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#52665c;font-size:14px;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;font-size:14px;font-weight:600;color:#10261d">${esc(v)}</td></tr>`).join('');
  const html = `<!doctype html><html lang="en"><body style="margin:0;background:#f4fbf7;font-family:Arial,Helvetica,sans-serif;color:#10261d">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4fbf7;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #d6e8de">
<tr><td style="background:#006b45;padding:20px 28px;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:.04em">RESET <span style="font-weight:400;letter-spacing:.18em;font-size:12px">PHARMACY</span></td></tr>
<tr><td style="padding:28px"><h1 style="margin:0 0 14px;font-size:22px;line-height:1.25;color:#006b45">${esc(t.heading)}</h1>
${t.paragraphs.map((p) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6">${esc(p)}</p>`).join('')}
${rows ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:14px 0;background:#f4fbf7;border-radius:12px;padding:10px 16px;width:100%">${rows}</table>` : ''}
${t.cta ? `<p style="margin:22px 0 6px"><a href="${esc(t.cta.url)}" style="display:inline-block;background:#006b45;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:999px;font-size:15px">${esc(t.cta.label)}</a></p>` : ''}
${t.footnote ? `<p style="margin:16px 0 0;font-size:12.5px;color:#52665c;line-height:1.5">${esc(t.footnote)}</p>` : ''}
</td></tr>
<tr><td style="padding:16px 28px;background:#ddf7e9;font-size:12px;color:#2c5a46">Reset Pharmacy · <a href="${esc(env.APP_URL)}" style="color:#006b45">${esc(env.APP_URL.replace(/^https?:\/\//, ''))}</a><br>Health information on this message is for you only. If it reached you by mistake, please delete it and tell us.</td></tr>
</table></td></tr></table></body></html>`;
  return { body: text, html };
}
