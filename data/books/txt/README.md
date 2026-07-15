# Текстовые версии источников

Извлечены из PDF в `data/books/` для быстрого поиска/grep без открытия PDF. Используются билетником `ml_tickets.md` (см. теги источника в каждом билете).

## nikolenko/ — С. Николенко, «Машинное обучение. Основы»

Полный текст, разбит по главам оригинального PDF `data/books/Nikolenko_ml.pdf`.

| Файл | Глава |
|---|---|
| ch1_probability.txt | Теория вероятностей, основы |
| ch2_bayes.txt | Байесовский вывод |
| ch3_distributions.txt | Распределения, энтропия, оптимизация |
| ch4_regression.txt | Линейная регрессия |
| ch5_classification.txt | Классификация (LDA/QDA, логрег) |
| ch6_nonparametric_bayes.txt | kNN, ядра, байесовский вывод для гауссиана, GLM |

## voron/ — К.В. Воронцов, лекции

Источник — `data/books/voron/*.pdf`. Часть исходников — слайды со сломанной кодировкой шрифта; текст здесь уже перекодирован (Latin1→cp1251) и читается нормально.

| Файл | Тема | Исходный PDF |
|---|---|---|
| logic_trees.txt | Решающие деревья, списки, правила | Voron-ML-Logic.pdf |
| compositions_boosting.txt | AdaBoost, бэггинг, RSM, смеси | Voron-ML-Compositions.pdf |
| gradient_boosting_slides.txt | Градиентный бустинг, XGBoost/CatBoost | Voron-ML-Compositions-slides2.pdf |
| svm_slides.txt | SVM, двойственная задача, ядра, RVM | Voron-ML-Lin-SVM.pdf |
| clustering_ssl_slides.txt | k-means, DBSCAN, иерархическая, TSVM | Voron-ML-Clustering-SSL-slides.pdf |
| density_bayes_slides.txt | EM, GMM, наивный Байес, парзен | Voron-Density-Bayes-slides.pdf |

`Voron-ML-Modeling.pdf` (метрики/выбор модели) не включён — текст не извлекается даже после перекодировки (повреждённый шрифт в исходнике), нужен OCR или отдельная работа.
