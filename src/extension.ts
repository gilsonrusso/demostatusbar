// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { exec } from "child_process";
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
        vscode.window.showErrorMessage("Nenhum arquivo aberto!");
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

function convertPathToWSL(filePath: string): string {
  return filePath
    .replace(/^([A-Za-z]):\\/, (_, drive) => `/mnt/${drive.toLowerCase()}/`)
    .replace(/\\/g, "/");
}

/**
 * Método para desativar a extensão.
 */
export function deactivate() {
  myStatusBarItem.dispose();
}

// Função para mostrar os contribuidores na barra de status.
async function showContributorsInStatusBar(filePath: string) {
  const isRepo = await isGitRepository(filePath);

  if (!isRepo) {
    vscode.window.showWarningMessage(
      "Este arquivo não está em um repositório Git."
    );
    myStatusBarItem.hide();
    return;
  }

  try {
    const blameOutput = await getGitBlame(filePath);
    const contributors = parseGitBlame(blameOutput);

    // Encontrar o autor principal (maior número de linhas).
    const [topContributor, topLines] = Object.entries(contributors).sort(
      (a, b) => b[1] - a[1]
    )[0];

    // Atualizar a barra de status.
    myStatusBarItem.text = `Top Contributor: ${topContributor} (${topLines} linhas)`;
    myStatusBarItem.show();
  } catch (error) {
    vscode.window.showErrorMessage(`Erro ao obter contribuições: ${error}`);
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
function getGitBlame(filePath: string): Promise<string> {
  const wslPath = convertPathToWSL(filePath);
  console.log(`Executando git blame no caminho: ${wslPath}`);
  return new Promise((resolve, reject) => {
    exec(`git blame ${wslPath}`, (error, stdout, stderr) => {
      if (error) {
        return reject(stderr || error.message);
      }
      resolve(stdout);
    });
  });
}

function isGitRepository(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const folderPath = require("path").dirname(filePath);
    exec(`git -C ${folderPath} rev-parse --is-inside-work-tree`, (error) => {
      resolve(!error);
    });
  });
}
