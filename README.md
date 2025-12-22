# coffee-time ☕

A lightweight CLI that schedules recurring coffee breaks while you code.

## Why

Long uninterrupted work sessions hurt focus. `coffee-time` keeps a reliable, low-noise loop that nudges you to step away at predictable intervals.

---

## Install

### Global install (recommended)

```bash
npm install -g coffee-time
```

### Run without installing (try it instantly)

```bash
npx coffee-time start --interval 45
```

> After a global install, the `coffee-time` command is available anywhere.

---

## Usage

Start a continuous break loop with a required interval (minutes):

```bash
coffee-time start --interval 45
```

Add a lightweight countdown ping every minute:

```bash
coffee-time start --interval 45 --status
```

---

## What happens

* Prints a single startup line:
  `Coffee breaks scheduled every 45 minutes. Press Ctrl+C to stop.`
* Optional status flag (`--status`) prints a countdown update every minute:
  `⏳ Next break in 44:00`
* Waits 45 minutes, then triggers a break notification.
* After each break, countdown updates continue when `--status` is enabled.
* Immediately schedules the next interval and repeats until you stop it (`Ctrl+C`).

---

## Interval rules

* Integer minutes only.
* Must be **≥ 1**.
* Invalid values:

  * print a clear error to **stderr**
  * exit with code **2**

---

## Notifications

* Always prints a console message on each break:
  `☕ Time for a coffee break! (45 min interval)`
* Attempts a desktop notification where available:

  * **macOS:** `osascript -e 'display notification …'`
  * **Linux:** `notify-send` (if installed)
  * **Windows:** PowerShell toast (best-effort)
* Missing notification tools **never crash** the app — console output is the fallback.

---

## Stopping

Press `Ctrl+C` to stop cleanly.

* Exit code: `0`
* Message: `Stopped. Stay fresh ☕`

---

## Exit codes

* `0` — normal exit (including Ctrl+C)
* `2` — usage / argument error
* `>0` — unexpected runtime error

---

## Development / contributing

For local development only (not for end users):

```bash
git clone <your-repo-url>
cd coffee-time
npm install
npm link
```

Run locally:

```bash
coffee-time start --interval 45
```

Unlink when done:

```bash
npm unlink -g coffee-time
```
