import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export const generarPDFAnimales = async (animales: any[]) => {
  // Aquí diseñamos el "look" del PDF con HTML y CSS
  const htmlContent = `
    <html>
      <head>
        <style>
          body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; }
          h1 { color: #1f2937; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #4b5563; color: white; padding: 10px; text-align: left; }
          td { border-bottom: 1px solid #ddd; padding: 10px; }
          .footer { margin-top: 30px; font-size: 10px; text-align: center; color: #999; }
        </style>
      </head>
      <body>
        <h1>Reporte de Inventario Ganadero</h1>
        <table>
          <thead>
            <tr>
              <th>Arete</th>
              <th>Tipo</th>
              <th>Peso (kg)</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${animales.map(a => `
              <tr>
                <td>${a.numero_arete}</td>
                <td>${a.tipo_animal}</td>
                <td>${a.peso || 'N/A'}</td>
                <td>${a.estado || 'Activo'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">Generado por Mi App Ganadera - ${new Date().toLocaleDateString()}</div>
      </body>
    </html>
  `;

  try {
    // 1. Crear el archivo PDF temporal
    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    
    // 2. Abrir el menú de compartir (WhatsApp, Drive, etc.)
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
  } catch (error) {
    console.error("Error generando PDF:", error);
  }
};