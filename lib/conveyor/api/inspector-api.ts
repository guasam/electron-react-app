import { ConveyorApi } from '@/lib/preload/shared'

type SearchElementParams = {
  tagName: string
  id?: string
  className?: string
  componentName?: string
  textContent?: string
}

type SearchElementResult = {
  matches: Array<{
    relativePath: string
    lineNumber: number
    preview: string
    score: number
  }>
}

type ElementCodeResult = {
  code: string
  startLine: number
  endLine: number
  absolutePath: string
}

export class InspectorApi extends ConveyorApi {
  inspectorSearchElement = (params: SearchElementParams, workspacePath: string) =>
    this.invoke<SearchElementResult>('inspector-search-element', params, workspacePath)

  inspectorGetElementCode = (workspacePath: string, relativePath: string, lineNumber: number) =>
    this.invoke<ElementCodeResult>('inspector-get-element-code', workspacePath, relativePath, lineNumber)
}

