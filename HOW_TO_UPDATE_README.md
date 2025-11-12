# README.md auf GitHub aktualisieren

## Schnell-Anleitung

### Schritt 1: Änderungen speichern
Stelle sicher, dass du die README.md in deinem Editor **gespeichert** hast (Cmd+S / Ctrl+S).

### Schritt 2: Status prüfen
```bash
git status
```

Du solltest sehen:
```
Auf Branch dev
Änderungen, die nicht zum Commit vorgemerkt sind:
  geändert:       README.md
```

### Schritt 3: Änderungen stagen
```bash
git add README.md
```

### Schritt 4: Commit erstellen
```bash
git commit -m "Update README.md"
```

Oder mit einer detaillierteren Nachricht:
```bash
git commit -m "Update README: Add new features description"
```

### Schritt 5: Zu GitHub pushen
```bash
git push origin dev
```

## Vollständiger Workflow

```bash
# 1. Prüfe, welche Dateien geändert wurden
git status

# 2. Zeige die Änderungen in README.md an (optional)
git diff README.md

# 3. Füge README.md zum Staging hinzu
git add README.md

# 4. Erstelle einen Commit
git commit -m "Update README.md"

# 5. Pushe zu GitHub
git push origin dev
```

## Falls du auf main pushen möchtest

Wenn du die Änderungen direkt auf `main` pushen möchtest (z.B. für Production):

```bash
# Wechsle zu main Branch
git checkout main

# Merge dev in main
git merge dev

# Pushe main
git push origin main

# Zurück zu dev
git checkout dev
```

## Troubleshooting

### "Keine Änderungen" trotz Bearbeitung
- **Problem:** Du hast die Datei noch nicht gespeichert
- **Lösung:** Speichere die Datei im Editor (Cmd+S / Ctrl+S)

### "Branch ist bereits aktuell"
- **Problem:** Änderungen sind bereits gepusht
- **Lösung:** Prüfe auf GitHub, ob die Änderungen bereits da sind

### "Authentication failed"
- **Problem:** SSH-Key nicht richtig konfiguriert
- **Lösung:** Siehe `GITHUB_AUTH_SETUP.md`

## Nützliche Befehle

```bash
# Zeige letzten Commit
git log -1

# Zeige Änderungen in README.md
git diff README.md

# Zeige alle getrackten Dateien
git ls-files

# Zeige Status
git status
```

