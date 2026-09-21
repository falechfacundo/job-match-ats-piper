import path from "node:path";
import { NodeCompiler } from "@myriaddreamin/typst-ts-node-compiler";

export class TypstCompileError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "TypstCompileError";
  }
}

let cachedCompiler: NodeCompiler | null = null;

function getCompiler(): NodeCompiler {
  cachedCompiler ??= NodeCompiler.create({
    fontArgs: [{ fontPaths: [path.join(process.cwd(), "src/lib/typst/fonts")] }],
  });
  return cachedCompiler;
}

/**
 * Compiles a .typ template in-process (no shelling out to a `typst` binary,
 * no external microservice) into a PDF buffer.
 *
 * `data` is passed as a single JSON string through Typst's `sys.inputs`
 * mechanism (read back in the template via
 * `json.decode(bytes(sys.inputs.cv_data))`) rather than string-interpolated
 * into the template source — this avoids any Typst-markup-injection risk
 * from LLM-generated bullet text.
 */
export function compileCvPdf(typstSource: string, data: unknown): Buffer {
  try {
    return getCompiler().pdf({
      mainFileContent: typstSource,
      inputs: { cv_data: JSON.stringify(data) },
    });
  } catch (err) {
    throw new TypstCompileError(`Typst compilation failed: ${(err as Error).message}`, { cause: err });
  }
}
