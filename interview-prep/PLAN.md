# План подготовки к собеседованиям ML Engineer (Intern)

**Срок:** 8 недель (2 месяца)
**Нагрузка:** ~10-12 ч/неделю (2-3 ч/день, 5 дней в неделю)
**Уровень:** средний (задачи решал, плаваю на medium/новых паттернах) → цель: уверенный medium на LeetCode + Python internals
**Платформа:** LeetCode
**Не входит в план:** System Design, ML System Design, SQL, ОС/сети, ML-теория (по договорённости — повторишь отдельно)

## Как работаем
- Каждая неделя = 1 файл прогресса в `interview-prep/weeks/weekXX.md` (создаётся перед стартом недели) со списком задач и чек-боксами.
- В конце каждой недели — короткий ретро: что было легко/тяжело, корректируем следующую неделю.
- Python internals — по отдельному плану [`PYTHON_PLAN.md`](PYTHON_PLAN.md), синхронизирован по неделям с этим файлом (2 раза в неделю).
- Приоритет паттернов сознательно смещён от деревьев/графов/классического DP (даём базовый минимум) в сторону: two pointers, hash map, **prefix sum**, sliding window, binary search, stack, heap — это чаще встречается на intern-собесах и в быстром скрининге. Prefix sum усилен отдельно — см. Неделю 3.

### Режим "надрочить" — дневная структура и spaced repetition
Цель — довести распознавание паттерна и написание кода до автоматизма, а не один раз прорешать и забыть.

**Формат дня (~2-2.5 ч, 5 дней в неделю):**
1. **Warm-up (10-15 мин)** — 1 случайная задача из уже пройденных недель, **холодная, без подсказок, с таймером**. Начиная со 2-й недели.
2. **Основной блок (~1.5-2 ч)** — теория нового паттерна (15-20 мин) + 3-5 новых задач по теме недели (было 2-4 — увеличили под "дрочку").
3. **Python internals (~20-30 мин, 2 раза в неделю)** — по `PYTHON_PLAN.md`.

**Список пересдач (`interview-prep/redo-list.md`):**
- Любая задача, которая заняла >20 минут, решена с подглядыванием в решение, или где ты не сразу увидел паттерн — уходит в `redo-list.md` с датой.
- Пересдача **холодная** (закрыть старое решение, начать с чистого листа): через 3 дня и через 7 дней после первого решения.
- Если пересдача снова не идёт с первого захода — задача остаётся в списке ещё на один цикл (3 дня), паттерн явно не закрыт.
- Не убирай задачу из списка, пока не решишь её холодно 2 раза подряд без сбоев.

---

## Неделя 1 — Разгон: массивы, строки, sliding window
**Сложность: низкая-средняя** (база, но нужно довести до автоматизма — часто именно тут теряют время на реальных собесах из-за небрежности с индексами)

- Темы: Big O на пальцах, sliding window (fixed/variable size), однопроходные счётчики-стрики (running streak: "считай длину, сбрасывай счётчик при нарушении условия" — тот же принцип, что и в LC 3105 с твоего собеса), базовые операции над строками/массивами в Python
- Задачи (LeetCode): Maximum Subarray (53), Best Time to Buy and Sell Stock (121), Longest Substring Without Repeating Characters (3), Minimum Size Subarray Sum (209), Contains Duplicate (217), **Longest Strictly Increasing or Strictly Decreasing Subarray (3105)**, Longest Continuous Increasing Subsequence (674)
- Python internals: data model — mutable vs immutable, `is` vs `==`, как Python хранит списки/строки/int (small int cache), сложности операций над list/str (Big O CPython)

## Неделя 2 — Two pointers + Hash Map
**Сложность: средняя** (сама техника простая, но нужно натренировать распознавание "это two pointers" vs "это hash map" на новой задаче)

- Темы: two pointers (на отсортированном массиве, схлопывание с двух концов), fast/slow pointers, hash map как counter/lookup
- Задачи: Two Sum (1), 3Sum (15), Container With Most Water (11), Valid Anagram (242), Group Anagrams (49), Longest Consecutive Sequence (128)
- Python internals: `dict`/`set` изнутри — хэширование, коллизии, средняя/худшая сложность, `collections.Counter`, `defaultdict`

## Неделя 3 — Prefix sums (усиленный блок) + Binary Search
**Сложность: средняя** — это твоя проседающая тема (было на реальном собесе), поэтому объём задач по префиксам увеличен вдвое против остальных недель, и они возвращаются в warm-up на всех последующих неделях.

- Темы:
  - Базовый prefix sum 1D (`prefix[i] = prefix[i-1] + a[i]`), сумма на диапазоне за O(1)
  - Prefix sum + hashmap (запоминаем, на каком префиксе какая сумма/остаток встречалась) — ключевой паттерн для "subarray с суммой/условием"
  - Prefix XOR (тот же трюк, что и prefix sum, но с XOR)
  - 2D prefix sum (сумма по прямоугольнику)
  - Difference array — обратная операция к prefix sum, для серии range-update за O(1) на апдейт
  - Явно проговорить связь: prefix sum — это "накопленное состояние слева", тот же принцип, что и running streak из недели 1, только с суммой вместо счётчика
