// src/services/customer.service.js
import logger from '../utils/logger.js';

// Simulación de base de datos en memoria
const customers = new Map();

/**
 * Obtiene un cliente por número de teléfono
 * @param {string} phone Número de teléfono
 * @returns {object|null} Datos del cliente o null si no existe
 */
export async function getCustomerByPhone(phone) {
  try {
    const customer = customers.get(phone) || null;
    logger.info(`Cliente obtenido: ${phone}`);
    return customer;
  } catch (error) {
    logger.error('Error retrieving customer:', error);
    throw error;
  }
}

/**
 * Guarda o actualiza un cliente
 * @param {string} phone Número de teléfono
 * @param {object} data Datos del cliente
 */
export async function saveCustomer(phone, data) {
  try {
    customers.set(phone, data);
    logger.info(`Cliente guardado: ${phone}`);
  } catch (error) {
    logger.error('Error saving customer:', error);
    throw error;
  }
}