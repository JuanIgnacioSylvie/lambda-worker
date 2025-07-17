// services/messageProcessor.js
import { SQSClient, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { getChampionGlobalStats }          from './riotService.js';
import { saveChampionStats, closePools }   from './dbService.js';

const {
  SQS_QUEUE_URL: QueueUrl,
  AWS_REGION,
  RIOT_API_KEY,
} = process.env;

const REGION        = 'la2';                 // región por defecto si el msg no trae una
const LIMIT_MATCHES = 500;                   // para no exceder rate-limit de Riot
const sqs           = new SQSClient({ region: AWS_REGION });

/**
 * Procesa un solo mensaje de SQS.
 * - Calcula estadísticas globales de un campeón
 * - Persiste resultado (o error) en la BD
 * - Borra el mensaje si todo salió bien
 */
export async function processMessage(msg) {
  // 1. Parsear payload
  let championName, region;
  try {
    const body = JSON.parse(msg.Body || '{}');
    championName = body.championName;
    region       = body.region || REGION;
    if (!championName) throw new Error('championName missing in message body');
  } catch (parseErr) {
    console.error('[Worker] JSON parse error:', parseErr.message);
    // borra mensaje corrupto para no atascar la cola
    await safeDelete(msg);
    return;
  }

  // 2. Calcular y guardar stats
  try {
    const stats = await getChampionGlobalStats(
      championName,
      RIOT_API_KEY,
      region,
      LIMIT_MATCHES
    );
    if (!stats) throw new Error('Champion not found');

    await saveChampionStats(championName, { ...stats, status: 'ready' });
    console.log('[Worker] ✓ saved', championName);
  } catch (err) {
    console.error('[Worker] ✗', championName, err.message);
    await saveChampionStats(championName, {
      status:  'error',
      message: err.message,
    });
  } finally {
    await safeDelete(msg);   // borra SIEMPRE para no re-procesar
    await closePools();      // cierra conexiones a la BD
  }
}

/* -------------------------------------------------------------------------- */
/* Utils                                                                      */
/* -------------------------------------------------------------------------- */

async function safeDelete(msg) {
  try {
    await sqs.send(
      new DeleteMessageCommand({
        QueueUrl,
        ReceiptHandle: msg.ReceiptHandle,
      })
    );
  } catch (delErr) {
    // Si falla el delete, el mensaje reaparecerá tras VisibilityTimeout
    console.error('[Worker] DeleteMessage failed:', delErr.message);
  }
}
