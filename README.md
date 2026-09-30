# DRZEWODOOM

Raycasterowy klon Dooma, w którym gonią Cię drzewa. Czysty JavaScript, zero zależności.

## Uruchamianie

Wystarczy otworzyć `index.html` w przeglądarce. Docelowo (moduły ES, multiplayer) potrzebny będzie lokalny serwer:

```
python -m http.server 8765
```

i wejść na http://localhost:8765.

## Struktura

- `index.html` – HUD i ładowanie skryptów
- `css/style.css` – wygląd interfejsu
- `js/` – kod gry, ładowany w kolejności z `index.html` (wspólny zasięg globalny, więc kolejność ma znaczenie):
  `config` → `utils` → `map` → `lighting` → `textures` → `sprites` → `audio` → `state` →
  `progress` → `waves` → `input` → `screens` → `update` → `combat` → `render` → `overlay` → `hud` → `main`
- `archiwum/` – poprzednie jednoplikowe wersje (`drzewdoomv4.html` to źródło obecnego podziału)

## Wdrożenie (w3spaces)

Wgraj `index.html` oraz foldery `css/` i `js/` z zachowaniem struktury.
