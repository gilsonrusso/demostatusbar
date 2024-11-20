import { exec, spawn } from "node:child_process";
import path from "node:path";
import * as vscode from "vscode";

let myStatusBarItem: vscode.StatusBarItem;
// let itemSettings = vscode.workspace.getConfiguration("statusBarCustomItem");
// let colorSettings = vscode.workspace.getConfiguration("statusBarCustomColor");

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  myStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    10000
  );
  context.subscriptions.push(myStatusBarItem);

  // Registrar o comando.
  const disposable = vscode.commands.registerCommand(
    "extension.showContributors",
    () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        showContributorsInStatusBar(editor.document.fileName);
      } else {
        vscode.window.showErrorMessage(translate("noFileOpen"));
      }
    }
  );

  context.subscriptions.push(disposable);

  // Atualizar automaticamente quando o editor ativo mudar.
  vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor) {
      showContributorsInStatusBar(editor.document.fileName);
    }
  });

  // Atualizar automaticamente quando o documento é salvo.
  vscode.workspace.onDidSaveTextDocument((document) => {
    if (vscode.window.activeTextEditor?.document === document) {
      showContributorsInStatusBar(document.fileName);
    }
  });
}

// function convertPathToWSL(filePath: string): string {
//   return filePath
//     .replace(/^([A-Za-z]):\\/, (_, drive) => `/mnt/${drive.toLowerCase()}/`)
//     .replace(/\\/g, "/");
// }

/**
 * Método para desativar a extensão.
 */
export function deactivate() {
  myStatusBarItem.dispose();
}

// Função para mostrar os contribuidores na barra de status.
async function showContributorsInStatusBar(filePath: string) {
  try {
    const isRepo = await isGitRepository(filePath);

    if (!isRepo) {
      vscode.window.showWarningMessage(translate("fileIsNotInAGitRepository"));
      myStatusBarItem.hide();
      return;
    }

    const blameOutput = await getGitBlame(filePath);
    const contributors = parseGitBlame(blameOutput);

    if (Object.keys(contributors).length === 0) {
      vscode.window.showWarningMessage(translate("noContributorsFound"));
      myStatusBarItem.hide();
      return;
    }

    const [topContributor, topLines] = Object.entries(contributors).sort(
      (a, b) => b[1] - a[1]
    )[0];

    myStatusBarItem.text = `${translate(
      "topContribuitor"
    )}: ${topContributor} (${topLines} ${translate("lines")})`;
    myStatusBarItem.show();
  } catch (error: any) {
    vscode.window.showErrorMessage(
      `${translate("errorGettingContributions")}: ${error.message}`
    );
    myStatusBarItem.hide();
  }
}

// Função para processar a saída do `git blame` e contar contribuições
function parseGitBlame(blameOutput: string): Record<string, number> {
  const authors: Record<string, number> = {};
  blameOutput.split("\n").forEach((line) => {
    const match = line.match(/^\S+\s+\((.+?)\s+/); // Captura o autor
    if (match && match[1]) {
      const author = match[1];
      authors[author] = (authors[author] || 0) + 1;
    }
  });
  return authors;
}

// Função para executar o comando `git blame` no arquivo
async function getGitBlame(filePath: string): Promise<string> {
  try {
    // Obter a raiz do repositório
    const gitRoot = await getGitRoot(filePath);

    // Caminho relativo ao repositório
    const relativePath = path.relative(gitRoot, filePath);

    console.log(
      `Executando git blame para: ${relativePath} na raiz: ${gitRoot}`
    );

    return new Promise((resolve, reject) => {
      const gitBlame = spawn("git", ["-C", gitRoot, "blame", relativePath]);

      let output = "";
      let errorOutput = "";

      gitBlame.stdout.on("data", (data) => {
        output += data.toString();
      });

      gitBlame.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      gitBlame.on("close", (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(
            new Error(
              `${translate("gitBlameFailed")} ${code}. Erro: ${errorOutput}`
            )
          );
        }
      });
    });
  } catch (error: any) {
    throw new Error(`${translate("errorExecutingGitBlame")}: ${error.message}`);
  }
}

function isGitRepository(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const folderPath = process.env.WSL_DISTRO_NAME
      ? require("path").dirname(filePath)
      : path.dirname(filePath);

    exec(`git -C "${folderPath}" rev-parse --is-inside-work-tree`, (error) => {
      resolve(!error);
    });
  });
}

function getGitRoot(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const folderPath = path.dirname(filePath);
    const gitRoot = spawn("git", [
      "-C",
      folderPath,
      "rev-parse",
      "--show-toplevel",
    ]);

    let output = "";
    let errorOutput = "";

    gitRoot.stdout.on("data", (data) => {
      output += data.toString();
    });

    gitRoot.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    gitRoot.on("close", (code) => {
      if (code === 0) {
        resolve(output.trim()); // Caminho raiz do repositório
      } else {
        reject(
          new Error(`${translate("repositoryRootNotFound")}: ${errorOutput}`)
        );
      }
    });
  });
}

// Tipo para os códigos de idioma suportados
type SupportedLocales = "en" | "pt-br";

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
  "pt-br": {
    noFileOpen: "Nenhum arquivo aberto!",
    fileIsNotInAGitRepository: "O arquivo não está em um repositório Git.",
    noContributorsFound: "Nenhum contribuinte encontrado.",
    errorGettingContributions: "Erro ao obter contribuições",
    gitBlameFailed: "git blame falhou com código",
    errorExecutingGitBlame: "Erro ao executar git blame",
    topContribuitor: "Maior Contribuídor",
    lines: "linhas",
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
