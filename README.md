# antlr.0

A library in the [0 language](https://github.com/angelonuffer/0) to parse ANTLR grammar files and generate ANTLR grammar from AST structures.

This library uses [dialect](https://github.com/angelonuffer/dialect) for parsing and generation, and [unitest](https://github.com/angelonuffer/unitest) for testing.

## Features

- ✅ Parse ANTLR grammar declarations (`grammar Name;`, `lexer grammar Name;`, `parser grammar Name;`)
- ✅ Parse parser rules (lowercase names)
- ✅ Parse lexer rules (uppercase names), including `fragment` rules
- ✅ Support for rule alternatives (`|`)
- ✅ Support for quantifiers (`*`, `+`, `?`, `*?`, `+?`) and bounded quantifiers (`{n}`, `{n,}`, `{n,m}`)
- ✅ Support for parenthesized groups (up to 2 levels of nesting)
- ✅ Support for lexer commands (`-> skip`, `-> channel(HIDDEN)`, etc.)
- ✅ Support for `mode` declarations
- ✅ Support for wildcard (`.`)
- ✅ Support for string literals with escape sequences (`'text'`, `\n`, `\uXXXX`, etc.)
- ✅ Support for character classes (`[a-z]`, `[A-Z0-9]`, `[\u0000-\uFFFF]`)
- ✅ Comment syntax support (single-line `//` and multi-line `/* */`)
- ✅ Generate ANTLR grammar from AST
- ✅ Convert ANTLR AST to `dialect` grammar structures
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

### to_dialect : function

`{ ast : object }` => `object`

Converts an ANTLR grammar AST into a `dialect` grammar object.

**Input:**
- `ast`: ANTLR grammar AST structure

**Output:**
- A `dialect` grammar object where each key is a rule name and each value is a `dialect` rule definition.

### grammar : object

The internal dialect grammar object used for parsing and generation.

## AST Structure

The AST follows this structure:

### Root Structure

```
{
  ws_start: <optional whitespace>
  grammar_decl: <grammar_decl>
  rules: [
    {
      ws: <optional whitespace>
      rule: <lexer_rule | parser_rule | mode_decl>
    }
    ...
  ]
  ws_end: <optional whitespace>
}
```

### grammar_decl

```
{
  kind: "lexer" | "parser" | ""
  ws_kind: <optional whitespace>
  keyword: "grammar"
  ws1: <whitespace>
  name: <identifier>
  ws2: <optional whitespace>
  semicolon: ";"
}
```

### parser_rule

```
{
  name: <parser_rule_name>
  ws1: <optional whitespace>
  colon: ":"
  ws2: <optional whitespace>
  body: <rule_body>
  ws3: <optional whitespace>
  semicolon: ";"
}
```

### lexer_rule

```
{
  fragment: [ { keyword: "fragment", ws: <whitespace> } ] | []
  name: <lexer_rule_name>
  ws1: <optional whitespace>
  colon: ":"
  ws2: <optional whitespace>
  body: <rule_body>
  ws_command: <optional whitespace>
  commands: [
    {
      arrow: "->"
      ws1: <optional whitespace>
      first: <lexer_command>
      rest: [ { ws_pre: <ws>, comma: ",", ws_post: <ws>, command: <lexer_command> }, ... ]
    }
  ] | []
  ws3: <optional whitespace>
  semicolon: ";"
}
```

### mode_decl

```
{
  keyword: "mode"
  ws1: <whitespace>
  name: <identifier>
  ws2: <optional whitespace>
  semicolon: ";"
}
```

### rule_body

```
{
  first: <rule_alt>
  rest: [ { ws1: <ws>, pipe: "|", ws2: <ws>, alt: <rule_alt> }, ... ]
}
```

### rule_alt

```
{
  first: <element_with_quantifier>
  rest: [ { ws: <whitespace>, element: <element_with_quantifier> }, ... ]
}
```

### element_with_quantifier

```
{
  element: <string_literal | char_class | group | identifier | ".">
  quantifier: "*" | "+" | "?" | "*?" | "+?" | "{n}" | ... | ""
}
```

### group

```
{
  open: "("
  ws1: <optional whitespace>
  body: <rule_body>
  ws2: <optional whitespace>
  close: ")"
}
```

### lexer_command

```
{
  name: <identifier>
  args: [ { open: "(", ws1: <ws>, arg: <identifier>, ws2: <ws>, close: ")" } ] | []
}
```

## Running Tests

```bash
node /path/to/0_node.js tests/0 | node
```

## Examples

See the `tests/0` file for comprehensive examples of parsing and generation.

## Limitations

- **Parenthesized Groups:** Currently supports up to 2 levels of nesting.
- **Actions and Semantic Predicates:** Not yet supported.
- **Grammar Options:** Not yet supported.

Note: Comment syntax definitions (`single_line_comment`, `multi_line_comment`, `comment`) are available in the grammar for custom parsing needs.

## License

This project follows the same license as the [0 language](https://github.com/angelonuffer/0).

