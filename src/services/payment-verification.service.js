// src/services/payment-verification.service.js
import vision from '@google-cloud/vision';
import logger from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

// Inicializar cliente de Vision API usando las mismas credenciales de Firebase
let visionClient = null;

try {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credentialsPath && fs.existsSync(credentialsPath)) {
    visionClient = new vision.ImageAnnotatorClient({
      keyFilename: credentialsPath
    });
    logger.info('Google Cloud Vision API inicializado correctamente');
  } else {
    logger.warn('No se encontraron credenciales de Google Cloud - verificación de comprobantes desactivada');
  }
} catch (error) {
  logger.error('Error inicializando Google Cloud Vision:', error);
}

/**
 * Extrae texto de una imagen usando Google Cloud Vision OCR
 * @param {Buffer} imageBuffer - Buffer de la imagen
 * @returns {Promise<string>} - Texto extraído
 */
async function extractTextFromImage(imageBuffer) {
  if (!visionClient) {
    throw new Error('Google Cloud Vision no está disponible');
  }

  try {
    const [result] = await visionClient.textDetection(imageBuffer);
    const detections = result.textAnnotations;
    
    if (!detections || detections.length === 0) {
      logger.warn('No se detectó texto en la imagen');
      return '';
    }
    
    // El primer elemento contiene todo el texto
    const fullText = detections[0].description;
    logger.info('Texto extraído de la imagen (primeros 200 caracteres):', fullText.substring(0, 200));
    
    return fullText;
  } catch (error) {
    logger.error('Error en OCR de Google Vision:', error);
    throw error;
  }
}

/**
 * Extrae el monto de un texto
 * @param {string} text - Texto a analizar
 * @returns {number|null} - Monto encontrado o null
 */
function extractAmount(text) {
  // Patrones para buscar montos en pesos colombianos
  const patterns = [
    /\$\s*(\d{1,3}(?:[.,]\d{3})*)/g,  // $13.000 o $13,000
    /(\d{1,3}(?:[.,]\d{3})*)\s*COP/gi, // 13.000 COP
    /(?:valor|monto|total|transferencia).*?\$?\s*(\d{1,3}(?:[.,]\d{3})*)/gi,
    /\$?\s*(\d{1,3}(?:[.,]\d{3})*)\s*(?:pesos|cop)/gi
  ];

  const amounts = [];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const amountStr = match[1].replace(/[.,]/g, '');
      const amount = parseInt(amountStr, 10);
      if (amount >= 1000 && amount <= 1000000) { // Validar rango razonable
        amounts.push(amount);
      }
    }
  }

  if (amounts.length === 0) return null;
  
  // Retornar el monto más común o el mayor si son diferentes
  const mostCommon = amounts.sort((a, b) => 
    amounts.filter(v => v === a).length - amounts.filter(v => v === b).length
  ).pop();
  
  return mostCommon;
}

/**
 * Extrae la fecha de un texto
 * @param {string} text - Texto a analizar
 * @returns {Date|null} - Fecha encontrada o null
 */
function extractDate(text) {
  const today = new Date();
  const currentYear = today.getFullYear();
  
  // Patrones de fecha mejorados
  const patterns = [
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/g,  // DD/MM/YYYY o DD-MM-YYYY
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})/g,  // DD/MM/YY
    /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/g,  // YYYY/MM/DD
    /(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(\d{1,2})\s+(?:de\s+)?(\d{4})/gi, // Mes DD de YYYY
    /(\d{1,2})\s+(?:de\s+)?(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+(?:de\s+)?(\d{4})/gi, // DD de Mes de YYYY
    /(\d{1,2})\s+(?:de\s+)?(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)[a-z]*\s+(?:de\s+)?(\d{4}|\d{2})/gi // DD de mes de YYYY (abreviado)
  ];

  const monthMap = {
    enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
    julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
    ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
    jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11
  };

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      try {
        let day, month, year;
        
        // Detectar si match[1] o match[2] es el nombre del mes
        const monthName1 = match[1] && isNaN(match[1]) ? match[1].toLowerCase() : null;
        const monthName2 = match[2] && isNaN(match[2]) ? match[2].toLowerCase() : null;
        
        if (monthName1) {
          // Formato: Mes DD de YYYY (ej: "Diciembre 03 de 2025")
          month = monthMap[monthName1] ?? monthMap[monthName1.substring(0, 3)];
          day = parseInt(match[2]);
          year = parseInt(match[3]);
        } else if (monthName2) {
          // Formato: DD de Mes de YYYY (ej: "03 de Diciembre de 2025")
          day = parseInt(match[1]);
          month = monthMap[monthName2] ?? monthMap[monthName2.substring(0, 3)];
          year = match[3].length === 2 ? 2000 + parseInt(match[3]) : parseInt(match[3]);
        } else if (match[1].length === 4) {
          // Formato YYYY/MM/DD
          year = parseInt(match[1]);
          month = parseInt(match[2]) - 1;
          day = parseInt(match[3]);
        } else {
          // Formato DD/MM/YYYY o DD/MM/YY
          day = parseInt(match[1]);
          month = parseInt(match[2]) - 1;
          year = match[3].length === 2 ? 2000 + parseInt(match[3]) : parseInt(match[3]);
        }
        
        // Validar que tengamos valores válidos
        if (isNaN(day) || isNaN(month) || isNaN(year) || month < 0 || month > 11) {
          continue;
        }
        
        const date = new Date(year, month, day);
        
        // Validar que la fecha sea razonable (no en el futuro, no más de 7 días atrás)
        const daysDiff = (today - date) / (1000 * 60 * 60 * 24);
        if (daysDiff >= 0 && daysDiff <= 7) {
          return date;
        }
      } catch (e) {
        continue;
      }
    }
  }
  
  return null;
}

