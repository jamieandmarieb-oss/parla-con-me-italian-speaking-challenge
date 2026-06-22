# Parla con me

A self-contained, three-minute video speaking challenge for Italian Beginners (CEFR A1).

## Run it

Camera and microphone access require a secure browser context. Start a small local server from this folder:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Adapt the questions

Open `app.js` and edit the `QUESTIONS` array near the top. Each item has:

- `it`: the Italian question shown and spoken aloud
- `en`: the optional English support text shown underneath

The activity records locally in the browser. No recording is uploaded to a server.
