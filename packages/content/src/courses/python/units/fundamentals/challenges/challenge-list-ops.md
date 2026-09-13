---
id: challenge-list-ops
slug: challenge-list-ops
title: "List Operations: Filter, Double, Sum"
difficulty: beginner
estimatedMinutes: 5
xp: 50
---

# List Operations: Filter, Double, Sum

## Objective

Given a list of integers, filter only the even numbers, double each of them, and print the final sum.

## Expected Output

For input `[1, 2, 3, 4, 5, 6]`:

```
Even numbers: [2, 4, 6]
Doubled: [4, 8, 12]
Sum: 24
```

## Hints

- Use list comprehension with a condition to filter even numbers: `[x for x in nums if x % 2 == 0]`.
- Double with another comprehension or `map()`.
- Use `sum()` to get the total.
