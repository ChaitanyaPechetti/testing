// Format status bar text/tooltip for risk pill without embedding any policy literals.
// Uses receipt fields only (band label/id, snapshot hash, receipt id). Falls back gracefully.
const shortHash = (hash) => (hash && hash.length >= 8 ? hash.slice(0, 8) : "unknown");

const formatRiskPill = (receipt, options = {}) => {
  if (options.reason === "no_repo") {
    return { text: "Risk: —", tooltip: "No repository detected", warning: null };
  }
  if (!receipt) {
    return { text: "Risk: —", tooltip: "No receipts found", warning: null };
  }

  const outputs = receipt.outputs_summary || {};
  const band = outputs.band_label || outputs.band_id;
  if (!band) {
    return {
      text: "Risk: Unknown",
      tooltip: "Latest receipt missing band fields",
      warning: "Risk receipt missing band fields"
    };
  }

  const snapshot = shortHash(receipt.snapshot_hash);
  const receiptId = receipt.receipt_id || "n/a";
  const tooltip = `Snapshot ${snapshot}\nReceipt ${receiptId}`;

  return {
    text: `Risk: ${band}`,
    tooltip,
    warning: null
  };
};

module.exports = {
  formatRiskPill
};
