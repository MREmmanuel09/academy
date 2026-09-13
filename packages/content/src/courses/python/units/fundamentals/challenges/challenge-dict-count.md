---
id: challenge-dict-count
slug: challenge-dict-count
title: "Word Frequency Counter"
difficulty: beginner
estimatedMinutes: 5
xp: 50
---

# Word Frequency Counter

## Objective

Write a function that takes a sentence and returns a dictionary with the frequency of each word (case-insensitive).

## Expected Output

For input `"the cat and the dog and the bird"`:

```
{'the': 3, 'cat': 1, 'and': 2, 'dog': 1, 'bird': 1}
```

## Hints

- Convert the sentence to lowercase with `.lower()`.
- Split into words with `.split()`.
- Loop through words and count using a dictionary or `collections.Counter`.
