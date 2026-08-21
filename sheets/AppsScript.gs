/**
 * NexaPharm — registro de pedidos en Google Sheets.
 *
 * Cómo instalarlo (una sola vez):
 *   1. Crea una hoja de cálculo nueva en Google Sheets (el nombre no importa).
 *   2. Menú Extensiones → Apps Script.
 *   3. Borra el contenido de "Código.gs" y pega TODO este archivo.
 *   4. Guarda (icono de disco o Ctrl/Cmd+S).
 *   5. Implementar → Nueva implementación → tipo "Aplicación web".
 *      - Ejecutar como: Yo (tu cuenta)
 *      - Quién tiene acceso: Cualquier usuario
 *      - Haz clic en "Implementar" y autoriza los permisos que pida.
 *   6. Copia la URL que te da ("URL de la aplicación web", termina en /exec).
 *      Esa es tu SHEETS_WEBHOOK_URL — la pegas como variable de entorno en Vercel.
 *
 * Si luego editas este código, tienes que volver a "Implementar" → "Gestionar
 * implementaciones" → lápiz de editar → "Nueva versión" para que los cambios
 * se apliquen (guardar el archivo solo no actualiza la URL publicada).
 */

const SHEET_NAME = 'Pedidos';
const HEADERS = [
  'Fecha', 'ID de orden', 'Correo', 'Productos', 'Subtotal',
  'Descuento', 'Envío', 'Impuestos', 'Total', 'Moneda',
  'Código promo', 'Método de pago',
];

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = getOrCreateSheet();

    sheet.appendRow([
      data.date || new Date().toISOString(),
      data.orderId || '',
      data.email || '',
      data.cart || '',
      data.subtotal || '',
      data.discount || '',
      data.shipping || '',
      data.tax || '',
      data.total || '',
      data.currency || '',
      data.promoCode || '',
      data.paymentMethod || '',
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}
