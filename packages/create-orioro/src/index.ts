import { readFileSync, writeFileSync, statSync, readdirSync } from 'node:fs'
import { join, basename } from 'node:path'
import degit from 'degit'

export async function scaffold(
  projectDir: string,
  templateUrl: string,
): Promise<void> {
  let stat
  try {
    stat = statSync(projectDir)
  } catch {
    // path does not exist — fine to proceed
  }

  if (stat) {
    if (stat.isFile()) {
      throw new Error(`"${projectDir}" already exists as a file`)
    }
    if (stat.isDirectory() && readdirSync(projectDir).length > 0) {
      throw new Error(
        `Directory "${projectDir}" already exists and is not empty`,
      )
    }
  }

  const emitter = degit(templateUrl, {
    cache: false,
    force: false,
  })

  await emitter.clone(projectDir)

  const pkgPath = join(projectDir, 'package.json')
  try {
    statSync(pkgPath)
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    pkg.name = basename(projectDir)
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
  } catch {
    // no package.json — skip
  }
}
