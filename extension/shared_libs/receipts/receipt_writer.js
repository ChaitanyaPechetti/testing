const fs = require("fs");
const path = require("path");

const handles = new Map();

const ensureDir = (filePath) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const openHandle = (filePath) => {
  ensureDir(filePath);
  const fd = fs.openSync(filePath, "a+");
  const stat = fs.fstatSync(fd);
  return { fd, stat, lastSize: stat.size };
};

const rotated = (currentStat, cached) => {
  if (!cached) return true;
  if (!currentStat) return true;
  if (currentStat.dev !== cached.stat.dev || currentStat.ino !== cached.stat.ino) return true;
  if (currentStat.size < cached.lastSize) return true;
  return false;
};

const getHandle = (filePath) => {
  let cached = handles.get(filePath);
  let stat = null;
  try {
    stat = fs.statSync(filePath);
  } catch (_) {
    stat = null;
  }

  if (rotated(stat, cached)) {
    if (cached && cached.fd) {
      try {
        fs.closeSync(cached.fd);
      } catch (_) {
        /* ignore */
      }
    }
    cached = openHandle(filePath);
    handles.set(filePath, cached);
  }

  return cached;
};

const appendReceipt = (receipt, filePath = path.join(process.cwd(), "receipts.log")) => {
  if (!receipt || typeof receipt !== "object") {
    throw new Error("receipt must be an object");
  }
  const line = `${JSON.stringify(receipt)}\n`;
  const handle = getHandle(filePath);
  if (handle.lastSize > 0) {
    const tail = Buffer.alloc(1);
    const bytes = fs.readSync(handle.fd, tail, 0, 1, handle.lastSize - 1);
    if (bytes === 1 && tail[0] !== 0x0a) {
      fs.writeSync(handle.fd, Buffer.from("\n"));
      handle.lastSize += 1;
    }
  }
  const buffer = Buffer.from(line, "utf8");
  fs.writeSync(handle.fd, buffer, 0, buffer.length, null);
  fs.fsyncSync(handle.fd);
  handle.lastSize += buffer.length;
};

const readReceiptsSafe = (filePath = path.join(process.cwd(), "receipts.log")) => {
  if (!fs.existsSync(filePath)) return [];
  const receipts = [];
  const fd = fs.openSync(filePath, "r");
  const chunkSize = 64 * 1024;
  const buffers = [];

  try {
    let filePos = 0;
    let leftover = "";
    const stats = fs.fstatSync(fd);
    while (filePos < stats.size) {
      const remaining = stats.size - filePos;
      const readSize = Math.min(chunkSize, remaining);
      const buffer = Buffer.alloc(readSize);
      const bytesRead = fs.readSync(fd, buffer, 0, readSize, filePos);
      filePos += bytesRead;
      leftover += buffer.toString("utf8", 0, bytesRead);
      const parts = leftover.split("\n");
      leftover = parts.pop(); // last segment may be incomplete
      parts.forEach((line) => {
        if (!line) return;
        try {
          receipts.push(JSON.parse(line));
        } catch (_) {
          /* skip invalid line */
        }
      });
    }
    // ignore leftover if not a valid JSON line (partial write)
    return receipts;
  } finally {
    fs.closeSync(fd);
  }
};

module.exports = {
  appendReceipt,
  readReceiptsSafe
};