/**
 * Detecta el banco/método de pago en el texto
 * @param {string} text - Texto a analizar
 * @returns {string|null} - Nombre del banco detectado
 */
function detectBank(text) {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('nequi')) return 'Nequi';
  if (lowerText.includes('daviplata') || lowerText.includes('davivienda')) return 'Daviplata';
  if (lowerText.includes('bancolombia')) return 'Bancolombia';
  if (lowerText.includes('banco de bogota') || lowerText.includes('bogotá')) return 'Banco de Bogotá';
  if (lowerText.includes('bbva')) return 'BBVA';
  
  return null;
}

/**
 * Verifica si una imagen es un comprobante de pago válido
 * @param {Buffer} imageBuffer - Buffer de la imagen
 * @param {number} expectedAmount - Monto esperado en pesos
 * @param {string} expectedPaymentMethod - Método de pago esperado (Nequi, Daviplata, etc.)
 * @returns {Promise<Object>} - Resultado de la verificación
 */
export async function verifyPaymentReceipt(imageBuffer, expectedAmount, expectedPaymentMethod) {
  try {
    if (!visionClient) {
      return {
        success: false,
        verified: false,
        reason: 'Sistema de verificación no disponible',
        manualReview: true
      };
    }

    // Extraer texto de la imagen
    const extractedText = await extractTextFromImage(imageBuffer);
    
    if (!extractedText || extractedText.length < 20) {
      return {
        success: false,
        verified: false,
        reason: 'No se pudo leer texto en la imagen',
        manualReview: true
      };
    }

    // Extraer información
    const amount = extractAmount(extractedText);
    const date = extractDate(extractedText);
    const bank = detectBank(extractedText);

    logger.info(`Análisis del comprobante - Monto: ${amount}, Fecha: ${date}, Banco: ${bank}`);

    // Validaciones
    const validations = {
      hasAmount: amount !== null,
      amountMatches: amount === expectedAmount,
      hasDate: date !== null,
      isToday: false,
      bankMatches: false
    };

    if (date) {
      const today = new Date();
      validations.isToday = 
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
    }

    if (bank && expectedPaymentMethod) {
      validations.bankMatches = bank.toLowerCase().includes(expectedPaymentMethod.toLowerCase()) ||
                                expectedPaymentMethod.toLowerCase().includes(bank.toLowerCase());
    }

    // Determinar si está verificado
    // CAMBIO: Aceptar si monto y fecha coinciden, independientemente del método de pago
    const verified = 
      validations.hasAmount &&
      validations.amountMatches &&
      validations.hasDate &&
      validations.isToday;

    let reason = '';
    const warnings = []; // Advertencias que no invalidan el comprobante
    
    if (!verified) {
      const issues = [];
      if (!validations.hasAmount) issues.push('no se detectó monto');
      else if (!validations.amountMatches) issues.push(`monto diferente ($${amount} vs $${expectedAmount})`);
      if (!validations.hasDate) issues.push('no se detectó fecha');
      else if (!validations.isToday) issues.push('fecha diferente al día de hoy');
      
      reason = issues.join(', ');
    }
    
    // Advertir si el método de pago es diferente, pero no invalidar
    if (expectedPaymentMethod && !validations.bankMatches && bank) {
      warnings.push(`Método de pago: ${bank} (esperado: ${expectedPaymentMethod})`);
    }

    return {
      success: true,
      verified,
      reason: verified ? 'Comprobante verificado correctamente' : reason,
      warnings: warnings.length > 0 ? warnings : null,
      details: {
        extractedAmount: amount,
        expectedAmount,
        extractedDate: date ? date.toLocaleDateString('es-CO') : null,
        extractedBank: bank,
        expectedBank: expectedPaymentMethod
      },
      validations,
      manualReview: !verified
    };

  } catch (error) {
    logger.error('Error verificando comprobante:', error);
    return {
      success: false,
      verified: false,
      reason: 'Error al procesar la imagen',
      manualReview: true,
      error: error.message
    };
  }
}

/**
 * Verifica si Google Cloud Vision está disponible
 * @returns {boolean}
 */
export function isVisionAvailable() {
  return visionClient !== null;
}
