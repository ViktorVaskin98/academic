# Неделя 1 — Массивы, строки, sliding window + streak-паттерн

**Сложность: низкая-средняя**
**Warm-up:** с этой недели не делаем (первая неделя, ещё нечего пересдавать)

## День 1
- [x] Теория: Big O на пальцах (список операций list/str и их сложности)
- [x] Maximum Subarray (53)
- [x] Best Time to Buy and Sell Stock (121)
- [x] Contains Duplicate (217)

## День 2
- [x] Теория: sliding window — fixed size vs variable size, шаблон на псевдокоде
- [x] Longest Substring Without Repeating Characters (3)
- [x] Minimum Size Subarray Sum (209)

## День 3
- [x] Теория: running streak (счётчик + сброс при нарушении условия)
- [x] Longest Strictly Increasing or Strictly Decreasing Subarray (3105)
- [x] Longest Continuous Increasing Subsequence (674)
- [x] Python internals 1.1: data model, `is` vs `==`, mutable/immutable (см. [`PYTHON_PLAN.md`](../PYTHON_PLAN.md))

## День 4
- [x] Повтор без подсказок: LC 3 и LC 209 (оба чисто, закрыты в redo-list как пройденные)
- [x] +1 новая задача: Longest Repeating Character Replacement (424)
- [x] Python internals 1.2: Big-O встроенных структур CPython (см. [`PYTHON_PLAN.md`](../PYTHON_PLAN.md))

## День 5
- [x] Ретро недели (см. ниже)
- [x] Добить всё, что не успел / попало в `redo-list.md` — активный только LC424, пересдача через 3-7 дней

---

## Правило пересдачи (напоминание)
Любая задача, занявшая >20 минут или решённая с подглядыванием — в [`redo-list.md`](../redo-list.md) с датой. Пересдача холодная через 3 и 7 дней.

## Ретро недели
- Что было легко: алгосы залетели уверенно, паттерны распознавались сразу по описанию (sliding window, streak, hashmap)
- Что было тяжело: в целом ничего критичного; уложить в голове совмещение паттернов (см. LC424)
- Какие паттерны не щёлкнули с первого раза: LC424 (sliding window + hashmap вместе) — единственная задача, где реально пришлось подумать с наводками
- Корректировки на неделю 2:
  - Объём задач увеличен до 4-6/день (было 3-5), добавлены 3 популярные задачи в неделю 2 (167, 125, 75)
  - LC424 → `redo-list.md` на холодную пересдачу
  - Для недель 5 и 6 — заранее закладываем более развёрнутую теорию перед задачами (см. пометки в `PLAN.md`)
  - Python-темп не меняем: несмотря на "легко", дважды словил неточность (mutable/immutable модель, deque для DFS vs BFS) — самооценка "знаю" не всегда точна, снижать объём рано
