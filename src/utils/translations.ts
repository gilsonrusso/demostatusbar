import * as vscode from "vscode";

// Tipo para os códigos de idioma suportados
type SupportedLocales = "en" | "pt-BR";

// Objeto de traduções
const translations: Record<SupportedLocales, Record<string, string>> = {
  en: {
    noFileOpen: "No file open!",
    fileIsNotInAGitRepository: "The file is not in a Git repository.",
    noContributorsFound: "No contributors found.",
    errorGettingContributions: "Error getting contributions",
    gitBlameFailed: "git blame failed with code",
    errorExecutingGitBlame: "Error executing git blame",
    topContribuitor: "Top Contributor",
    lines: "lines",
  },
  "pt-BR": {
    noFileOpen: "Nenhum arquivo aberto!",
    fileIsNotInAGitRepository: "O arquivo não está em um repositório Git.",
    noContributorsFound: "Nenhum contribuinte encontrado.",
    errorGettingContributions: "Erro ao obter contribuições",
    gitBlameFailed: "git blame falhou com código",
    errorExecutingGitBlame: "Erro ao executar git blame",
    topContribuitor: "Maior Contribuídor",
    lines: "linnhas",
  },
};

/**
 * Função para traduzir uma mensagem com base no locale definido no VS Code.
 * @param key Chave da mensagem a ser traduzida.
 * @returns A string traduzida de acordo com o locale.
 */
export function translate(key: string): string {
  // Obtém o idioma atual do VS Code
  const currentLocale = vscode.env.language as SupportedLocales;

  // Verifica se o idioma é suportado, caso contrário, usa "en" como padrão
  const locale = translations[currentLocale] ? currentLocale : "en";

  // Retorna a tradução ou a própria chave caso não exista tradução
  return translations[locale][key] || key;
}
