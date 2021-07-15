// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { dirname, resolve } from 'path';
import { copyFileSync, readdirSync } from 'fs';

let options: any;

// 匹配所有的className
const exp = /className=(['|"](\w+-*_*\s*)+['|"])/g;

const main = (text: string, path: string) => {
  text = replaceClassName(text);
  if (options.copy) {
    text = copyAndImportCSS(text, path);
  }
  if (/classnames/g.test(text) && !/import\s+classnames\s+from\s+['|"]classnames["|']/g.test(text)) {
    text = `// 请确认安装了classnames\nimport classnames from 'classnames'\n${text}`;
  }
  return text;
};

const copyAndImportCSS = (text: string, path: string) => {
  const importStatement = /import\s+['|"](\.\/)?((\w+)\.(css|less|scss|sass|stylus|styl))['|"];?/g;
  try {
    const files = readdirSync(dirname(path));
    let n;
    while ((n = importStatement.exec(text))) {
      const [filename, extname] = n[2].split('.');
      if (files.includes(`${filename}.${extname}`)) {
        copyFileSync(resolve(dirname(path), `${filename}.${extname}`), resolve(dirname(path), `${filename}.module.${extname}`));
        text = text.replace(n[0], `import ${options.moduleName} from './${filename}.module.${extname}'`);
      }
    }
    return text;
  } catch (e) {
    console.log(e);
    return text;
  }
};

const replaceClassName = (text: string) => {
  return text.replace(exp, function (str, ...rest) {
    if (/\s/.test(str)) {
      const arr = rest[0]
        .replace(/["|']/g, '')
        .split(/\s+/)
        .map((item: string) => {
          // 如果有 -
          if (/\-/g.test(item)) {
            return `${options.moduleName}['${item}']`;
          }
          return `${options.moduleName}.${item}`;
        });

      return `className={${options.classnames}(${arr.join(', ')})}`;
    } else {
      // 如果有 -
      if (/\-/g.test(rest[0])) {
        return `className={${options.moduleName}[${rest[0].replace(/\"/g, "'")}]}`;
      }
      return `className={${options.moduleName}.${rest[1]}}`;
    }
  });
};

export function activate({ subscriptions }: vscode.ExtensionContext) {
  subscriptions.push(
    vscode.commands.registerTextEditorCommand('classnames.convert', (textEditor) => {
      options = vscode.workspace.getConfiguration('classnames');
      const doc = textEditor.document;
      const { path } = doc.uri;
      let selection: vscode.Range | vscode.Selection = textEditor.selection;

      // 如果没选择文本则全选
      if (selection.isEmpty) {
        const start = new vscode.Position(0, 0);
        const end = new vscode.Position(doc.lineCount - 1, doc.lineAt(doc.lineCount - 1).text.length);
        selection = new vscode.Range(start, end);
      }

      let text = doc.getText(selection);
      textEditor.edit((builder) => {
        builder.replace(selection, main(text, path));
      });
    })
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}
