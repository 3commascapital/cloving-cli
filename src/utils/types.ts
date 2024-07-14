export type Provider = 'openai' | 'claude' | 'gpt4all'

export interface GPTRequest {
  prompt: string
  maxTokens?: number
  temperature?: number
  stream?: boolean
}

export interface ClovingGPTOptions {
  silent?: boolean
  files?: string[]
}

export type ClovingConfig = {
  models: Record<string, string>
  primaryModel?: string | null
  silent?: boolean
}

interface LanguageConfig {
  name: string
  version?: string
  primary?: boolean
  directory: string
  extension: string
}

interface FrameworkConfig {
  name: string
  type: string
  version?: string
  primary?: boolean
  directory?: string
  extension?: string
}

interface TestingFrameworkConfig {
  name: string
  type: string
  version?: string
  directory?: string
}

interface BuildToolConfig {
  name: string
  type: string
  version?: string
}

interface LinterConfig {
  name: string
  version?: string
  type?: string
}

interface DatabaseConfig {
  name: string
  primary?: boolean
}

export interface ClovingGPTConfig {
  languages: LanguageConfig[]
  frameworks: FrameworkConfig[]
  testingFrameworks?: TestingFrameworkConfig[]
  buildTools: BuildToolConfig[]
  packageManager: string
  linters: LinterConfig[]
  databases?: DatabaseConfig[]
  projectType: string
}
