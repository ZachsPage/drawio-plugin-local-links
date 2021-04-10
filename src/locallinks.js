
// Entry point for loading plugins
Draw.loadPlugin(function(ui) {

    // ui - object passed in is defined in src/main/webapp/js/diagramly/App.js
    // then ui.editor is Editor.js
    // then ui.editor.graph is Graph from grapheditor/Graph.js
    // the graph can be used to getCell (from mxGraph)
    var graph = ui.editor.graph;
    var cell_editor = graph.createCellEditor();


    // Note: From mxGraph->mxCell docs - override functions to allow custom attributes:
    //  graph.convertValueToString & graph.cellLabelChanged 
    // - Drawio source already does this - allows node `values` and getting a 
    //   non-node value as the default attribute 'label'

    function cellClicked(cell, ui)
    {
        if( cell == null ) return;

        const ROOT_NODE_NAME = 'local-links'

        // Check if file has the `path` property (only for drawio-desktop)
        var current_file = ui.currentFile;
        if( current_file && current_file.fileObject && current_file.fileObject.path ) {
            var local_file_path = current_file.fileObject.path;
            // Function to get the directory of a file path
            function dirname(path) {
                // Todo - need to check for / vs \ for windows / unix
                return path.match(/.*\//);
            }

            // Hardcode a new file path to next diagram for now
            var this_files_dir = dirname(local_file_path);
            // Todo - need to check for / vs \ for windows / unix
            var local_link = this_files_dir + "/component_one/comp_one.drawio.png"
            
            // Launch a new window with window manager action
            const { ipcRenderer } = require('electron');
            var win_id = ipcRenderer.sendSync('winman', {action:'newfile'});
            const { BrowserWindow } = require('electron').remote
            var new_window = BrowserWindow.fromId(win_id);
            new_window.webContents.on('did-finish-load', function() {
                new_window.webContents.send('args-obj', {args: [local_file_path]});
            });

        } else {
            alert("Not a local file opened in drawio-desktop")
        }
        
        // Check if the current value is not or not - make it one
        //var curr_node;
        //if( cell.value && mxUtils.isNode(cell.value) ) {
        //    curr_node = cell.cloneValue();
        //} else {
        //    new_doc = mxUtils.createXmlDocument();
        //    curr_node = new_doc.createElement('ValueNode');
        //    if( cell.value ) { // Keep non-node value as 'label' - see top `Note:...`
        //        curr_node.setAttribute('label', cell.value);
        //    }
        //}

        // Get / create our root node
        //var our_root_node = curr_node.getAttribute(ROOT_NODE_NAME, '');
        //if( !our_root_node ) {
        //    // Todo - need this to an array - try first link first, then next, etc
        //    curr_node.setAttribute(ROOT_NODE_NAME, 'our_new_value');
        //    cell.value = curr_node;
        //}

        // Apply our changes
        //cell_editor.stopEditing(false);
    };

    // TODO - This will be right click - after I get an attribute set with
    //  mxCell.SetAttribute & mxCell.GetAttribute
    // For right click, need to use popupMenuHandle - see Graph.js
    graph.click= function(me) {
		// props.js - async required to enable hyperlinks in labels
		window.setTimeout(function() {
			cellClicked(me.getCell(), ui);
		}, 0);
	};

    // Add context click option `Plugin: Local Link` option (explore.js):
    // - Add children `Open Local Link` & `Create Local Link`
    // - Mock `create local link` to save data between open / closes 

    // Storing the Data:
    // - Need to store per `cell` - see props.js for accessing the cell data

}); // End loadPlugin