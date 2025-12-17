// Derive a sanitized view from a receipt + role based on policy visibility.
// Never mutates the receipt; returns a separate object with masked/visible fields.
const applyPrivacyView = (receipt, policy, role = "developer") => {
  if (!receipt || typeof receipt !== "object") {
    return { redacted: true, role, masked_fields: [], view: {}, receipt_id: null };
  }

  const vis = policy?.receipts_policy?.visibility || {};
  const viewCfg = role === "auditor" ? vis.auditor || {} : vis.developer || {};
  const visible = new Set(viewCfg.visible_fields || []);
  const masked = new Set(viewCfg.masked_fields || []);

  const result = {};
  const maskedOut = {};

  Object.keys(receipt).forEach((key) => {
    if (visible.has(key)) {
      result[key] = receipt[key];
    } else if (masked.has(key)) {
      maskedOut[key] = true;
      result[key] = "[masked]";
    }
    // Otherwise omitted
  });

  if (receipt.receipt_id && !result.receipt_id) {
    result.receipt_id = receipt.receipt_id;
  }

  return {
    redacted: Object.keys(maskedOut).length > 0,
    role,
    masked_fields: Object.keys(maskedOut),
    view: result
  };
};

module.exports = { applyPrivacyView };

