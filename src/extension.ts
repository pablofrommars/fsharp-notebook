import * as path from 'path';
import * as vscode from 'vscode';
import { isNullOrUndefined, TextEncoder } from 'util';

export async function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('notebookPanel.open', () => {
			NotebookPanel.createOrShow(context.extensionPath);
		})
	);

	vscode.commands.registerCommand('notebookPanel.save', async () => {
		if (NotebookPanel.currentPanel) {
			await NotebookPanel.currentPanel.Save();
		}
	});

	if (vscode.window.registerWebviewPanelSerializer) {
		vscode.window.registerWebviewPanelSerializer(NotebookPanel.viewType, {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
				NotebookPanel.revive(webviewPanel, context.extensionPath);
			}
		});
	}


	if (!isNullOrUndefined(vscode.workspace.rootPath)) {
		const uri = vscode.Uri.file(
			path.join(vscode.workspace.rootPath, "Notebook")
		);

		await vscode.workspace.fs.createDirectory(uri).then(async () => {

			let fileSystemWatcher = vscode.workspace.createFileSystemWatcher('**/Notebook/*.{svg,html,md,txt}');

			fileSystemWatcher.onDidCreate(async (filePath) => {
				if (NotebookPanel.currentPanel) {
					await NotebookPanel.currentPanel.Watch(filePath);
				}
			});

			context.subscriptions.push(fileSystemWatcher);
		});
	}
}

class NotebookPanel {
	public static currentPanel: NotebookPanel | undefined;

	public static readonly viewType = 'notebookPanel';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionPath: string;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionPath: string) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		if (NotebookPanel.currentPanel) {
			NotebookPanel.currentPanel._panel.reveal(column);
			return;
		}

		const panel = vscode.window.createWebviewPanel(
			NotebookPanel.viewType,
			'Notebook',
			{ 
				preserveFocus: true, 
				viewColumn: vscode.ViewColumn.Beside
			},
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.file(path.join(extensionPath, 'media'))]
			}
		);

		NotebookPanel.currentPanel = new NotebookPanel(panel, extensionPath);
	}

	public static revive(panel: vscode.WebviewPanel, extensionPath: string) {
		NotebookPanel.currentPanel = new NotebookPanel(panel, extensionPath);
	}

	private constructor(panel: vscode.WebviewPanel, extensionPath: string) {
		this._panel = panel;
		this._extensionPath = extensionPath;

		this._panel.webview.html = this._getHtml();

		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		this._panel.webview.onDidReceiveMessage(
			async message => {
				switch (message.command) {
					case 'remove':

						if (!isNullOrUndefined(vscode.workspace.rootPath)) {
							const uri = vscode.Uri.file(
								path.join(vscode.workspace.rootPath, 'Notebook', message.id)
							);
							
							await vscode.workspace.fs.delete(uri);
						}

						return;

					case 'save':

						if (!isNullOrUndefined(vscode.workspace.rootPath)) {

							let cssUri : vscode.Uri;

							const css = vscode.workspace.getConfiguration('fsharpnotebook').get('css') as string;
							if (css.length > 0) {
								cssUri = vscode.Uri.file(css);
							}
							else {
								cssUri = vscode.Uri.file(
									path.join(this._extensionPath, 'media', 'css', 'save.css')
								);
							}

							const style = (await vscode.workspace.fs.readFile(cssUri)).toString();

							const content = (message.content as string).replace('$style', style);

							const uri = vscode.Uri.file(
								path.join(vscode.workspace.rootPath, message.file)
							);

							await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(content));
						}

						return;
				}
			},
			null,
			this._disposables
		);
	}

	public async Watch(filePath : vscode.Uri) {
		
		await vscode.workspace.fs.readFile(filePath).then(async o => {

			let content = o.toString();
			if (content.length === 0) {
				return;
			}

			let type = "";

			const ext = path.extname(filePath.path);
			switch(ext)
			{
				case '.svg':
					type = 'svg';
					break;

				case '.html':
					type = 'html';
					break;

				case '.md':
					type = 'md';
					await vscode.commands.executeCommand('markdown.api.render', content).then(md => {
						content = md as string;
					});
					break;

				case '.txt':
					type = 'txt';
					break;

				default:
					return;
			}

			await this._panel.webview.postMessage({ 
				command: 'append', 
				id: path.basename(filePath.path),
				type: type,
				content: content 
			});
		});
	}
	
	private _getHtml() {

		const webview = this._panel.webview;

		const codicon = webview.asWebviewUri(vscode.Uri.file(
			path.join(this._extensionPath, 'media', 'css', 'codicon', 'codicon.css')
		));

		const style = webview.asWebviewUri(vscode.Uri.file(
			path.join(this._extensionPath, 'media', 'css', 'main.css')
		));

		const script = webview.asWebviewUri(vscode.Uri.file(
			path.join(this._extensionPath, 'media', 'js', 'main.js')
		));

		return `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<link rel="stylesheet" type="text/css" href="${codicon}" />
			<link rel="stylesheet" type="text/css" href="${style}" />
			<title>Notebook</title>
		</head>
		<body>
			<div id="cells"></div>
			<script src="${script}"></script>
		</body>
		</html>`;
	}

	public async Save() {
		await vscode.window.showInputBox({ prompt: 'Save Notebook', value: 'notebook.html' }).then(async fn => {
			if (!isNullOrUndefined(fn)) {
				await this._panel.webview.postMessage({ 
					command: 'save', 
					file: fn
				});
			}
		});
	}

	public dispose() {
		NotebookPanel.currentPanel = undefined;

		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}
}