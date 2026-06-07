/** Globally unique id across thalis: thaliId * 1e6 + categoryId * 1e3 + itemId */
const encodeMenuOrderItemId = (thaliId, categoryId, itemId) =>
  Number(thaliId) * 1_000_000 + Number(categoryId) * 1_000 + Number(itemId);

const decodeMenuOrderItemId = (encoded) => {
  const value = Number(encoded);
  const thaliId = Math.floor(value / 1_000_000);
  const remainder = value % 1_000_000;
  const categoryId = Math.floor(remainder / 1_000);
  const itemId = remainder % 1_000;
  return { thaliId, categoryId, itemId };
};

module.exports = { encodeMenuOrderItemId, decodeMenuOrderItemId };
