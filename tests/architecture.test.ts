import { describe, expect, it } from 'vitest'
import ts from 'typescript'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

function violations(file: string, source: string) {
  const errors: string[] = [],
    path = file.replaceAll('\\', '/')
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  const check = (specifier: string) => {
    const target = (
      specifier.startsWith('@/')
        ? resolve(specifier.slice(2))
        : specifier.startsWith('.')
          ? resolve(dirname(file), specifier)
          : specifier
    ).replaceAll('\\', '/')
    if (
      path.includes('/domain/') &&
      (/^(node:|electron|react|awilix|zod|drizzle)/.test(target) ||
        /\/(infrastructure|application|contracts|conveyor|bootstrap)\//.test(target))
    )
      errors.push(`Domain dependency: ${specifier}`)
    if (
      path.includes('/application/') &&
      (/^(node:|electron|react|awilix|drizzle)/.test(target) ||
        /\/(infrastructure|conveyor|bootstrap)\//.test(target) ||
        target.endsWith('/contracts/settings'))
    )
      errors.push(`Application dependency: ${specifier}`)
    if (
      path.includes('/app/') &&
      (/^(node:|electron($|\/main)|awilix|drizzle|better-sqlite3)/.test(target) ||
        /\/lib\/(main|preload)\//.test(target) ||
        /\/modules\/[^/]+\/(domain|application|infrastructure)\//.test(target) ||
        /\/modules\/[^/]+\/providers/.test(target))
    )
      errors.push(`Renderer dependency: ${specifier}`)
  }
  function visit(node: ts.Node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      check(node.moduleSpecifier.text)
    if (
      ts.isCallExpression(node) &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0]) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(tree) === 'require')
    )
      check(node.arguments[0].text)
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'resolve' &&
      ['root', 'scope', 'container'].includes(node.expression.expression.getText(tree)) &&
      !path.includes('/bootstrap/') &&
      !path.endsWith('/providers.ts')
    )
      errors.push('Container resolution outside assembly')
    ts.forEachChild(node, visit)
  }
  visit(tree)
  return errors
}
function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(resolve(directory, entry.name))
      : /\.tsx?$/.test(entry.name)
        ? [resolve(directory, entry.name)]
        : []
  )
}
describe('architecture boundaries', () => {
  it('rejects relative, type-only, dynamic, and service-locator violations', () => {
    const domain = resolve('modules/settings/domain/example.ts')
    expect(violations(domain, "import type { X } from '../infrastructure/schema'")).not.toEqual([])
    expect(violations(domain, "const db = import('drizzle-orm')")).not.toEqual([])
    expect(violations(resolve('app/example.ts'), "const fs = require('node:fs')")).not.toEqual([])
    expect(
      violations(resolve('modules/settings/application/example.ts'), "container.resolve('repository')")
    ).not.toEqual([])
  })
  it('keeps business code and the renderer within their permitted dependencies', () => {
    const errors = ['modules', 'shared', 'app', 'conveyor', 'lib']
      .flatMap((directory) => files(resolve(directory)))
      .flatMap((file) => violations(file, readFileSync(file, 'utf8')).map((error) => `${file}: ${error}`))
    expect(errors).toEqual([])
  })
})
