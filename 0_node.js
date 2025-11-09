import { _0 } from './analisador_sintático/index.js';
import { importações } from './analisador_sintático/importações.js';
import { avaliar, criarLazyThunk } from './analisador_semântico/index.js';
import fs from 'fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Parse command line arguments
const args = process.argv.slice(2);
const modo_verbose = args.includes('-v');
const módulo_principal = args.find(arg => !arg.startsWith('-'));

// Caminho absoluto do arquivo de cache no mesmo diretório deste 0_node.js
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CAMINHO_CACHE = path.join(__dirname, '0_cache.json');

let cache = {};
if (fs.existsSync(CAMINHO_CACHE)) {
  cache = JSON.parse(fs.readFileSync(CAMINHO_CACHE, 'utf-8'));
}

const salvar_cache = () => fs.writeFileSync(CAMINHO_CACHE, JSON.stringify(cache, null, 2));

// Helper function to resolve relative paths
const resolve_endereço = (base_module_path, rel_path) => {
  if (rel_path.startsWith('https://')) {
    return rel_path;
  }
  const base_dir = base_module_path.includes('/') ? base_module_path.substring(0, base_module_path.lastIndexOf('/') + 1) : '';
  const base_url = 'file:///' + base_dir;
  const resolved_url = new URL(rel_path, base_url);
  return decodeURIComponent(resolved_url.pathname.substring(1));
};

// Helper function to load content (local or remote) - now async lazy
const carregar_conteúdo = async (endereço) => {
  if (cache[endereço]) {
    return cache[endereço];
  }
  if (endereço.startsWith("https://")) {
    const resposta = await fetch(endereço);
    cache[endereço] = await resposta.text();
    return cache[endereço];
  } else {
    return fs.readFileSync(endereço, 'utf-8');
  }
};

