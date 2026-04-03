import { AlbumPhoto } from './types';

export function buildPhotoXml(siteName: string, contractor: string, photos: AlbumPhoto[]): string {
  const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>\n<photoInformation>\n`;
  const xmlFooter = `</photoInformation>`;

  const xmlBody = [
    `  <constructionName>${escapeXml(siteName)}</constructionName>`,
    `  <contractor>${escapeXml(contractor)}</contractor>`,
    `  <photos>`
  ];

  for (const p of photos) {
    const filePath = `PHOTO/${p.caption.workType || '未分類'}/${p.photoId}.jpg`;
    xmlBody.push(`    <photo>`);
    xmlBody.push(`      <fileName>${escapeXml(filePath)}</fileName>`);
    xmlBody.push(`      <date>${escapeXml(p.caption.date)}</date>`);
    xmlBody.push(`      <workType>${escapeXml(p.caption.workType)}</workType>`);
    if (p.caption.subType) {
      xmlBody.push(`      <subType>${escapeXml(p.caption.subType)}</subType>`);
    } else {
      xmlBody.push(`      <subType></subType>`);
    }
    xmlBody.push(`      <location>${escapeXml(p.caption.location)}</location>`);
    xmlBody.push(`      <memo>${escapeXml(p.caption.memo)}</memo>`);
    xmlBody.push(`    </photo>`);
  }

  xmlBody.push(`  </photos>`);

  return xmlHeader + xmlBody.join('\n') + '\n' + xmlFooter;
}

function escapeXml(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
