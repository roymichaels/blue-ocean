#!/usr/bin/env node
const ts = require('typescript');
const fs = require('fs');

const files = process.argv.slice(2);
let hasError = false;

function isWithinT(node) {
  let current = node.parent;
  while (current) {
    if (ts.isCallExpression(current)) {
      const expr = current.expression;
      if (ts.isIdentifier(expr) && expr.text === 't') {
        return true;
      }
    }
    current = current.parent;
  }
  return false;
}

function shouldIgnore(node, text) {
  const parent = node.parent;
  if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) return true;
  if (ts.isPropertyAssignment(parent)) {
    const name = parent.name.getText();
    if (["id", "key", "href"].includes(name)) return true;
  }
  if (ts.isJsxAttribute(parent)) {
    const name = parent.name.getText();
    if (["href", "src", "testID"].includes(name)) return true;
  }
  if (ts.isCallExpression(parent)) {
    const callee = parent.expression.getText();
    if (callee.startsWith('routes.')) return true;
  }
  if (/^\s*$/.test(text)) return true;
  if (text.includes('/')) return true;
  if (/^[a-z0-9_@.%-]+$/.test(text)) return true; // lowercase tokens
  if (/^[a-zA-Z0-9_-]+$/.test(text) && text.length < 5) return true; // short ids
  return false;
}

function checkFile(file) {
  const content = fs.readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

  function report(node, text) {
    const { line, character } = source.getLineAndCharacterOfPosition(node.getStart());
    console.error(`${file}:${line + 1}:${character + 1} - Untranslated string: "${text}"`);
    hasError = true;
  }

  function visit(node) {
    if (ts.isJsxText(node)) {
      const text = node.getText().trim();
      if (text && !shouldIgnore(node, text)) {
        report(node, text);
      }
    } else if (ts.isStringLiteral(node)) {
      const text = node.text.trim();
      if (text && !isWithinT(node) && !shouldIgnore(node, text)) {
        report(node, text);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
}

if (files.length === 0) {
  console.error('No files provided');
  process.exit(1);
}

files.forEach(checkFile);
if (hasError) {
  process.exit(1);
}