// Helper function to show semantic errors with highlighted code
const mostrar_erro_semântico = (endereço, mensagem_erro, termo_busca, informações_extras = []) => {
  const conteúdo = conteúdos[endereço];
  const linhas = conteúdo.split('\n');
  
  // Find the first occurrence of the search term in the source
  let posição_erro = -1;
  let número_linha = 0;
  let número_coluna = 0;
  let comprimento_termo = termo_busca.length;
  
  // Create a regex that matches the search term as a whole word
  const regex = new RegExp(`\\b${termo_busca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
  
  for (let i = 0; i < linhas.length; i++) {
    const match = linhas[i].match(regex);
    if (match) {
      número_linha = i + 1;
      número_coluna = match.index + 1;
      posição_erro = conteúdo.split('\n').slice(0, i).join('\n').length + (i > 0 ? 1 : 0) + match.index;
      break;
    }
  }
  
  if (posição_erro === -1) {
    // Fallback: just show the error without highlighting
    console.log(`Erro: ${mensagem_erro}\n${endereço}`);
    for (const info of informações_extras) {
      console.log(info);
    }
    return;
  }
  
  const linha = linhas[número_linha - 1];
  
  // Highlight the term with yellow background (ANSI code 43)
  const linha_com_erro = linha.substring(0, número_coluna - 1) +
    `\x1b[43m${termo_busca}\x1b[0m` +
    linha.substring(número_coluna - 1 + comprimento_termo);
  
  console.log(`Erro: ${mensagem_erro}\n${endereço}\n${número_linha}:${número_coluna}: ${linha_com_erro}`);
  
  // Show extra information aligned with the error position
  if (informações_extras.length > 0) {
    // Calculate padding to align with the term position
    const padding = ' '.repeat(`${número_linha}:${número_coluna}: `.length + número_coluna - 1);
    for (const info of informações_extras) {
      console.log(`${padding}${info}`);
    }
  }
};

// Helper function to show undefined variable error with context
const mostrar_erro_variável = (endereço, nome_variável, nomes_disponíveis) => {
  const informações_extras = nomes_disponíveis.length > 0 
    ? nomes_disponíveis 
    : [];
  
  mostrar_erro_semântico(endereço, `Nome não encontrado: ${nome_variável}`, nome_variável, informações_extras);
};

// Helper function to show syntax error with context
const mostrar_erro_sintaxe = (endereço, módulo_bruto) => {
  // O analisador sintático fornece menor_resto que aponta para onde o erro ocorreu
  const unparsed_text = módulo_bruto.menor_resto || módulo_bruto.resto;
  const resto_text = módulo_bruto.resto;
  let posição_erro = conteúdos[endereço].length - unparsed_text.length;
  
  // Verifica se há delimitadores não fechados no texto restante (resto)
  // Isso indica que um delimitador foi aberto mas nunca fechado
  const resto_opening = (resto_text.match(/[\[\{\(]/g) || []).length;
  const resto_closing = (resto_text.match(/[\]\}\)]/g) || []).length;
  
  // Verifica se há uma string não fechada
  // Conta as aspas não escapadas no resto
  const aspas_matches = resto_text.match(/(?<!\\)"/g) || [];
  const tem_string_não_fechada = (aspas_matches.length % 2) === 1;
  
  // Se há mais aberturas que fechamentos no resto, o erro é provavelmente no final (falta um fechamento)
  if (resto_opening > resto_closing || tem_string_não_fechada) {
    // Move a posição do erro para o final do input (onde o delimitador deveria estar)
    // Encontra a última linha não-vazia
    const linhas = conteúdos[endereço].split('\n');
    let última_linha_não_vazia = linhas.length - 1;
    while (última_linha_não_vazia >= 0 && linhas[última_linha_não_vazia].trim() === '') {
      última_linha_não_vazia--;
    }
    
    // Calcula a posição no início da última linha não-vazia
    let pos = 0;
    for (let i = 0; i < última_linha_não_vazia; i++) {
      pos += linhas[i].length + 1; // +1 for newline
    }
    
    // Se a última linha contém um delimitador de fechamento não pareado, aponta para ele
    // Caso contrário, aponta para o final da linha
    const última_linha = linhas[última_linha_não_vazia];
    const tem_delim_fechamento = /[\]\}\)]/.test(última_linha);
    
    if (tem_delim_fechamento && !tem_string_não_fechada) {
      // Aponta para o início da linha (onde está o delimitador não pareado)
      posição_erro = pos;
    } else {
      // Aponta para o final da linha (onde o delimitador deveria estar)
      const última_linha_trimmed = última_linha.replace(/[ \t]+$/, '');
      pos += última_linha_trimmed.length;
      posição_erro = pos;
    }
  }
  
  const linhas = conteúdos[endereço].split('\n');
  const linhas_antes = conteúdos[endereço].substring(0, posição_erro).split('\n');
  const número_linha = linhas_antes.length;
  const número_coluna = linhas_antes.at(-1).length + 1;
  const linha = linhas[número_linha - 1];
  
  const linha_com_erro = (linha?.substring(0, número_coluna - 1) ?? "") +
    `\x1b[41m${linha?.[número_coluna - 1] ?? ""}\x1b[0m` +
    (linha?.substring(número_coluna) ?? "");
  console.log(`Erro de sintaxe.\n${endereço}\n${número_linha}:${número_coluna}: ${linha_com_erro}`);
};



// State for module loading and execution
const conteúdos = {};
const módulos = {};
const valores_módulos = {};

try {
  // Helper function to parse a module on demand (async lazy loading)
  const parsear_módulo = async (endereço) => {
    // If already parsed, return cached result
    if (módulos[endereço]) {
      return módulos[endereço];
    }
    
    // Load content lazily (async)
    if (!conteúdos[endereço]) {
      conteúdos[endereço] = await carregar_conteúdo(endereço);
    }
    
    // Extract imports using the import parser
    const importações_resultado = importações(conteúdos[endereço]);
    const importações_lista = importações_resultado.sucesso ? importações_resultado.valor : [];
    
    const módulo_bruto = _0(conteúdos[endereço]);
    
    // Check if parsing failed
    if (!módulo_bruto.sucesso) {
      // If there's an error with stack trace, it's a transformer error
      if (módulo_bruto.erro && módulo_bruto.erro.stack) {
        if (modo_verbose) {
          console.log(`Erro: ${módulo_bruto.erro.mensagem || módulo_bruto.erro.message}\n${módulo_bruto.erro.stack}`);
        } else {
          console.log(`Erro: ${módulo_bruto.erro.mensagem || módulo_bruto.erro.message}`);
        }
      } else {
        // Otherwise show syntax error
        mostrar_erro_sintaxe(endereço, módulo_bruto);
      }
      salvar_cache();
      process.exit(1);
    }
    
    if (módulo_bruto.resto.length > 0) {
      mostrar_erro_sintaxe(endereço, módulo_bruto);
      salvar_cache();
      process.exit(1);
    }
    
    const corpo = módulo_bruto.valor.expressão;
    const declarações = módulo_bruto.valor.declarações || [];
    const resolved_importações = importações_lista.map(({ nome, endereço: end_rel }) => [nome, resolve_endereço(endereço, end_rel)]);
    
    módulos[endereço] = {
      importações: resolved_importações,
      declarações: declarações,
      expressão: corpo
    };
    
    return módulos[endereço];
  };
  
  // Helper function to evaluate a module and its dependencies lazily (now async)
  const avaliar_módulo = async (endereço) => {
    // If already evaluated, return cached value
    if (valores_módulos.hasOwnProperty(endereço)) {
      return valores_módulos[endereço];
    }
    
    // Parse module if not yet parsed (lazy parsing - now async)
    let módulo = módulos[endereço];
    if (!módulo) {
      módulo = await parsear_módulo(endereço);
    }
    
    const { importações, declarações, expressão: corpoAst } = módulo;
    
    // Create lazy thunks for imports (now returns async functions)
    const escopo_importações = {};
    for (const [nome, dep_end] of importações) {
      escopo_importações[nome] = criarLazyThunk(() => avaliar_módulo(dep_end));
    }
    
    const escopo = { 
      ...escopo_importações, 
      __parent__: null, 
      __módulo__: endereço,
      __valores_módulos__: valores_módulos,
      __resolve_endereço__: resolve_endereço,
      __avaliar_módulo_lazy__: avaliar_módulo
    };
    
    // First pass: declare all constant names
    if (declarações) {
      for (const decl of declarações) {
        escopo[decl.nome] = undefined;
      }
    }
    
    // Second pass: evaluate and assign values (now async)
    if (declarações) {
      for (const decl of declarações) {
        try {
          escopo[decl.nome] = await avaliar(decl.valor, escopo);
        } catch (erro) {
          // Check if it's a semantic analyzer error
          if (erro.é_erro_semântico) {
            const erro_endereço = erro.módulo_endereço || endereço;
            
            // Check if it's an undefined variable error (special case)
            if (erro.nome_variável) {
              mostrar_erro_variável(erro_endereço, erro.nome_variável, erro.nomes_disponíveis);
            } else if (erro.termo_busca) {
              // Generic semantic error with search term
              mostrar_erro_semântico(erro_endereço, erro.message, erro.termo_busca);
            } else {
              // Semantic error without search term - just show the message
              console.log(`Erro: ${erro.message}\n${erro_endereço}`);
            }
            
            salvar_cache();
            process.exit(1);
          }
          // Otherwise re-throw
          throw erro;
        }
      }
    }
    
    let valor;
    try {
      valor = corpoAst ? await avaliar(corpoAst, escopo) : undefined;
    } catch (erro) {
      // Check if it's a semantic analyzer error
      if (erro.é_erro_semântico) {
        const erro_endereço = erro.módulo_endereço || endereço;
        
        // Check if it's an undefined variable error (special case)
        if (erro.nome_variável) {
          mostrar_erro_variável(erro_endereço, erro.nome_variável, erro.nomes_disponíveis);
        } else if (erro.termo_busca) {
          // Generic semantic error with search term
          mostrar_erro_semântico(erro_endereço, erro.message, erro.termo_busca);
        } else {
          // Semantic error without search term - just show the message
          console.log(`Erro: ${erro.message}\n${erro_endereço}`);
        }
        
        salvar_cache();
        process.exit(1);
      }
      // Otherwise re-throw
      throw erro;
    }
    
    valores_módulos[endereço] = valor;
    return valor;
  };
  
  // Evaluate the main module (will trigger lazy parsing and evaluation of dependencies)
  const main_value = await avaliar_módulo(módulo_principal);
  
  // Save cache
  salvar_cache();
  
  console.log(main_value);
  
} catch (erro) {
  if (modo_verbose) {
    console.error(erro);
  } else {
    const mensagem = erro.message || erro;
    console.error(erro instanceof Error ? `Error: ${mensagem}` : mensagem);
  }
  process.exit(1);
}