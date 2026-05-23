---
name: webapp-testing
description: Automated testing of local web applications using Playwright with Python. Use when asked to test, verify, or debug web app functionality — including frontend behavior, UI interactions, capturing screenshots, and monitoring browser console logs.
---

# Web App Testing

Automated testing toolkit for local web applications using Playwright.

## Core Capabilities

- Verify frontend functionality and UI behavior
- Capture browser screenshots for visual inspection
- Monitor browser console logs (errors, warnings, network)
- Test dynamic applications requiring JavaScript execution

## Server Management

Use `scripts/with_server.py` to manage server lifecycle:

```bash
# Single server
python scripts/with_server.py --port 3000 -- python test_script.py

# Multiple concurrent servers (e.g., backend + frontend)
python scripts/with_server.py --port 8000 --port 3000 -- python test_script.py
```

## Core Workflow: Reconnaissance-Then-Action

**Never inspect the DOM before the page has fully loaded.** Always:
1. Navigate and wait for `networkidle`
2. Take a screenshot to see the current rendered state
3. Identify selectors from the rendered DOM
4. Execute interactions using those discovered selectors

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()

    # Step 1: Navigate and wait for full render
    page.goto("http://localhost:3000")
    page.wait_for_load_state("networkidle")

    # Step 2: Screenshot to see current state
    page.screenshot(path="before.png")

    # Step 3: Discover selectors from rendered DOM
    button = page.locator("button:has-text('Submit')")

    # Step 4: Interact
    button.click()
    page.wait_for_load_state("networkidle")
    page.screenshot(path="after.png")

    browser.close()
```

## Static vs Dynamic Content

```python
# Static HTML — inspect directly
from bs4 import BeautifulSoup
soup = BeautifulSoup(open("index.html"), "html.parser")

# Dynamic app — always use Playwright + wait for networkidle
page.goto(url)
page.wait_for_load_state("networkidle")
content = page.content()  # Now safe to inspect
```

## Console Log Capture

```python
logs = []
page.on("console", lambda msg: logs.append(f"[{msg.type}] {msg.text}"))
page.on("pageerror", lambda err: logs.append(f"[ERROR] {err}"))

page.goto(url)
page.wait_for_load_state("networkidle")

for log in logs:
    print(log)
```

## Element Discovery

```python
buttons = page.locator("button").all()
links = page.locator("a[href]").all()
inputs = page.locator("input, select, textarea").all()

for el in buttons:
    print(el.text_content(), el.get_attribute("class"))
```

## Common Pitfall

**Don't inspect the DOM before waiting for `networkidle` on dynamic apps.** React, Vue, and Angular apps render asynchronously — querying the DOM immediately after `goto()` returns empty or incomplete elements.

## Dependencies

```bash
pip install playwright beautifulsoup4
playwright install chromium
```
