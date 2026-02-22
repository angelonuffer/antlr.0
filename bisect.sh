#!/bin/bash
for i in {1..70}; do
  head -n $i xml.g4 > temp.g4
  echo "antlr = ./code/0; input = @ \"temp.g4\"; ast = antlr.parse({ input: input }); if (ast.success == 0) { console.log('Failed at line $i'); process.exit(1); }" | npx -y angelonuffer/0 | node
done
