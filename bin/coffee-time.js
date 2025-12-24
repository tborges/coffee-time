#!/usr/bin/env node

const { spawn } = require('child_process');
const os = require('os');

const USAGE_ERROR = 2;

function printUsage() {
  console.error('Usage: coffee-time start --interval <minutes>');
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
  let showStatus = false;
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (token === '--interval') {
      intervalMinutes = rest[i + 1];
      i += 1;
    } else if (token === '--status') {
      showStatus = true;
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

  return { intervalMinutes: parsedInterval, showStatus };
}

function sendDesktopNotification(message) {
  const platform = process.platform;

  if (platform === 'darwin') {
    return attemptNotification('osascript', [
      '-e',
      `display notification "${message}" with title "coffee-time"`,
    ]);
  }

  if (platform === 'linux') {
    return attemptNotification('notify-send', ['coffee-time', message]);
  }

  if (platform === 'win32') {
    const script = `Add-Type -AssemblyName System.Windows.Forms;` +
      `$notify = New-Object System.Windows.Forms.NotifyIcon;` +
      `$notify.Icon = [System.Drawing.SystemIcons]::Information;` +
      `$notify.Visible = $true;` +
      `$notify.ShowBalloonTip(10000, 'coffee-time', '${message}', [System.Windows.Forms.ToolTipIcon]::Info);`;
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

function notify(intervalMinutes, logLine = console.log) {
  const message = `Time for a coffee break! (${intervalMinutes} min interval)`;
  logLine(`☕ ${message}`);
  sendDesktopNotification(message).catch(() => {});
}

function formatRemaining(remainingMs) {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const minutes = Math.max(0, Math.ceil(totalSeconds / 60));
  const unit = minutes === 1 ? 'minute' : 'minutes';
  return `${minutes} ${unit}`;
}

function supportsEmoji() {
  if (process.env.COFFEE_TIME_FORCE_ASCII === '1') {
    return false;
  }
  if (process.env.COFFEE_TIME_FORCE_EMOJI === '1') {
    return true;
  }

  const isWsl = /microsoft/i.test(os.release());

  return process.env.TERM_PROGRAM === 'Apple_Terminal'
    || process.env.TERM_PROGRAM === 'vscode'
    || Boolean(process.env.WT_SESSION)
    || isWsl;
}

function printCoffeeArt() {
  const frames = [
    [
      '   (  (   ',
      '    )  )  ',
      '   ((((   ',
      '  ........',
      '  |      |]',
      '  \\      /',
      "   '----'",
    ],
    [
      '    (     ',
      '   ( )    ',
      '    ) ))  ',
      '  ........',
      '  |      |]',
      '  \\      /',
      "   '----'",
    ],
    [
      '    )  )  ',
      '   (  (   ',
      '    ((    ',
      '  ........',
      '  |      |]',
      '  \\      /',
      "   '----'",
    ],
    [
      '   (      ',
      '    ) )   ',
      '   )  )   ',
      '  ........',
      '  |      |]',
      '  \\      /',
      "   '----'",
    ],
  ];

  const maxWidth = frames.reduce((width, frame) => (
    Math.max(width, ...frame.map((line) => line.length))
  ), 0);
  const normalizedFrames = frames.map((frame) => frame.map((line) => line.padEnd(maxWidth, ' ')));
  const artHeight = normalizedFrames[0].length;
  let frameIndex = 0;

  const renderFrame = (isFirstFrame = false) => {
    if (!isFirstFrame) {
      process.stdout.write(`\u001B[${artHeight}A`);
    }
    process.stdout.write(`${normalizedFrames[frameIndex].join('\n')}\n`);
    frameIndex = (frameIndex + 1) % normalizedFrames.length;
  };

  renderFrame(true);
  const intervalId = setInterval(() => renderFrame(), 200);
  const timeoutId = setTimeout(() => {
    clearInterval(intervalId);
  }, 4000);

  return () => {
    clearInterval(intervalId);
    clearTimeout(timeoutId);
  };
}

function startLoop(intervalMinutes, options = {}) {
  const { showStatus = false } = options;
  let statusLength = 0;
  let statusActive = false;
  let stopCoffeeArt = () => {};
  const clock = supportsEmoji() ? '⏰' : '[next]';

  const logLine = (message) => {
    if (statusActive) {
      process.stdout.write('\n');
      statusActive = false;
      statusLength = 0;
    }
    console.log(message);
  };

  console.log(`Coffee breaks scheduled every ${intervalMinutes} minutes. Press Ctrl+C to stop.`);
  stopCoffeeArt = printCoffeeArt();

  const startedAt = Date.now();
  const intervalMs = intervalMinutes * 60 * 1000;
  let nextTime = startedAt + intervalMs;
  let timeoutId = null;
  let statusIntervalId = null;
  let statusTimeoutId = null;

  const logStatus = () => {
    const remaining = nextTime - Date.now();
    const message = `${clock} Next break in ${formatRemaining(remaining)}`;
    const paddedMessage = message.padEnd(statusLength, ' ');
    process.stdout.write(`\r${paddedMessage}`);
    statusLength = message.length;
    statusActive = true;
  };

  function scheduleNext() {
    const delay = Math.max(0, nextTime - Date.now());
    timeoutId = setTimeout(() => {
      notify(intervalMinutes, logLine);
      nextTime += intervalMs;
      if (showStatus) {
        logStatus();
      }
      scheduleNext();
    }, delay);
  }

  scheduleNext();

  if (showStatus) {
    const elapsed = Date.now() - startedAt;
    const firstDelay = Math.max(0, 60 * 1000 - (elapsed % (60 * 1000)));

    statusTimeoutId = setTimeout(() => {
      logStatus();
      statusIntervalId = setInterval(logStatus, 60 * 1000);
    }, firstDelay);
  }

  const handleExit = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    if (statusTimeoutId) {
      clearTimeout(statusTimeoutId);
    }
    if (statusIntervalId) {
      clearInterval(statusIntervalId);
    }
    if (stopCoffeeArt) {
      stopCoffeeArt();
    }
    logLine('\nStopped. Stay fresh ☕');
    process.exit(0);
  };

  process.on('SIGINT', handleExit);
  process.on('SIGTERM', handleExit);
}

function main() {
  try {
    const { intervalMinutes, showStatus } = parseArgs(process.argv);
    startLoop(intervalMinutes, { showStatus });
  } catch (error) {
    console.error('Unexpected error:', error.message);
    process.exit(1);
  }
}

main();
