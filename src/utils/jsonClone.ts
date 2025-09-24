/**
 * Creates a deep clone of JSON-serializable data structures using the same
 * `JSON.parse(JSON.stringify(value))` approach used throughout the project.
 *
 * Centralising the logic keeps behaviour identical while avoiding repeated
 * inline cloning snippets across agents and services.
 */
export function jsonClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export default jsonClone;
