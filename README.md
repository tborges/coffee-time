# coffee-time

A lightweight CLI that schedules recurring coffee breaks while you code.

## Why
Long uninterrupted work sessions hurt focus. `coffee-time` keeps a reliable, low-noise loop that nudges you to step away at predictable intervals.

## Install
```
npm install -g .
```

## Usage
Start a continuous break loop with a required interval (minutes):
```
coffee-time start --interval 45
```

### What happens
- Prints a single startup line: `Coffee breaks scheduled every 45 minutes. Press Ctrl+C to stop.`
- Waits 45 minutes, then triggers a break notification.
- Immediately schedules the next interval and repeats until you stop it (Ctrl+C).

### Interval rules
- Integer minutes only, must be >= 1.
- Invalid values print a clear error to stderr and exit with code `2`.

### Notifications
- Always prints a console message on each break: `☕ Time for a coffee break! (45 min interval)`.
- Attempts a desktop notification where available:
  - macOS: `osascript -e 'display notification ...'`
  - Linux: `notify-send` (if installed)
  - Windows: toast via PowerShell (best-effort)
- Missing notification tools never crash the app; console output is the fallback.

### Stopping
Press `Ctrl+C` to stop cleanly. Exits with code `0` and prints `Stopped. Stay fresh ☕`.

### Exit codes
- `0` — normal exit (including Ctrl+C)
- `2` — usage/argument error
- `>0` — unexpected runtime error
