# Анимации Manim

Сцены для конспекта. Рендеры кладутся в `conspect/media/manim/` и коммитятся;
рабочий каталог `conspect/manim/media/` игнорируется гитом.

## Окружение

Ставится один раз в корне репозитория. Manim 0.21 пишет видео через PyAV,
поэтому внешний ffmpeg не нужен. LaTeX тоже не нужен: сцены используют только
Pango-текст (`Text`), а не `MathTex`.

```bash
uv venv --python 3.13 .venv
uv pip install --python .venv/Scripts/python.exe manim
```

## Рендер

```bash
.venv/Scripts/python.exe -m manim -qm --format=mp4 conspect/manim/scenes/lecture01.py FiniteIntersection BoundaryOfRationals
```

Готовые файлы появятся в `conspect/manim/media/videos/lecture01/720p30/`.
Скопировать в сайт:

```bash
cp conspect/manim/media/videos/lecture01/720p30/*.mp4 conspect/media/manim/
```

Ключ `-s --format=png` рендерит только последний кадр — удобно проверять
раскладку и наличие глифов, не дожидаясь полного рендера.

## Сцены

| Сцена | Файл | О чём |
|---|---|---|
| `FiniteIntersection` | `scenes/lecture01.py` | интервалы `(−1/n, 1/n)` схлопываются в точку; почему в аксиоме 3 пересечение конечное |
| `BoundaryOfRationals` | `scenes/lecture01.py` | плотность `ℚ`; почему `Int(ℚ) = Int(ℚᶜ) = ∅` и `∂ℚ = ℝ` |

## Правила

- Палитра берётся из `assets/style.css` (тёмная тема) — константы в начале файла сцен.
- Никакого `MathTex`: LaTeX в цепочке рендера создаёт риск подвисания на MiKTeX,
  а юникодных символов (`∅ ∂ ⋂ ℚ ℝ τ`) хватает.
- Целевая длина сцены — 15–25 секунд. Дольше никто не смотрит.
- Каждой сцене нужен статический постер (`-s --format=png`), он же служит
  фолбэком, если видео не отрендерилось.
