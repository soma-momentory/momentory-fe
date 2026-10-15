// @ts-check

// harness/schemas에서 사용하는 JSON Schema 부분 집합만 검사한다.
// (type, enum, properties, required, additionalProperties: false, items)

/**
 * @typedef {object} JsonSchema
 * @property {string | string[]} [type]
 * @property {unknown[]} [enum]
 * @property {Record<string, JsonSchema>} [properties]
 * @property {string[]} [required]
 * @property {boolean} [additionalProperties]
 * @property {JsonSchema} [items]
 */

/** @param {unknown} value */
function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
}

/**
 * @param {string} expected
 * @param {string} actual
 */
function matchesType(expected, actual) {
  return expected === actual || (expected === 'number' && actual === 'integer');
}

/**
 * @param {JsonSchema} schema
 * @param {unknown} value
 * @param {string} [at]
 * @returns {string[]} 오류 목록. 비어 있으면 통과
 */
export function validateSchema(schema, value, at = '$') {
  const actual = typeOf(value);

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((type) => matchesType(type, actual))) {
      return [`${at}: ${types.join(' | ')} 필요, 실제 ${actual}`];
    }
  }

  if (schema.enum && !schema.enum.includes(value)) {
    return [`${at}: ${schema.enum.join(' | ')} 중 하나여야 함`];
  }

  /** @type {string[]} */
  const errors = [];

  if (actual === 'object' && value !== null && typeof value === 'object') {
    const record = /** @type {Record<string, unknown>} */ (value);
    for (const key of schema.required ?? []) {
      if (!(key in record)) errors.push(`${at}.${key}: 필수 항목 누락`);
    }
    for (const [key, child] of Object.entries(record)) {
      const childSchema = schema.properties?.[key];
      if (childSchema) {
        errors.push(...validateSchema(childSchema, child, `${at}.${key}`));
      } else if (schema.additionalProperties === false) {
        errors.push(`${at}.${key}: 허용되지 않은 항목`);
      }
    }
  }

  if (Array.isArray(value) && schema.items) {
    const items = schema.items;
    value.forEach((item, index) => {
      errors.push(...validateSchema(items, item, `${at}[${index}]`));
    });
  }

  return errors;
}
