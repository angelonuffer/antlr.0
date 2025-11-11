# antlr.0

A library in the [0 language](https://github.com/angelonuffer/0) to parse ANTLR grammar files and generate ANTLR grammar from AST structures.

This library uses [dialect](https://github.com/angelonuffer/dialect) for parsing and generation, and [unitest](https://github.com/angelonuffer/unitest) for testing.

## Features

- ✅ Parse ANTLR grammar declarations (`grammar Name;`)
- ✅ Parse parser rules (lowercase names)
- ✅ Parse lexer rules (uppercase names)
- ✅ Support for string literals (`'text'`)
- ✅ Support for character classes (`[a-z]`, `[A-Z0-9]`)
- ✅ Comment syntax support (single-line `//` and multi-line `/* */`)
- ✅ Generate ANTLR grammar from AST
- ✅ Uses negation grammar type from dialect

## Usage

### Parsing ANTLR Grammar

```0
antlr = https://cdn.jsdelivr.net/gh/angelonuffer/antlr.0@main/code/0

// Parse a simple ANTLR grammar
input = "grammar Expr;
expr: 'hello' 'world';
ID: [a-z];"

result = antlr.parse({ input: input })

// Check if parsing succeeded
result.success == 1 ? "Success!" : "Failed"
```

### Generating ANTLR Grammar from AST

```0
antlr = https://cdn.jsdelivr.net/gh/angelonuffer/antlr.0@main/code/0

// Create an AST
ast = {
  ws_start: ""
  grammar_decl: {
    keyword: "grammar"
    ws1: " "
    name: "Example"
    ws2: ""
    semicolon: ";"
  }
  rules: []
  ws_end: ""
}

result = antlr.generate({ ast: ast })

// Result will be: "grammar Example;"
result.output
```

## API

### parse : function

`{ input : text }` => `{ success : number value : object }` or `{ success : number pos : number expected : text found : text }`

Parses ANTLR grammar text and returns an AST.

**Input:**
- `input`: ANTLR grammar text

**Output:**
- On success: `{ success: 1 value: <ast> }`
- On failure: `{ success: 0 pos: <position> expected: <expected> found: <found> }`

### generate : function

`{ ast : object }` => `{ success : number output : text }` or `{ success : number }`

Generates ANTLR grammar text from an AST.

**Input:**
- `ast`: Grammar AST structure

**Output:**
- On success: `{ success: 1 output: <text> }`
- On failure: `{ success: 0 }`

### grammar : object

The internal dialect grammar object used for parsing and generation.

## AST Structure

The AST follows this structure:

```
{
  ws_start: <optional whitespace before grammar>
  grammar_decl: {
    keyword: "grammar"
    ws1: <whitespace>
    name: <grammar name>
    ws2: <optional whitespace>
    semicolon: ";"
  }
  rules: [
    {
      ws: <whitespace before rule>
      rule: {
        name: <rule name>
        ws1: <optional whitespace>
        colon: ":"
        ws2: <optional whitespace>
        body: {
          first: <rule element>
          rest: [...]
        }
        ws3: <optional whitespace>
        semicolon: ";"
      }
    }
    ...
  ]
  ws_end: <optional whitespace at end>
}
```

## Running Tests

```bash
node /path/to/0_node.js tests/0 | node
```

## Examples

See the `tests/0` file for comprehensive examples of parsing and generation.

## Limitations

Current implementation supports:
- Grammar declarations
- Basic parser rules (lowercase names)
- Basic lexer rules (uppercase names)
- String literals with single quotes
- Character classes with ranges

Not yet supported:
- Rule alternatives (`|`)
- Operators (`*`, `+`, `?`)
- Parenthesized groups
- Actions and semantic predicates
- Grammar options

Note: Comment syntax definitions (`single_line_comment`, `multi_line_comment`, `comment`) are available in the grammar for custom parsing needs.

## License

This project follows the same license as the [0 language](https://github.com/angelonuffer/0).

