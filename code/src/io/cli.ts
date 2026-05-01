export interface CliArgs {
  readonly inputFile: string
  readonly outputFile: string
}

const USAGE = `
Usage: hr <input-csv> [output-csv]

  input-csv   Path to the support tickets CSV file
  output-csv  Path for the output CSV (default: ./output.csv)

Options:
  --help      Show this help message
`.trim()

export const parseCliArgs = (argv: string[]): CliArgs | null => {
  const args = argv.slice(2)

  if (args.includes("--help") || args.length === 0) {
    console.log(USAGE)
    return null
  }

  const inputFile = args[0]!
  const outputFile = args[1] ?? "./output.csv"

  return { inputFile, outputFile }
}
