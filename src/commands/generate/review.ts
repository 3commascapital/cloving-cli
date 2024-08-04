import highlight from 'cli-highlight'
import { select } from '@inquirer/prompts'
import ncp from 'copy-paste'
import fs from 'fs'
import path from 'path'

import ClovingGPT from '../../cloving_gpt'
import { getGitDiff } from '../../utils/git_utils'
import { parseMarkdownInstructions } from '../../utils/string_utils'
import { getAllFilesInDirectory } from '../../utils/command_utils'
import { getConfig, getClovingConfig } from '../../utils/config_utils'
import type { ClovingGPTOptions } from '../../utils/types'

const review = async (options: ClovingGPTOptions) => {
  let { prompt, files } = options
  options.silent = getConfig(options).globalSilent || false
  const gpt = new ClovingGPT(options)
  let promptText = `### Prompt

${prompt || 'Please provide a code review.'}

### Example of a well-structured response

    # Code Review: Enhanced Code Generation and File Handling

    ## Changes Overview

    These changes primarily focus on improving the code generation process and adding more robust file handling capabilities. The main modifications include:

    1. Enhancing the code generation prompt with a structured example response.
    2. Implementing a new function to extract file names and contents from the generated code.
    3. Adding a new option to save generated code directly to files.
    4. Improving the copy-to-clipboard functionality to allow copying individual files.
    5. Removing an unused import in the review.ts file.

    ## Reason for Changes

    The changes aim to enhance the usability and flexibility of the code generation tool by providing clearer prompts, better file management, and more control over the generated code.

    ## Detailed Description

    1. **Enhanced Code Generation Prompt** - The \`generateCodePrompt\` function now includes a structured example of a well-formatted response. This helps guide the AI to produce more consistent and usable output, making it easier to parse and use the generated code.
    2. **File Extraction Function** - A new function \`extractFilesAndContent\` has been added to parse the raw code command and extract individual file names and their contents. This enables more granular control over the generated code, allowing for file-specific operations.
    3. **Save to File Option** - A new 'Save Source Code to Files' option has been added to the user action menu. This feature allows users to save generated code directly to files in the appropriate directory structure.
    4. **Improved Copy to Clipboard** - The 'Copy Source Code to Clipboard' option has been enhanced to allow users to choose specific files to copy, rather than copying all generated code at once.
    5. **Removed Unused Import** - The unused import of \`execFileSync\` from 'child_process' has been removed from the review.ts file, improving code cleanliness.

    ## Potential Bugs and Recommended Fixes

    ### 1. Possible undefined access in \`extractFilesAndContent\`

    \`\`\`typescript
    const contentMatch = regex.exec(rawCodeCommand)
    if (contentMatch) {
      files.push(fileName)
      let content = contentMatch[1]
      // ...
    }
    \`\`\`

    There's a potential for \`contentMatch[1]\` to be undefined if the regex doesn't capture any groups. To fix this, add a null check:

    \`\`\`typescript
    const contentMatch = regex.exec(rawCodeCommand)
    if (contentMatch && contentMatch[1]) {
      files.push(fileName)
      let content = contentMatch[1]
      // ...
    }
    \`\`\`
`
  let contextFiles: Record<string, string> = {}

  try {
    // Define the prompt for analysis
    if (files) {
      let expandedFiles: string[] = []
      for (const file of files) {
        const filePath = path.resolve(file)
        if (await fs.promises.stat(filePath).then(stat => stat.isDirectory()).catch(() => false)) {
          const dirFiles = await getAllFilesInDirectory(filePath)
          expandedFiles = expandedFiles.concat(dirFiles.map(f => path.relative(process.cwd(), f)))
        } else {
          expandedFiles.push(path.relative(process.cwd(), filePath))
        }
      }
      files = expandedFiles

      for (const file of files) {
        const filePath = path.resolve(file)
        if (await fs.promises.stat(filePath).then(stat => stat.isFile()).catch(() => false)) {
          const content = await fs.promises.readFile(filePath, 'utf-8')
          contextFiles[file] = content
        }
      }

      const contextFileContents = Object.keys(contextFiles).map((file) => `### Contents of ${file}\n\n${contextFiles[file]}\n\n`).join('\n')
      promptText += `
### Description of App

${JSON.stringify(getClovingConfig(), null, 2)}

${contextFileContents}

`
    } else {
      const gitDiff = await getGitDiff()

      promptText = `==== begin diff =====
${gitDiff}
==== end diff =====`

    }

    if (files) {
      promptText += `

### Request

I would like you to explain the code and document a description of it.
List any bugs in the new code as well as recommended fixes for those bugs with code examples.
Format the output of this code review in Markdown format.`
    } else {
      promptText += `

### Request

Do not use any data from the example response structure, only use the structure.
I would like you to explain why these change are being made and document a description of these changes.
Also list any bugs in the new code as well as recommended fixes for those bugs with code examples.
Format the output of this code review in Markdown format.`
    }

    if (prompt) {
      promptText += `

### Additional Context

${prompt}`
    }

    // get the analysis
    const analysis = await gpt.generateText({ prompt: promptText })

    // Print the analysis to the console
    parseMarkdownInstructions(analysis).map(code => {
      if (code.trim().startsWith('```')) {
        const lines = code.split('\n')
        const language = code.match(/```(\w+)/)?.[1] || 'plaintext'
        console.log(lines[0])
        try {
          console.log(highlight(lines.slice(1, -1).join('\n'), { language }))
        } catch (error) {
          // don't highlight if it fails
          console.log(lines.slice(1, -1).join('\n'))
        }
        console.log(lines.slice(-1)[0])
      } else {
        console.log(highlight(code, { language: 'markdown' }))
      }
    })

    // Modified Function to extract specific sections from the analysis
    const extractSection = (section: string): string => {
      const regex = new RegExp(`## ${section}[\\s\\S]*?(?=\\n## Potential Bugs and Recommended Fixes|$)`, 'g')
      const match = analysis.match(regex)
      return match ? match[0].trim() : ''
    }

    // Prompt the user with options for copying to clipboard
    const clipboardOption = await select(
      {
        message: 'What would you like to copy to the clipboard?',
        choices: [
          { name: 'Copy only the Changes Overview', value: 'Changes Overview' },
          { name: 'Copy only the Potential Bugs and Recommended Fixes', value: 'Potential Bugs and Recommended Fixes' },
          { name: 'Copy everything', value: 'Everything' },
          { name: 'Done', value: 'Done' }
        ]
      }
    )

    let contentToCopy = ''

    switch (clipboardOption) {
      case 'Changes Overview':
        contentToCopy = extractSection('Changes Overview')
        break
      case 'Potential Bugs and Recommended Fixes':
        contentToCopy = extractSection('Potential Bugs and Recommended Fixes')
        break
      case 'Everything':
        contentToCopy = analysis
        break
      case 'Done':
        console.log('No content copied to clipboard.')
        return
    }

    if (contentToCopy) {
      ncp.copy(contentToCopy, (err) => {
        if (err) {
          console.error('Error: Unable to copy to clipboard.', err)
        } else {
          console.log('Selected content copied to clipboard')
        }
      })
    }
  } catch (error) {
    console.error('Error during analysis:', (error as Error).message)
  }
}

export default review
