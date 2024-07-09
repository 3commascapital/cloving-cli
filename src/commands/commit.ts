import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'
import { generateCommitMessagePrompt } from '../utils/git_utils'
import ClovingGPT from '../cloving_gpt'

const generateAndCommitMessage = async () => {
  try {
    // Generate the prompt for commit message
    const prompt = generateCommitMessagePrompt()

    // Instantiate ClovingGPT and get the commit message
    const gpt = new ClovingGPT()
    const rawCommitMessage = await gpt.generateText({ prompt })

    // Split the commit message on lines that start with one or more `# ` characters
    const commitMessageParts = rawCommitMessage.split(/\n#+\s/)
    const commitMessage = commitMessageParts[commitMessageParts.length - 1].trim()  // trim to remove any leading/trailing whitespace

    // Write the commit message to a temporary file
    const tempCommitFilePath = path.join('.git', 'SUGGESTED_COMMIT_EDITMSG')
    fs.writeFileSync(tempCommitFilePath, commitMessage)

    // Commit the changes using the generated commit message
    try {
      execFileSync('git', ['commit', '-a', '--edit', '--file', tempCommitFilePath], { stdio: 'inherit' })
    } catch (commitError) {
      // If commit is canceled (non-zero exit), handle it here
      console.log('Commit was canceled or failed.')
    }

    // Remove the temporary file using fs
    fs.unlink(tempCommitFilePath, (err) => {
      if (err) throw err
    })

  } catch (error) {
    console.error('Error generating or committing the message:', (error as Error).message)
  }
}

export default generateAndCommitMessage
