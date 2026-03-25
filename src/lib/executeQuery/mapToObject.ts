export const mapToObject = (aMap: Map<string, any>): Record<string, any> => {
  const obj: Record<string, any> = {};

  if (aMap) {
    aMap.forEach((v, k) => {
      obj[k] = v;
    });
  }

  return obj;
};
