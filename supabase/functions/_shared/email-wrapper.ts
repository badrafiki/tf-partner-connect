// Shared TF USA branded email wrapper for all transactional emails

const LOGO_URL = "https://total-filtration.com/wp-content/uploads/2023/10/tf-logo.png";

export function wrapEmail(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#F8F9FA;font-family:Arial,sans-serif;">

<!-- Header -->
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1B3A6B;">
  <tr>
    <td style="padding:20px 32px;">
      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:22px;font-weight:bold;color:#FFFFFF;letter-spacing:0.5px;">
            TOTAL <span style="color:#CC2027;">FILTRATION</span>
          </td>
        </tr>
        <tr>
          <td style="font-size:11px;color:#9CA3AF;letter-spacing:2px;padding-top:2px;">USA</td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- Body -->
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8F9FA;">
  <tr>
    <td style="padding:32px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background-color:#FFFFFF;border-radius:8px;border:1px solid #E5E7EB;">
        <tr>
          <td style="padding:32px;font-family:Arial,sans-serif;font-size:15px;color:#2D2D2D;line-height:1.6;">
            ${bodyHtml}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

<!-- Footer -->
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8F9FA;">
  <tr>
    <td style="padding:16px 32px 32px;text-align:center;">
      <p style="margin:0 0 4px;font-size:12px;color:#6B7280;font-family:Arial,sans-serif;">
        Total Filtration USA LLC
      </p>
      <p style="margin:0 0 4px;font-size:12px;color:#9CA3AF;font-family:Arial,sans-serif;">
        14422 Shoreside Way, Suite 110 #132, Winter Garden, Florida 34787
      </p>
      <p style="margin:0 0 12px;font-size:12px;color:#9CA3AF;font-family:Arial,sans-serif;">
        +1-407-842-0818 | <a href="mailto:partners@total-filtration.com" style="color:#1B3A6B;text-decoration:none;">partners@total-filtration.com</a>
      </p>
      <p style="margin:0;font-size:11px;color:#9CA3AF;font-family:Arial,sans-serif;">
        <a href="https://partners.total-filtration.com/privacy" style="color:#6B7280;text-decoration:none;">Privacy Policy</a>
        &nbsp;·&nbsp;
        <a href="https://partners.total-filtration.com/terms" style="color:#6B7280;text-decoration:none;">Terms &amp; Conditions</a>
      </p>
    </td>
  </tr>
</table>

</body>
</html>`;
}

export function h1(text: string): string {
  return `<h1 style="font-family:Arial,sans-serif;color:#1B3A6B;font-size:22px;font-weight:600;margin:0 0 16px;">${text}</h1>`;
}

export function h2(text: string): string {
  return `<h2 style="font-family:Arial,sans-serif;color:#1B3A6B;font-size:18px;font-weight:600;margin:24px 0 12px;">${text}</h2>`;
}

export function ctaButton(text: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background-color:#1B3A6B;color:#FFFFFF;padding:12px 24px;border-radius:6px;font-weight:600;text-decoration:none;font-family:Arial,sans-serif;font-size:14px;margin:16px 0;">${text}</a>`;
}

export function dataTable(headers: string[], rows: string[][]): string {
  const thStyle = `style="padding:10px 12px;background-color:#1B3A6B;color:#FFFFFF;font-size:12px;font-weight:600;text-align:left;font-family:Arial,sans-serif;"`;
  const thHtml = headers.map(h => `<th ${thStyle}>${h}</th>`).join("");
  const rowsHtml = rows.map((row, i) => {
    const bg = i % 2 === 1 ? "#F8F9FA" : "#FFFFFF";
    const tdStyle = `style="padding:8px 12px;border-bottom:1px solid #E5E7EB;font-size:13px;font-family:Arial,sans-serif;color:#2D2D2D;background-color:${bg};"`;
    return `<tr>${row.map(cell => `<td ${tdStyle}>${cell}</td>`).join("")}</tr>`;
  }).join("");
  return `<table style="border-collapse:collapse;width:100%;margin:16px 0;border:1px solid #E5E7EB;border-radius:6px;">
    <thead><tr>${thHtml}</tr></thead>
    <tbody>${rowsHtml}</tbody>
  </table>`;
}

export function keyValue(label: string, value: string): string {
  return `<p style="margin:4px 0;font-size:15px;color:#2D2D2D;font-family:Arial,sans-serif;line-height:1.6;"><strong style="color:#1B3A6B;">${label}:</strong> ${value}</p>`;
}

export function signoff(): string {
  return `<p style="margin:24px 0 0;color:#6B7280;font-size:14px;font-family:Arial,sans-serif;">The TF USA Team</p>`;
}
