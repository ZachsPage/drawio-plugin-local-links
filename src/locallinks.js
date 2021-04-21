
const path = require('path').posix;

// Entry point for loading plugins
Draw.loadPlugin(function(ui) {

    // ui - object passed in is defined in src/main/webapp/js/diagramly/App.js
    // ui.editor -> Editor.js / ui.editor.graph -> Graph -> grapheditor/Graph.js
    var graph = ui.editor.graph;
    var cell_editor = graph.createCellEditor();

    // Function - Check if file has the `path` property (only for drawio-desktop)
    function pluginIsSupported(ui) {
        var current_file = ui.currentFile;
        if( ! (current_file && current_file.fileObject && current_file.fileObject.path) ) {
            alert("Not a local file opened in drawio-desktop")
            return false;
        }
        return true;
    }

    // Menu Creation / Handling
    ////////////////////////////////////////////////////////////////////////////
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
        // Todo - only create if has link... show link icon in cell?
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

    // XML Attribute Handling
    const ROOT_NODE_NAME = 'local-links' //< Attribute name for local-link data
    ////////////////////////////////////////////////////////////////////////////
    // @return Attribute to store local-links data, or false if not found
    // @param cell Cell of interest @param create_node True to create if not found
    function getCellsLocalLinkAttribute(cell, create_node) {
        // Check if the current value is not or not - make it one
        var curr_node;
        if( cell && cell.value && mxUtils.isNode(cell.value) ) {
            curr_node = cell.cloneValue();
        } else {
            if( !create_node ) return false;
            new_doc = mxUtils.createXmlDocument();
            curr_node = new_doc.createElement('ValueNode');
            if( cell.value ) { // Keep non-node value as 'label' - see `Note:`
                curr_node.setAttribute('label', cell.value);
            }
        }
        // Check for attribute - return the valid node
        var local_link_data = curr_node.getAttribute(ROOT_NODE_NAME, '');
        if( local_link_data ) return curr_node;
        if( !create_node ) return false;
        // - Create attribute with default value
        cell_editor.startEditing(cell);
        curr_node.setAttribute(ROOT_NODE_NAME, 'created');
        cell.value = curr_node;
        cell_editor.stopEditing(false);
        return curr_node.getAttribute(ROOT_NODE_NAME, '');
    }

    // Function - @return True if local-links data existed and was removed
    // - Tdo - not sure if this fully works yet...
    function removeLocalLinks(cell) {
        if( !(cell && cell.value && mxUtils.isNode(cell.value)) ) return false;
        var local_link_data = cell.value.getAttribute(ROOT_NODE_NAME, '');
        if( !local_link_data ) return false;
        cell_editor.startEditing(cell);
        cell.value.removeAttribute(ROOT_NODE_NAME);
        cell_editor.stopEditing(false);
        return true;
    }

    // Function - Called when opening the `Add Local Link`
    function populateLocalLinkDialogContent(cell) {
        var attr_node = getCellsLocalLinkAttribute(cell);
        if( ! attr_node ) return false;

        // Create text area for each link value that will be attempted in order
    }

    // Function - Called  when applying the changes made during `Add Local Link`
    // - Note: From mxGraph->mxCell docs - override functions to allow custom 
    //    attributes graph.convertValueToString & graph.cellLabelChanged 
    //   - Already done by Drawio source - allows custom node `values` but still 
    //     allows non-node value as the default attribute 'label'
    function populateLocalLinkXmlContent(cell) {
        var attr_node = getCellsLocalLinkAttribute(cell, true);
        // For each text area with text, add the values ot the xml attributes

        // Hardcode a new file path to next diagram for now
        var local_file_path = current_file.fileObject.path;
        var this_files_dir = path.dirname(local_file_path);
        var hard_path = "/component_one/comp_one.drawio.png";
        var local_link = path.join(this_files_dir, hard_path);
        local_link = path.normalize(local_link);
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

    // The XML element name for storing the data - MUST MATCH THE CLASS NAME
    const ROOT_ELEMENT_NAME = 'LocalLinkPluginData'
    // Class - Cell data for our local link 
    function LocalLinkPluginData() {
        this.relative_paths; //!< Array to store the relative paths
        this.vers = 1; //< Version data in-case we change functionality
        this.key; //< Store the key, see isValid()
        this.Init = function() { this.key = 0x5050; }

        // Function - check that the decoded object is valid - static since not encoded
        this.localLinksValid = function() { return this.key == 0x5050 ? true : false }
    };
    function getLocalLinkPluginData(xml_doc) {
        var data_node = xml_doc.getElementsByTagName( ROOT_ELEMENT_NAME );
        if( data_node.length == 1 ) {
            return data_node[0];
        } else {
            // Todo - shouldnt have more than one Element by this name,
            //  but should probably account for removing them...
            return null;
        }
    }
    function updateLocalLinkPluginData(xml_doc) {
        var created_node = getLocalLinkPluginData(xml_doc);
        if( !created_node ) {
            // Not sure if I should create root element... check for it first?
        } else {
            // Update the element's HTML if found
        }
    }

    // Todo - Remove, only used for testing...
    graph.click= function(me) {
		// props.js - async required to enable hyperlinks in labels
		window.setTimeout(function() {
            var clicked_cell = me.getCell();
            if( ! clicked_cell ) return;

            // Register Object codec
            var obj_codec = new mxObjectCodec(new LocalLinkPluginData());
            mxCodecRegistry.register(obj_codec);
            var enc = new mxCodec();
            // Create new local object and get encoded version
            var new_obj = new LocalLinkPluginData();
            new_obj.Init();
            new_obj.relative_paths = ['path_one', 'path_two'];
            var encoded_obj = obj_codec.encode(enc, new_obj);
            var encoded_html = encoded_obj.outerHTML;
            // Create new doc - ensure no existing local-link data - insert
            var new_doc = mxUtils.createXmlDocument();
            var get_node = new_doc.getElementsByTagName(ROOT_ELEMENT_NAME);
            if( ! get_node.length ) {
                var new_node = new_doc.createElement(ROOT_ELEMENT_NAME);
                var root_node = new_doc.firstChild;
                if( ! root_node ) {
                    root_node = new_doc.createElement("root");
                    new_doc.appendChild(root_node);
                }
                root_node.appendChild(new_node);
            }
            // Check element is inserted now
            get_node = new_doc.getElementsByTagName(ROOT_ELEMENT_NAME);
            if( ! get_node.length ) {
                alert("Still not inserted");
            } else {
                // Try to get the invalid node
                var decoded_data = obj_codec.decode(enc, new_doc.getElementsByTagName(ROOT_ELEMENT_NAME)[0]);
                if( decoded_data && 'localLinksValid' in decoded_data ) {
                    decoded_data.localLinksValid() ? alert("data is valid") : alert("Invalid")
                }
                // Change the HTML for the node, and check it is valid now
                // - Replace existing outerHTML with our encoded object - instead of parentNode & replaceChild
                get_node[0].outerHTML = encoded_html;
                decoded_data = obj_codec.decode(enc, new_doc.getElementsByTagName(ROOT_ELEMENT_NAME)[0]);
                if( decoded_data && 'localLinksValid' in decoded_data ) {
                    decoded_data.localLinksValid() ? alert("data is valid") : alert("Invalid")
                }
            }
            alert( mxUtils.getPrettyXml(new_doc) );

		}, 0);
	};

}); // End loadPlugin
