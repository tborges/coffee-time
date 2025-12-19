#!/usr/bin/env node

const { spawn } = require('child_process');

const USAGE_ERROR = 2;

function printUsage() {
  console.error('Usage: coffee-break start --interval <minutes>');
}

function parseArgs(argv) {
  const args = argv.slice(2);

  if (args.length === 0) {
    printUsage();
    process.exit(USAGE_ERROR);
  }

  const [command, ...rest] = args;
  if (command !== 'start') {
    console.error(`Unknown command: ${command}`);
    printUsage();
    process.exit(USAGE_ERROR);
  }

  let intervalMinutes;
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (token === '--interval') {
      intervalMinutes = rest[i + 1];
      i += 1;
    } else {
      console.error(`Unknown option: ${token}`);
      printUsage();
      process.exit(USAGE_ERROR);
    }
  }

  if (intervalMinutes === undefined) {
    console.error('Missing required option: --interval <minutes>');
    printUsage();
    process.exit(USAGE_ERROR);
  }

  const parsedInterval = Number(intervalMinutes);
  if (!Number.isInteger(parsedInterval) || parsedInterval < 1) {
    console.error('Invalid interval. Provide an integer value >= 1 minute.');
    process.exit(USAGE_ERROR);
  }

  return parsedInterval;
}

function sendDesktopNotification(message) {
  const platform = process.platform;

  if (platform === 'darwin') {
    return attemptNotification('osascript', [
      '-e',
      `display notification "${message}" with title "coffee-break"`,
    ]);
  }

  if (platform === 'linux') {
    return attemptNotification('notify-send', ['coffee-break', message]);
  }

  if (platform === 'win32') {
    const script = `Add-Type -AssemblyName System.Windows.Forms;` +
      `$notify = New-Object System.Windows.Forms.NotifyIcon;` +
      `$notify.Icon = [System.Drawing.SystemIcons]::Information;` +
      `$notify.Visible = $true;` +
      `$notify.ShowBalloonTip(10000, 'coffee-break', '${message}', [System.Windows.Forms.ToolTipIcon]::Info);`;
    return attemptNotification('powershell.exe', ['-NoProfile', '-Command', script]);
  }

  return Promise.resolve();
}

function attemptNotification(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: 'ignore' });

    child.on('error', () => resolve());
    child.on('exit', () => resolve());
  });
}

function notify(intervalMinutes) {
  const message = `Time for a coffee break! (${intervalMinutes} min interval)`;
  console.log(`☕ ${message}`);
  sendDesktopNotification(message).catch(() => {});
}

function startLoop(intervalMinutes) {
  console.log(`Coffee breaks scheduled every ${intervalMinutes} minutes. Press Ctrl+C to stop.`);

  const intervalMs = intervalMinutes * 60 * 1000;
  let nextTime = Date.now() + intervalMs;
  let timeoutId = null;

  function scheduleNext() {
    const delay = Math.max(0, nextTime - Date.now());
    timeoutId = setTimeout(() => {
      notify(intervalMinutes);
      nextTime += intervalMs;
      scheduleNext();
    }, delay);
  }

  scheduleNext();

  const handleExit = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    console.log('\nStopped. Stay fresh ☕');
    process.exit(0);
  };

  process.on('SIGINT', handleExit);
  process.on('SIGTERM', handleExit);
}

function main() {
  try {
    const intervalMinutes = parseArgs(process.argv);
    startLoop(intervalMinutes);
  } catch (error) {
    console.error('Unexpected error:', error.message);
    process.exit(1);
  }
}

main();
