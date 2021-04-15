
const path = require('path').posix;

// Entry point for loading plugins
Draw.loadPlugin(function(ui) {

    // ui - object passed in is defined in src/main/webapp/js/diagramly/App.js
    // ui.editor -> Editor.js / ui.editor.graph -> Graph -> grapheditor/Graph.js
    var graph = ui.editor.graph;
    var cell_editor = graph.createCellEditor();

    // Function - Check if file has the `path` property (only for drawio-desktop)
    function pluginIsSupported() {
        var current_file = ui.currentFile;
        if( ! (current_file && current_file.fileObject && current_file.fileObject.path) ) {
            alert("Not a local file opened in drawio-desktop")
            return false;
        }
        return true;
    }

    // Class - Pair up the button and the text for the Dialog
    function TextButtonPair(parent_div) {
        var text_area = document.createElement('textarea');
        var submit_button = mxUtils.button(mxResources.get('apply'), function(){
            alert("Button was clicked, value is " + text_area.value);
        });
        parent_div.appendChild(text_area);
        parent_div.appendChild(submit_button);
    }

    // Class - Similar to other dialogs in grapheditor/Dialogs.js
    function LocalLinkDialog(ui) {
        this.dialog_div = document.createElement('div');
        TextButtonPair( this.dialog_div );
    }

    // Class - Shorten creation of menu items with text & `on click` actions
    function MenuAction(menu_text, action_name, on_click_fcn) {
        this.action = action_name;
        mxResources.parse(this.action + "=" + menu_text);
        // Check for no `click` event - useful for menu only holding sub-items
        on_click_fcn ? ui.actions.addAction(this.action, on_click_fcn) :
            ui.actions.addAction(this.action, function(){});
    };

    // Add new right click menu items
    var old_menu = ui.menus.createPopupMenu;
    ui.menus.createPopupMenu = function(menu, cell, evt) {
        old_menu.apply(this, arguments);
        var can_store_link = graph.model.isVertex(graph.getSelectionCell());
        if( ! can_store_link ) return;

        // Create our item variables tying the text -> action
        var menu_top = new MenuAction("Plugin: See Local Links...", "local_link_open_menu");
        var menu_open = new MenuAction("Open Local Link", "local_link_open", function(){ 
            if( !pluginIsSupported ) return;
            alert("Clicked open") 
        });
        var menu_add = new MenuAction("Add Local Link", "local_link_create", function(){ 
            if( !pluginIsSupported ) return;
            ui.showDialog( new LocalLinkDialog(ui).dialog_div, 320, 280, true, true);
        });
        // Add our top menu option the contains the submenu action items
        menu.addSeparator();
        var top_menu = this.addMenuItem(menu, menu_top.action, null, evt);
        menu.addSeparator();
        this.addMenuItems(menu, ['-', menu_open.action], top_menu, evt);
        this.addMenuItems(menu, ['-', menu_add.action], top_menu, evt);
    }

    function getCellsLocalLinkNode(cell, create_node) {
        // Check if the current value is not or not - make it one
        var curr_node;
        if( cell.value && mxUtils.isNode(cell.value) ) {
            curr_node = cell.cloneValue();
        } else {
            if( !create_node ) return false;
            new_doc = mxUtils.createXmlDocument();
            curr_node = new_doc.createElement('ValueNode');
            if( cell.value ) { // Keep non-node value as 'label' - see `Note:`
                curr_node.setAttribute('label', cell.value);
            }
        }
        // Get / create our root node
        const ROOT_NODE_NAME = 'local-links'
        var our_root_node = curr_node.getAttribute(ROOT_NODE_NAME, '');
        if( our_root_node ) return our_root_node;
        if( !create_node ) return false;

        // Todo - need this to an array - try first link first, then next, etc
        cell_editor.startEditing(cell);
        curr_node.setAttribute(ROOT_NODE_NAME, 'created');
        cell.value = curr_node;
        cell_editor.stopEditing(false);
    }

    // Function - Called when opening the `Add Local Link`
    function populateLocalLinkDialogContent(cell) {
        // Leave if the attribute doesnt exist
        // Create text area for each link value that will be attempted in order
    }

    // Function - Called  when applying the changes made during `Add Local Link`
    // - Note: From mxGraph->mxCell docs - override functions to allow custom 
    //    attributes graph.convertValueToString & graph.cellLabelChanged 
    //   - Already done by Drawio source - allows custom node `values` but still 
    //     allows non-node value as the default attribute 'label'
    function populateLocalLinkXmlContent(cell) {
        // If the attribute doesnt exist, create it
        // For each text area with text, add the values ot the xml attributes

        // Hardcode a new file path to next diagram for now
        var local_file_path = current_file.fileObject.path;
        var this_files_dir = path.dirname(local_file_path);
        var hard_path = "/component_one/comp_one.drawio.png";
        var local_link = path.join(this_files_dir, hard_path);
        local_link = path.normalize(local_link);
        
        // Check if the current value is not or not - make it one
        //cell_editor.startEditing(cell);
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
        //    curr_node.setAttribute(ROOT_NODE_NAME, 'created');
        //    cell.value = curr_node;
        //}

        // Apply our changes
        //cell_editor.stopEditing(false);
    }

    // Function - Called when attempting to open a local link
    function openLocalLink(cell) {
        // Leave if no values for the custom attribute
        // Start at first attribute, concat, if not exist, go to next
        // If exists, open - if not alert error, print what was tried

        // Create/grab the new window, then once its loaded, load the new file
        function openNewDrawioWindow(file_link) {
            const { ipcRenderer } = require('electron');
            const { BrowserWindow } = require('electron').remote
            var win_id = ipcRenderer.sendSync('winman', {action:'newfile'});
            var new_window = BrowserWindow.fromId(win_id);
            new_window.webContents.on('did-finish-load', function() {
                new_window.webContents.send('args-obj', {args: [file_link]});
            });
        }
    }

}); // End loadPlugin