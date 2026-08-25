import assert from "node:assert/strict";
import test from "node:test";

import { toKebabCase, toPascalCase, toSnakeCase } from "../src/naming.js";

test("normalizes plugin names", () => {
  assert.equal(toKebabCase("My HTTP_Plugin"), "my-http-plugin");
  assert.equal(toPascalCase("my-http-plugin"), "MyHttpPlugin");
  assert.equal(toSnakeCase("my-http-plugin"), "my_http_plugin");
});
