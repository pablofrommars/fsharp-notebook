import * as path from 'path';
import * as vscode from 'vscode';
import { isNullOrUndefined, TextEncoder } from 'util';

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('outputPanel.open', () => {
			OutputPanel.createOrShow(context.extensionPath);
		})
	);

	vscode.commands.registerCommand('outputPanel.save', async () => {
		if (OutputPanel.currentPanel) {
			await OutputPanel.currentPanel.Save();
		}
	});

	if (vscode.window.registerWebviewPanelSerializer) {
		vscode.window.registerWebviewPanelSerializer(OutputPanel.viewType, {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
				OutputPanel.revive(webviewPanel, context.extensionPath);
			}
		});
	}

	let fileSystemWatcher = vscode.workspace.createFileSystemWatcher('**/Output/*.{svg,html,md,txt}');
	fileSystemWatcher.onDidCreate(async (filePath) => {
		if (OutputPanel.currentPanel) {
			await OutputPanel.currentPanel.Watch(filePath);
		}
	});

	context.subscriptions.push(fileSystemWatcher);
}

class OutputPanel {
	public static currentPanel: OutputPanel | undefined;

	public static readonly viewType = 'outputPanel';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionPath: string;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionPath: string) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		if (OutputPanel.currentPanel) {
			OutputPanel.currentPanel._panel.reveal(column);
			return;
		}

		const panel = vscode.window.createWebviewPanel(
			OutputPanel.viewType,
			'Output',
			column || vscode.ViewColumn.One,
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.file(path.join(extensionPath, 'media'))]
			}
		);

		OutputPanel.currentPanel = new OutputPanel(panel, extensionPath);
	}

	public static revive(panel: vscode.WebviewPanel, extensionPath: string) {
		OutputPanel.currentPanel = new OutputPanel(panel, extensionPath);
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
								path.join(vscode.workspace.rootPath, 'Output', message.id)
							);
							
							await vscode.workspace.fs.delete(uri);
						}

						return;

					case 'save':

						if (!isNullOrUndefined(vscode.workspace.rootPath)) {
							const uri = vscode.Uri.file(
								path.join(vscode.workspace.rootPath, message.file)
							);

							await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(message.content as string));
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
			<title>Output Panel</title>
		</head>
		<body>
			<div id="cells"></div>
			<script src="${script}"></script>
		</body>
		</html>`;
	}

	public async Save() {
		await vscode.window.showInputBox({ prompt: 'Save Output Panel', value: 'notebook.html' }).then(async fn => {
			if (!isNullOrUndefined(fn)) {
				await this._panel.webview.postMessage({ 
					command: 'save', 
					file: fn
				});
			}
		});
	}

	public dispose() {
		OutputPanel.currentPanel = undefined;

		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}
}