- Задачи:
  - База: Range Sum Query — Immutable (303), Running Sum of 1d Array (1480)
  - Prefix + hashmap: Subarray Sum Equals K (560), Continuous Subarray Sum (523), Subarray Sums Divisible by K (974)
  - Prefix XOR: Find the XOR of Numbers Which Appear Twice (или аналог), XOR Queries of a Subarray (1310)
  - 2D: Range Sum Query 2D — Immutable (304)
  - Difference array: Corporate Flight Bookings (1109), Car Pooling (1094)
  - Binary search: Binary Search (704), Search in Rotated Sorted Array (33), Find Minimum in Rotated Sorted Array (153), Koko Eating Bananas (875) — binary search on answer
- Python internals: итераторы и генераторы — протокол `__iter__`/`__next__`, `yield`, ленивые вычисления, `itertools` (accumulate — буквально prefix sum "из коробки", groupby, pairwise)

## Неделя 4 — Stack + Linked List
**Сложность: средняя**

- Темы: monotonic stack, валидные скобки/парсинг, базовые операции над связным списком (реверс, детект цикла, слияние)
- Задачи: Valid Parentheses (20), Daily Temperatures (739), Min Stack (155), Reverse Linked List (206), Linked List Cycle (141), Merge Two Sorted Lists (21), Remove Nth Node From End of List (19)
- Python internals: замыкания и декораторы — `*args/**kwargs`, `functools.wraps`, `lru_cache`, как работают closures (`__closure__`, поздние привязки в циклах — классическая ловушка)

## Неделя 5 — Heap / Priority Queue + Intervals + Greedy/Sorting-tricks
**Сложность: средняя-высокая** (heap реже используется в быстром скрининге, но встречается в "top-K" задачах и часто ловит врасплох)

- Темы: heap через `heapq`, top-K паттерн, задачи на интервалы (слияние/пересечение), базовый greedy
- Задачи: Kth Largest Element in an Array (215), Top K Frequent Elements (347), Merge Intervals (56), Insert Interval (57), Non-overlapping Intervals (435), Meeting Rooms (252/253 — Premium, при отсутствии доступа заменить на LeetCode 56/57 вариации)
- Python internals: ООП — magic methods (`__eq__`, `__lt__`, `__hash__`, `__repr__`), `dataclasses`, MRO и порядок разрешения методов при множественном наследовании

## Неделя 6 — Recursion/Backtracking + базовый DP (1D)
**Сложность: высокая** (первая тема, где реально требуется перестройка мышления, а не механическое применение шаблона)

- Темы: backtracking-шаблон (choose/explore/unchoose), базовый 1D DP (top-down с memo → bottom-up), различие "перебор" vs "DP" на одной и той же задаче
- Задачи: Subsets (78), Permutations (46), Combination Sum (39), Climbing Stairs (70), House Robber (198), Coin Change (322), Longest Increasing Subsequence (300)
- Python internals: асинхронность — `async`/`await`, event loop, разница `asyncio` vs `threading` vs `multiprocessing`, что такое GIL и когда он реально мешает

## Неделя 7 — Деревья и графы (обязательный минимум) + добивание слабых мест
**Сложность: средняя** (сознательно не глубоко — только то, что реально спрашивают на intern-уровне)

- Темы: обход дерева (BFS/DFS, in/pre/post-order итеративно и рекурсивно), базовые свойства BST, BFS/DFS на графе (matrix as graph — частый intern-паттерн)
- Задачи: Binary Tree Level Order Traversal (102), Validate Binary Search Tree (98), Lowest Common Ancestor of a BST (235), Number of Islands (200), Clone Graph (133)
- Плюс: 3-5 задач по итогам ретро недель 1-6 на темы, где были ошибки/пересдачи
- Python internals: контекстные менеджеры (`with`, `__enter__/__exit__`, `contextlib.contextmanager`), обработка исключений (иерархия, `finally`, custom exceptions)

## Неделя 8 — Повтор, симуляция собеседований, добивание Python
**Сложность: средняя, но психологически самая важная неделя**

- 3-4 мок-интервью в формате "45 минут, одна задача, вслух проговариваю решение" (таймер строго, задачи вперемешку по всем пройденным паттернам, без подсказок себе)
- Повтор карточек/шпаргалки по паттернам (что-то вроде решающего дерева "по каким признакам в условии определить паттерн")
- Python internals: контрольный прогон всех тем недель 1-7 + типичные вопросы-ловушки ("что выведет этот код", `__slots__`, GC/refcounting, mutable default arguments)
- Резерв: догнать долги, если где-то раньше не успел

---

## Критерии готовности (self-check к концу 8 недели)
- По любой задаче из пройденных паттернов на medium — распознаю паттерн за 1-2 минуты и пишу рабочее решение за 15-20 минут
- Задачу на prefix sum (в т.ч. с hashmap/остатком по модулю) решаю холодно за 10-15 минут без ошибки на границах индексов
- Могу объяснить Big O своего решения и указать хотя бы один альтернативный подход с другим трейд-оффом
- На вопрос по Python internals — отвечаю без запинки, с примером кода (полный список см. [`PYTHON_PLAN.md`](PYTHON_PLAN.md))
- `redo-list.md` пуст — все проблемные задачи закрыты холодным повтором 2 раза подряд

## Что не входит и почему
- Продвинутые графовые алгоритмы (Dijkstra, MST, топологическая сортировка), сложный DP (2D, на деревьях), продвинутые структуры (Trie, DSU, Segment Tree) — по опыту редко спрашивают на intern-уровне за 45 минут; если после недели 8 останется время/понадобится под конкретную компанию — добавим отдельным блоком.
