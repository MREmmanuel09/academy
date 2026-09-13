---
id: challenge-file-read
slug: challenge-file-read
title: "Read and Process a CSV String"
difficulty: beginner
estimatedMinutes: 5
xp: 50
---

# Read and Process a CSV String

## Objective

Given a CSV string (with header), parse it and print the name and email of each user where `active` is `True`.

## Expected Input

```csv
name,email,active
Ana,ana@example.com,true
Luis,luis@example.com,false
Maria,maria@example.com,true
```

## Expected Output

```
Active users:
- Ana (ana@example.com)
- Maria (maria@example.com)
```

## Hints

- Split the string into lines with `.strip().split('\n')`.
- Parse the header separately from the data rows.
- Split each row by `,` and check if the `active` field is `"true"`.
