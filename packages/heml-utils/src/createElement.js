// types.ts
export interface ElementConfig {
  tagName: string
  attrs: string[]
  children: boolean | string[]
  defaultAttrs: Record<string, any>
  rules?: Record<string, (string | RegExp)[]>
  containsText?: boolean
  preRender?: (attrs: any, children: any) => void
  render: (attrs: any, children: any) => string | false
  postRender?: (output: string) => string
}

export type ElementInput = Partial<ElementConfig> | ((attrs: any, children: any) => string)

// constants.ts
export const TEXT_STYLE_RULES = {
  header: [
    /^(text(-([^-\s]+))?(-([^-\s]+))?|word-(break|spacing|wrap)|line-break|hanging-punctuation|hyphens|letter-spacing|overflow-wrap|tab-size|white-space|font-family|font-weight|font-style|font-variant|color)$/i
  ],
  text: [
    /^(text(-([^-\s]+))?(-([^-\s]+))?|word-(break|spacing|wrap)|line-break|hanging-punctuation|hyphens|letter-spacing|overflow-wrap|tab-size|white-space|font-family|font-weight|font-style|font-variant|color)$/i,
    'font-size',
    'line-height'
  ]
} as const

// validators.ts
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export function validateName(name: string): void {
  if (!name?.trim()) {
    throw new ValidationError(
      `Element name is required. Received: "${name}"`
    )
  }
  
  if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(name)) {
    throw new ValidationError(
      `Element name must start with a letter and contain only alphanumeric characters and hyphens. Received: "${name}"`
    )
  }
}

// element-factory.ts
import { defaults, isFunction } from 'lodash'
import { ElementConfig, ElementInput } from './types'
import { TEXT_STYLE_RULES } from './constants'
import { validateName, ValidationError } from './validators'

export class ElementFactory {
  private static readonly DEFAULT_CONFIG: Omit<ElementConfig, 'render' | 'tagName'> = {
    attrs: [],
    children: true,
    defaultAttrs: { class: '' },
    preRender: () => {},
    postRender: (output: string) => output,
    rules: {}
  }

  /**
   * Creates a new element with validation and smart defaults
   */
  static create(name: string, elementInput: ElementInput): ElementConfig {
    try {
      validateName(name)
      
      const element = this.normalizeInput(elementInput)
      const config = this.applyDefaults(name, element)
      
      return this.enhanceWithTextRules(config)
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error
      }
      throw new Error(`Failed to create element "${name}": ${error.message}`)
    }
  }

  /**
   * Creates multiple elements at once
   */
  static createMultiple(
    definitions: Record<string, ElementInput>
  ): Record<string, ElementConfig> {
    const elements: Record<string, ElementConfig> = {}
    
    for (const [name, elementInput] of Object.entries(definitions)) {
      elements[name] = this.create(name, elementInput)
    }
    
    return elements
  }

  /**
   * Normalizes function shorthand to object format
   */
  private static normalizeInput(elementInput: ElementInput): Partial<ElementConfig> {
    if (isFunction(elementInput)) {
      return { render: elementInput }
    }
    return elementInput
  }

  /**
   * Applies defaults and ensures required properties
   */
  private static applyDefaults(
    name: string, 
    element: Partial<ElementConfig>
  ): ElementConfig {
    const tagName = name.trim().toLowerCase()
    
    return defaults({}, element, {
      ...this.DEFAULT_CONFIG,
      tagName,
      render: () => false
    }) as ElementConfig
  }

  /**
   * Enhances element with text styling rules if needed
   */
  private static enhanceWithTextRules(config: ElementConfig): ElementConfig {
    if (!config.containsText) {
      return config
    }

    return {
      ...config,
      rules: {
        ...config.rules,
        '.header': TEXT_STYLE_RULES.header,
        '.text': TEXT_STYLE_RULES.text
      }
    }
  }
}

// Convenience export
export default ElementFactory.create
