export const mapToObject = (
  aMap: Map<string, unknown>,
): Record<string, unknown> => {
  const obj: Record<string, unknown> = {};

  if (aMap) {
    aMap.forEach((v, k) => {
      obj[k] = v;
    });
  }

  return obj;
};
