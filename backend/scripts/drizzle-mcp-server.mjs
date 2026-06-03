import { createRequire } from "node:module";
import { resolve } from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

import { DatabaseManager, DrizzleMCPServer } from "drizzle-mcp";

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}

function parseArgs(argv) {
  const options = {
    configPath: undefined,
    cwd: process.cwd(),
    verbose: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--config" || value === "-c") {
      index += 1;
      options.configPath = argv[index];
      continue;
    }

    if (value === "--cwd" || value === "-d") {
      index += 1;
      options.cwd = argv[index] ?? options.cwd;
      continue;
    }

    if (value === "--verbose" || value === "-v") {
      options.verbose = true;
      continue;
    }

    if (!value.startsWith("-") && !options.configPath) {
      options.configPath = value;
    }
  }

  return options;
}

function loadEnvFiles(cwd) {
  for (const fileName of [".env.local", ".env"]) {
    try {
      process.loadEnvFile(resolve(cwd, fileName));
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
        continue;
      }

      throw error;
    }
  }
}

// drizzle-mcp resolves modules from the target project, but on Windows it passes
// raw absolute paths to import(). Convert them to file:// URLs before importing.
DatabaseManager.prototype.importFromProject = async function importFromProject(moduleName) {
  try {
    const requireFromProject = createRequire(resolve(this.projectRoot, "package.json"));
    const modulePath = requireFromProject.resolve(moduleName);

    return await import(pathToFileURL(modulePath).href);
  } catch (error) {
    throw new Error(`Failed to import ${moduleName} from project root ${this.projectRoot}: ${formatError(error)}`);
  }
};

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const cwd = resolve(options.cwd);

  loadEnvFiles(cwd);

  if (options.verbose) {
    console.error("Starting Drizzle MCP Server...");
    console.error(`Working directory: ${cwd}`);
    console.error(`Config file: ${options.configPath ?? "auto-detected"}`);
    console.error(`DATABASE_URL: ${process.env.DATABASE_URL ? "loaded" : "not found"}`);
  }

  const server = new DrizzleMCPServer(cwd);

  try {
    if (options.configPath) {
      await server.loadConfig(options.configPath);
    }

    await server.start();

    if (options.verbose) {
      console.error("Server started and listening on stdio");
    }
  } catch (error) {
    console.error(`Error starting server: ${formatError(error)}`);
    process.exit(1);
  }

  const shutdown = async () => {
    if (options.verbose) {
      console.error("Shutting down server...");
    }

    await server.stop();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown();
  });

  process.on("SIGTERM", () => {
    void shutdown();
  });
}

void main();