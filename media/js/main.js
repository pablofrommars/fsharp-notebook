const vscode = acquireVsCodeApi();

const txtTemplate = '<pre class="txt">$content</pre>';

const saveTemplate = `
<!DOCTYPE html>
<html>
	<head>
    	<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width" />
		<title>Notebook</title>
		<style>
			:root {
				--vscode-editor-background: #FFFFFF;
				--vscode-editor-foreground: #2b2b2b;
				--vscode-editorLineNumber-foreground: #cccccc;
			  }

			.cell {
				width: 720px;
			}
		</style>
	</head>
	<body>
$content	
	</body>
</html>
`;

function setActive() {
	this.classList.add('active');
}

function unsetActive() {
	this.classList.remove('active');
}

function createCell(id, type, content) {
	let cells = document.getElementById('cells');

	let cell = document.createElement('div');
	cell.classList.add('cell');
	cell.id = id;
	
	let toolbar = document.createElement('div');
	toolbar.classList.add('toolbar');
	
	let trash = document.createElement('div');
	trash.classList.add('codicon');
	trash.classList.add('codicon-trashcan');
	trash.classList.add('item');
	trash.title = 'Delete: ' + id;
	
	trash.addEventListener('mousedown', setActive);
	trash.addEventListener('mouseup', unsetActive);
	trash.addEventListener('mouseout', unsetActive);
	
	trash.addEventListener('click', function() {
		if (this.parentNode.parentNode.previousSibling == null && this.parentNode.parentNode.nextSibling != null) {
			this.parentNode.parentNode.nextSibling.getElementsByClassName('codicon-arrow-up')[0].style.display = 'none';
		}

		if (this.parentNode.parentNode.nextSibling == null && this.parentNode.parentNode.previousSibling != null) {
			this.parentNode.parentNode.previousSibling.getElementsByClassName('codicon-arrow-down')[0].style.display = 'none';
		}

		document.getElementById('cells').removeChild(this.parentNode.parentNode);

		vscode.postMessage({
			command: 'remove',
			id: id
		});
	});
	
	toolbar.appendChild(trash);

	let moveUp = document.createElement('div');
	moveUp.classList.add('codicon');
	moveUp.classList.add('codicon-arrow-up');
	moveUp.classList.add('item');
	moveUp.title = 'Move Cell Up';

	if (cells.hasChildNodes()) {
		cells.lastChild.getElementsByClassName('codicon-arrow-down')[0].style.display = 'inherit';
	} else {
		moveUp.style.display = 'none';
	}
	
	moveUp.addEventListener('mousedown', setActive);
	moveUp.addEventListener('mouseup', unsetActive);
	moveUp.addEventListener('mouseout', unsetActive);
	
	moveUp.addEventListener('click', function() {
		if (this.parentNode.parentNode.previousSibling == null) {
			return;
		}

		if (this.parentNode.parentNode.nextSibling == null) {
			this.parentNode.parentNode.getElementsByClassName('codicon-arrow-down')[0].style.display = 'inherit';	
			this.parentNode.parentNode.previousSibling.getElementsByClassName('codicon-arrow-down')[0].style.display = 'none';	
		}

		if (this.parentNode.parentNode.previousSibling.previousSibling == null) {
			this.parentNode.parentNode.getElementsByClassName('codicon-arrow-up')[0].style.display = 'none';
			this.parentNode.parentNode.previousSibling.getElementsByClassName('codicon-arrow-up')[0].style.display = 'inherit';
		}
		
		document.getElementById('cells').insertBefore(this.parentNode.parentNode, this.parentNode.parentNode.previousSibling);
	});
	
	toolbar.appendChild(moveUp);

	let moveDown = document.createElement('div');
	moveDown.classList.add('codicon');
	moveDown.classList.add('codicon-arrow-down');
	moveDown.classList.add('item');
	moveDown.title = 'Move Cell Down';

	moveDown.style.display = 'none';
	
	moveDown.addEventListener('mousedown', setActive);
	moveDown.addEventListener('mouseup', unsetActive);
	moveDown.addEventListener('mouseout', unsetActive);
	
	moveDown.addEventListener('click', function() {
		if (this.parentNode.parentNode.nextSibling == null) {
			return;
		}

		if (this.parentNode.parentNode.nextSibling.nextSibling == null) {
			this.parentNode.parentNode.nextSibling.getElementsByClassName('codicon-arrow-down')[0].style.display = 'inherit';	
			this.parentNode.parentNode.getElementsByClassName('codicon-arrow-down')[0].style.display = 'none';	
		}

		if (this.parentNode.parentNode.previousSibling == null) {
			this.parentNode.parentNode.nextSibling.getElementsByClassName('codicon-arrow-up')[0].style.display = 'none';
			this.parentNode.parentNode.getElementsByClassName('codicon-arrow-up')[0].style.display = 'inherit';
		}

		document.getElementById('cells').insertBefore(this.parentNode.parentNode.nextSibling, this.parentNode.parentNode);
	});
	
	toolbar.appendChild(moveDown);

	let collapse = document.createElement('div');
	collapse.classList.add('codicon');
	collapse.classList.add('codicon-chevron-up');
	collapse.classList.add('item');
	collapse.title = 'Collapse Cell';
	
	collapse.addEventListener('mousedown', setActive);
	collapse.addEventListener('mouseup', unsetActive);
	collapse.addEventListener('mouseout', unsetActive);
	
	collapse.addEventListener('click', function() {
		this.parentNode.parentNode.classList.toggle('collapse');
		
		if (this.classList.contains('codicon-chevron-down')) {
			collapse.classList.remove('codicon-chevron-down');
			collapse.classList.add('codicon-chevron-up');
			collapse.title = 'Collapse Cell';
		} else {
			collapse.classList.remove('codicon-chevron-up');
			collapse.classList.add('codicon-chevron-down');
			collapse.title = 'Expand Cell';
		}
	});
	
	toolbar.appendChild(collapse);
	
	let close = document.createElement('div');
	close.classList.add('codicon');
	close.classList.add('codicon-close');
	close.classList.add('item');
	close.title = 'Close Cell';

	close.addEventListener('mousedown', setActive);
	close.addEventListener('mouseup', unsetActive);
	close.addEventListener('mouseout', unsetActive);
	
	close.addEventListener('click', function() {
		if (this.parentNode.parentNode.previousSibling == null && this.parentNode.parentNode.nextSibling != null) {
			this.parentNode.parentNode.nextSibling.getElementsByClassName('codicon-arrow-up')[0].style.display = 'none';
		}

		if (this.parentNode.parentNode.nextSibling == null && this.parentNode.parentNode.previousSibling != null) {
			this.parentNode.parentNode.previousSibling.getElementsByClassName('codicon-arrow-down')[0].style.display = 'none';
		}
		document.getElementById('cells').removeChild(this.parentNode.parentNode);
	});
	
	toolbar.appendChild(close);
	
	cell.appendChild(toolbar);
	
	let container = document.createElement('div');
	container.classList.add('content');

	if (type == 'txt') {
		content = txtTemplate.replace('$content', content);
	}
	
	container.innerHTML = content;
	
	cell.appendChild(container);
	
	cells.appendChild(cell);
}

function save(file) {

	const cells = document.getElementById('cells');

	let content = '';

	cells.childNodes.forEach(n => {
		content += '<!-- Cell: ' + n.id + ' -->\n';
		content += '<div class="cell">\n';
		content += n.getElementsByClassName('content')[0].innerHTML + '\n'
		content += '</div>\n';
	});

	vscode.postMessage({
		command: 'save',
		file: file,
		content: saveTemplate.replace('$content', content)
	});
}

(function()
{
	window.addEventListener('message', event => {
		const message = event.data;
		switch (message.command) {
			case 'append':
				createCell(message.id, message.type, message.content);
				return;
			case 'save':
				save(message.file);
				return;
		}
    });
})();