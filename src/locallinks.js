
const path = require('path').posix;

// Entry point for loading plugins
Draw.loadPlugin(function(ui) {

    // ui - object passed in is defined in src/main/webapp/js/diagramly/App.js
    // then ui.editor is Editor.js
    // then ui.editor.graph is Graph from grapheditor/Graph.js
    // the graph can be used to getCell (from mxGraph)
    var graph = ui.editor.graph;
    var cell_editor = graph.createCellEditor();

    function TextButtonPair(parent_div) {
        var text_area = document.createElement('textarea');
        var submit_button = mxUtils.button(mxResources.get('apply'), function(){
            alert("Button was clicked, value is " + text_area.value);
        });
        parent_div.appendChild(text_area);
        parent_div.appendChild(submit_button);
    }

    // Similar to other dialogs in grapheditor/Dialogs.js
    function LocalLinkDialog(ui) {
        this.dialog_div = document.createElement('div');
        TextButtonPair( this.dialog_div );
    }

    // Class to shorten creation of menu items with `on click` actions
    function MenuAction(menu_text, action_name, on_click_fcn) {
        this.action = action_name;
        mxResources.parse(this.action + "=" + menu_text);
        // Check for no `click` event - useful for menu only holding sub-items
        on_click_fcn ? ui.actions.addAction(this.action, on_click_fcn) :
            ui.actions.addAction(this.action, function(){});
    };

    // Add new (right click menu items
    var menu_top = new MenuAction("Plugin: See Local Links...", "local_link_open_menu");
    var menu_open = new MenuAction("Open Local Link", "local_link_open",
        function() { 
            ui.showDialog( new LocalLinkDialog(ui).dialog_div, 320, 280, true, true);
        });
    var menu_add = new MenuAction("Add Local Link", "local_link_create",
        function() { alert("Clicked add") });
    var old_menu = ui.menus.createPopupMenu;
    ui.menus.createPopupMenu = function(menu, cell, evt) {
        old_menu.apply(this, arguments);
        var can_store_link = graph.model.isVertex(graph.getSelectionCell());
        if( ! can_store_link ) return;
        // Add our top menu option the contains the submenu action items
        menu.addSeparator();
        var top_menu = this.addMenuItem(menu, menu_top.action, null, evt);
        menu.addSeparator();
        this.addMenuItems(menu, ['-', menu_open.action], top_menu, evt);
        this.addMenuItems(menu, ['-', menu_add.action], top_menu, evt);
    }

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

            // Hardcode a new file path to next diagram for now
            var this_files_dir = path.dirname(local_file_path);
            var hard_path = "/component_one/comp_one.drawio.png";
            var local_link = path.join(this_files_dir, hard_path);
            local_link = path.normalize(local_link);
            
            // Create/grab the new window, then once its loaded, load the new file
            //const { ipcRenderer } = require('electron');
            //const { BrowserWindow } = require('electron').remote
            //var win_id = ipcRenderer.sendSync('winman', {action:'newfile'});
            //var new_window = BrowserWindow.fromId(win_id);
            //new_window.webContents.on('did-finish-load', function() {
            //    new_window.webContents.send('args-obj', {args: [local_link]});
            //});

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