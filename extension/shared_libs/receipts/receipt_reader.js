const fs = require("fs");
const path = require("path");

const RECEIPTS_DEFAULT_PATH = path.join(process.cwd(), "receipts.log");

const isValidSnapshotHash = (value) => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const isValidPolicyVersionIds = (value) =>
  Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === "string");

const parseLine = (line) => {
  if (!line) return null;
  try {
    const obj = JSON.parse(line);
    if (!obj || typeof obj !== "object") return null;
    return obj;
  } catch (_) {
    return null;
  }
};

const streamReceipts = (filePath = RECEIPTS_DEFAULT_PATH) => {
  if (!fs.existsSync(filePath)) return [];
  const fd = fs.openSync(filePath, "r");
  const receipts = [];
  const chunkSize = 64 * 1024;
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
      leftover = parts.pop();
      parts.forEach((line) => {
        const parsed = parseLine(line);
        if (parsed) receipts.push(parsed);
      });
    }
    return receipts;
  } finally {
    fs.closeSync(fd);
  }
};

const extractTimestamp = (receipt) => {
  if (!receipt || typeof receipt !== "object") return null;
  const candidates = ["timestamp", "ts", "created_at"];
  for (let i = 0; i < candidates.length; i += 1) {
    const key = candidates[i];
    if (typeof receipt[key] === "string") {
      return receipt[key];
    }
  }
  return null;
};

const isValidReceipt = (receipt) => {
  if (!receipt || typeof receipt !== "object") return false;
  if (!isValidSnapshotHash(receipt.snapshot_hash)) return false;
  if (!isValidPolicyVersionIds(receipt.policy_version_ids)) return false;
  return true;
};

const getLastReceipt = (scope = {}, filePath = RECEIPTS_DEFAULT_PATH) => {
  const repoFilter = scope.repo_id;
  const receipts = streamReceipts(filePath);
  let best = null;

  for (let i = 0; i < receipts.length; i += 1) {
    const rec = receipts[i];
    if (!isValidReceipt(rec)) continue;
    if (repoFilter && rec.repo_id !== repoFilter) continue;

    const ts = extractTimestamp(rec);

    if (!best) {
      best = { rec, ts, idx: i };
      continue;
    }

    if (ts && best.ts) {
      if (ts > best.ts) {
        best = { rec, ts, idx: i };
        continue;
      }
      if (ts < best.ts) {
        continue;
      }
    }

    if (i > best.idx) {
      best = { rec, ts: ts || best.ts, idx: i };
    }
  }

  return best ? best.rec : null;
};

const streamReceiptsAsync = async (filePath = RECEIPTS_DEFAULT_PATH) => {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
  } catch (_) {
    return [];
  }
  const data = await fs.promises.readFile(filePath, "utf8");
  const receipts = [];
  const lines = data.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const parsed = parseLine(lines[i]);
    if (parsed) receipts.push(parsed);
  }
  return receipts;
};

const getLastReceiptAsync = async (scope = {}, filePath = RECEIPTS_DEFAULT_PATH) => {
  const repoFilter = scope.repo_id;
  const receipts = await streamReceiptsAsync(filePath);
  let best = null;

  for (let i = 0; i < receipts.length; i += 1) {
    const rec = receipts[i];
    if (!isValidReceipt(rec)) continue;
    if (repoFilter && rec.repo_id !== repoFilter) continue;

    const ts = extractTimestamp(rec);

    if (!best) {
      best = { rec, ts, idx: i };
      continue;
    }

    if (ts && best.ts) {
      if (ts > best.ts) {
        best = { rec, ts, idx: i };
        continue;
      }
      if (ts < best.ts) {
        continue;
      }
    }

    if (i > best.idx) {
      best = { rec, ts: ts || best.ts, idx: i };
    }
  }

  return best ? best.rec : null;
};

module.exports = {
  streamReceipts,
  streamReceiptsAsync,
  getLastReceipt,
  getLastReceiptAsync
};
