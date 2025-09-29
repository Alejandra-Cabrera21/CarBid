function generateVendorCode() {
  const prefix = "VEN-";
  const unique = Date.now().toString(36).toUpperCase();
  return prefix + unique;
}

module.exports = generateVendorCode;
