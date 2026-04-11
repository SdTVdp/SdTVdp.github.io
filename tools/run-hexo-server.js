const { execFileSync, spawn } = require("child_process");
const net = require("net");
const path = require("path");

const workspaceRoot = process.cwd();
const hexoBin = path.join(workspaceRoot, "node_modules", "hexo", "bin", "hexo");
const rawArgs = process.argv.slice(2);
const dryRun = rawArgs.includes("--dry-run");
const serverArgs = rawArgs.filter((arg) => arg !== "--dry-run");

function parseDesiredPort(args) {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if ((arg === "--port" || arg === "-p") && args[index + 1]) {
      const port = Number.parseInt(args[index + 1], 10);
      if (Number.isFinite(port)) {
        return port;
      }
    }

    if (arg.startsWith("--port=")) {
      const port = Number.parseInt(arg.slice("--port=".length), 10);
      if (Number.isFinite(port)) {
        return port;
      }
    }
  }

  return 4000;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPortFree(port) {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();

    probe.once("error", (error) => {
      if (error && error.code === "EADDRINUSE") {
        resolve(false);
        return;
      }

      reject(error);
    });

    probe.once("listening", () => {
      probe.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }

        resolve(true);
      });
    });

    probe.listen(port, "::");
  });
}

function inspectWindowsListener(port) {
  const powershellScript = `
$port = ${port}
$conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $conn) {
  '{}' | Write-Output
  exit 0
}
$proc = Get-CimInstance Win32_Process -Filter "ProcessId = $($conn.OwningProcess)"
[pscustomobject]@{
  pid = [int]$conn.OwningProcess
  processName = $proc.Name
  executablePath = $proc.ExecutablePath
  commandLine = $proc.CommandLine
} | ConvertTo-Json -Compress
`;

  const output = execFileSync(
    "powershell.exe",
    ["-NoProfile", "-Command", powershellScript],
    { cwd: workspaceRoot, encoding: "utf8" }
  ).trim();

  if (!output || output === "{}") {
    return null;
  }

  return JSON.parse(output);
}

function normalizeForCompare(value) {
  return String(value || "")
    .replaceAll("/", "\\")
    .toLowerCase();
}

function isCurrentWorkspaceHexoServer(listenerInfo) {
  if (!listenerInfo || !listenerInfo.commandLine) {
    return false;
  }

  const commandLine = normalizeForCompare(listenerInfo.commandLine);
  const currentWorkspace = normalizeForCompare(workspaceRoot);

  return (
    commandLine.includes(currentWorkspace) &&
    commandLine.includes("hexo") &&
    commandLine.includes(" server")
  );
}

async function stopProcessTreeWindows(pid) {
  try {
    process.kill(pid, "SIGTERM");
  } catch (error) {
    if (!error || error.code !== "ESRCH") {
      execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
        cwd: workspaceRoot,
        stdio: "ignore"
      });
    }
  }

  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    // eslint-disable-next-line no-await-in-loop
    if (await isPortFree(desiredPort)) {
      return;
    }

    // eslint-disable-next-line no-await-in-loop
    await delay(200);
  }

  execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
    cwd: workspaceRoot,
    stdio: "ignore"
  });
}

function printListenerConflict(listenerInfo, port) {
  const processName = listenerInfo && listenerInfo.processName ? listenerInfo.processName : "unknown";
  const pid = listenerInfo && listenerInfo.pid ? listenerInfo.pid : "unknown";
  const commandLine = listenerInfo && listenerInfo.commandLine ? listenerInfo.commandLine : "unknown";

  console.error(`Port ${port} is already in use.`);
  console.error(`Listener: ${processName} (PID ${pid})`);
  console.error(`Command: ${commandLine}`);
  console.error(`Use "npm run server -- --port ${port + 1}" or stop the process above.`);
}

function startHexoServer(args) {
  const child = spawn(process.execPath, [hexoBin, "server", ...args], {
    cwd: workspaceRoot,
    stdio: "inherit"
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

const desiredPort = parseDesiredPort(serverArgs);

async function main() {
  const portFree = await isPortFree(desiredPort);

  if (!portFree) {
    const listenerInfo =
      process.platform === "win32" ? inspectWindowsListener(desiredPort) : null;

    if (isCurrentWorkspaceHexoServer(listenerInfo)) {
      console.log(
        `Port ${desiredPort} is occupied by this workspace's Hexo server (PID ${listenerInfo.pid}).`
      );

      if (dryRun) {
        console.log("Dry run enabled, skipped restart.");
        return;
      }

      await stopProcessTreeWindows(listenerInfo.pid);
    } else {
      printListenerConflict(listenerInfo, desiredPort);
      process.exit(1);
    }
  }

  if (dryRun) {
    console.log(`Port ${desiredPort} is ready for Hexo server.`);
    return;
  }

  startHexoServer(serverArgs);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
