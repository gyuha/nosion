import type { DbRow, ViewConfig } from "@nosion/shared";

export function applyViewConfig(rows: DbRow[], config: ViewConfig): DbRow[] {
  let result = rows;

  if (config.filter && config.filter.length > 0) {
    result = result.filter((row) =>
      config.filter!.every((rule) => {
        const cellValue = row.values[rule.propertyId];
        if (typeof cellValue === "string" && typeof rule.value === "string") {
          return cellValue.includes(rule.value);
        }
        return cellValue === rule.value;
      }),
    );
  }

  if (config.sort) {
    const { propertyId, direction } = config.sort;
    result = [...result].sort((a, b) => {
      const av = a.values[propertyId];
      const bv = b.values[propertyId];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return direction === "asc" ? -1 : 1;
      if (av > bv) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }

  return result;
}
