const queue = [];
const methodBuckets = {};

let MAX_PER_10SEC = +process.env.RIOT_PER_10SEC || 500;
let MAX_PER_10MIN = +process.env.RIOT_PER_10MIN || 30000;
let tokensPer10Sec = MAX_PER_10SEC;
let tokensPer10Min = MAX_PER_10MIN;

function canUseMethod(url) {
  try {
    const path = new URL(url).pathname;
    const now = Date.now();
    for (const key of Object.keys(methodBuckets)) {
      if (!key.startsWith(path + ':')) continue;
      const b = methodBuckets[key];
      if (now - b.last >= b.window * 1000) {
        b.tokens = b.max;
        b.last = now;
      }
      if (b.tokens <= 0) return false;
    }
    return true;
  } catch (_) {
    return true;
  }
}

function consumeMethod(url) {
  try {
    const path = new URL(url).pathname;
    const now = Date.now();
    for (const key of Object.keys(methodBuckets)) {
      if (!key.startsWith(path + ':')) continue;
      const b = methodBuckets[key];
      if (now - b.last >= b.window * 1000) {
        b.tokens = b.max;
        b.last = now;
      }
      if (b.tokens > 0) b.tokens -= 1;
    }
  } catch (_) {}
}

function processQueue() {
  while (queue.length) {
    const { resolve, url } = queue[0];
    if (tokensPer10Sec > 0 && tokensPer10Min > 0 && canUseMethod(url)) {
      queue.shift();
      tokensPer10Sec -= 1;
      tokensPer10Min -= 1;
      consumeMethod(url);
      resolve();
    } else {
      break;
    }
  }
}

setInterval(() => {
  tokensPer10Sec = MAX_PER_10SEC;
  processQueue();
}, 10000);

setInterval(() => {
  tokensPer10Min = MAX_PER_10MIN;
  processQueue();
}, 600000);

function schedule(url) {
  return new Promise((resolve) => {
    queue.push({ resolve, url });
    processQueue();
  });
}

function syncLimits(header) {
  if (!header) return;
  const parts = header.split(',').map((p) => p.trim());
  for (const part of parts) {
    const [limit, window] = part.split(':').map((v) => parseInt(v, 10));
    if (window === 10) {
      MAX_PER_10SEC = limit;
      tokensPer10Sec = limit;
    } else if (window === 600) {
      MAX_PER_10MIN = limit;
      tokensPer10Min = limit;
    }
  }
}

function syncMethod(header, url) {
  if (!header || !url) return;
  try {
    const path = new URL(url).pathname;
    const parts = header.split(',').map((p) => p.trim());
    for (const part of parts) {
      const [limit, window] = part.split(':').map((v) => parseInt(v, 10));
      const key = `${path}:${window}`;
      methodBuckets[key] = { max: limit, tokens: limit, window, last: Date.now() };
    }
  } catch (_) {}
}

module.exports = { schedule, syncLimits, syncMethod };
