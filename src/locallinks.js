
const path_module = require('path').posix;
const fs = require('fs');

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
    };

    // Menu Button Creation
    ////////////////////////////////////////////////////////////////////////////
    // Class - Shorten creation of text boxes with associated buttons
    function TextButtonPair(parent_div, init_value) {
        this.text_box = document.createElement('textarea');
        if( init_value ) this.text_box.value = init_value; 
        this.button = mxUtils.button(mxResources.get('apply'), () => {
            alert("Button was clicked, value is " + this.text_box.value);
        });
        parent_div.appendChild( this.text_box );
        parent_div.appendChild( this.button );
    };

    // Class - Shorten creation of menu items with text & `on click` actions
    function MenuAction(menu_text, action_name, on_click_fcn) {
        this.action = action_name;
        mxResources.parse(this.action + "=" + menu_text);
        // Check for no `click` event - useful for menu only holding sub-items
        on_click_fcn ? ui.actions.addAction(this.action, on_click_fcn) :
            ui.actions.addAction(this.action, function(){});
    };

    // Override existing menu to add new right click menu items
    var old_menu = ui.menus.createPopupMenu;
    ui.menus.createPopupMenu = function(menu, cell, evt) {
        old_menu.apply(this, arguments);
        var can_store_link = graph.model.isVertex(graph.getSelectionCell());
        if( ! can_store_link ) return;

        // Create the plugin's menu items:
        // - Top item to open the sub-menu
        var menu_top = new MenuAction("Plugin: Local Links...", "local_link_open_menu");
        menu.addSeparator();
        var top_menu = this.addMenuItem(menu, menu_top.action, null, evt);
        menu.addSeparator();
        // - Add the `Edit Link` sub-menu button
        var menu_edit_links = new MenuAction("Edit Local Links", "local_link_edit", function(){ 
            if( !pluginIsSupported(ui) ) return;
            createLocalLinkEditorWindow(ui, cell);
        });
        this.addMenuItems(menu, ['-', menu_edit_links.action], top_menu, evt);
        // - Add the `Open` sub-menu button - if the cell has some local links
        var cells_xml = getCellsXmlDataElem(cell);
        if( cells_xml && getLocalLinkXmlNode(cells_xml) ) {
            var menu_open_link = new MenuAction("Open Local Link", "local_link_open",
              function(){ 
                if( !pluginIsSupported(ui) ) return;
                openLocalLink(ui, cell);
            });
        this.addMenuItems(menu, ['-', menu_open_link.action], top_menu, evt);
        }
    };

    // Menu Button Click Handling
    ////////////////////////////////////////////////////////////////////////////
    // Function - Create the window to create / edit / view local links
    function createLocalLinkEditorWindow(ui, cell) {
        // Class - window to show / add local links
        //  - Similar to other dialogs in grapheditor/Dialogs.js
        function LocalLinkDialog(ui, cell) {
            this.dialog_div = document.createElement('div');
            this.link_box_button_pairs = [];
            const MAX_LINKS = 10;
            this.addNewLinkTextBox = function(init_value) {
                if( this.link_box_button_pairs.length >= MAX_LINKS ) return;
                this.link_box_button_pairs.push(
                    new TextButtonPair(this.dialog_div, init_value) );
            }
            // Populate boxes for each existing local link
            var create_data = true;
            cells_xml = getCellsXmlDataElem(cell, create_data);
            if( ! cells_xml ) {
                alert("Plugin: Local Links - Failed to create XML data!");
                return;
            }
            var links = new LocalLinkPluginData();
            if( links.readFromXml(cells_xml) && links.relative_paths.length ) {
                links.relative_paths.forEach((path) => {
                    this.addNewLinkTextBox( path );
                });
            } else {
                this.addNewLinkTextBox();
            }
            // Add final buttons
            var new_link_button = mxUtils.button("Add New Link", () => {
                this.addNewLinkTextBox();
            });
            this.dialog_div.append(new_link_button);
            var apply_button = mxUtils.button("Apply", () => {
                while( links.relative_paths.length > 0 ) links.relative_paths.pop();
                this.link_box_button_pairs.forEach((pair) => {
                    var box_value = pair.text_box.value;
                    if( box_value ) box_value = box_value.trim();
                    if( box_value ) links.relative_paths.push(box_value);
                });
                if( ! links.writeToXml(cells_xml) ) 
                    alert("Plugin: Local Links - Failed to store links!");
            });
            this.dialog_div.append(apply_button);
        };
        ui.showDialog( new LocalLinkDialog(ui, cell).dialog_div, 320, 280, true, true);
    };
    // Function - Attempt to a new Drawio instance using a local link
    function openLocalLink(ui, cell) {
        // Know we can get the local files path since the plugin is supported
        var local_file_path = ui.currentFile.fileObject.path;
        var this_files_dir = path_module.dirname(local_file_path);
        // Know cells_xml is valid since this button was added
        var cells_xml = getCellsXmlDataElem(cell);
        var links = new LocalLinkPluginData();
        if( links.readFromXml(cells_xml) ) {
            var link_to_use = "";
            links.relative_paths.forEach((path) => {
                var local_link = path_module.join(this_files_dir, path);
                local_link = path_module.normalize(local_link);
                if( fs.existsSync(local_link) ) {
                    // Get the first existing file then leave
                    link_to_use = local_link;
                    return;
                }
            });

            link_to_use ? 
                openNewDrawioWindow(link_to_use) :
                alert("Plugin - locallinks - No valid local files found. " +
                    "In order, attempted to use : \n  - " + 
                    links.relative_paths.join('\n  - '));
        }

        // Function - create new Drawio instance, then make it load the new file
        function openNewDrawioWindow(file_link) {
            const { ipcRenderer } = require('electron');
            const { BrowserWindow } = require('electron').remote
            var win_id = ipcRenderer.sendSync('winman', {action:'newfile'});
            var new_window = BrowserWindow.fromId(win_id);
            new_window.webContents.on('did-finish-load', function() {
                new_window.webContents.send('args-obj', {args: [file_link]});
            });
        };
    };

    // Plugin's Main Embeddable Data Object
    ////////////////////////////////////////////////////////////////////////////
    // The XML element name for storing the data - MUST MATCH THE CLASS NAME
    const ROOT_ELEMENT_NAME = 'LocalLinkPluginData'
    // Class - Data to store / retrieve for local links
    function LocalLinkPluginData() {
        this.relative_paths = []; //!< Array to store the relative paths
        this.vers = 1; //< Version data in-case we change functionality
        this.key; //< Store the key, see isValid()
        this.Init = function() { this.key = 0x5050; }
        // Function - check that the decoded object is valid - MUST match this.key
        this.isValid = function() { return this.key == 0x5050 ? true : false }
        // Function - populate object with elements from an cells_xml
        this.readFromXml = function(cells_xml) {
            var xml_node = getLocalLinkXmlNode(cells_xml);
            if( xml_node == null ) return false;
            var enc = new mxCodec();
            var obj_codec = mxCodecRegistry.getCodec(LocalLinkPluginData);
            this.key = 0x0000; //< Reset key to check validity after decode
            obj_codec.decode(enc, xml_node, this);
            if( ! ('isValid' in this) ) return false;
            return this.isValid();
        };
        // Function - create / replace related xml elements
        this.writeToXml = function(cells_xml) {
            var create = true;
            var xml_node = getLocalLinkXmlNode(cells_xml, create);
            if( xml_node == null ) return false;
            var enc = new mxCodec();
            this.Init(); //< Set the key before encoding
            var obj_codec = mxCodecRegistry.getCodec(LocalLinkPluginData);
            xml_node.outerHTML = obj_codec.encode(enc, this).outerHTML;
            return true;
        };
    };
    // LocalLinkPluginData static functions - `static` syntax not supported
    // - Function - @return Local Link XML node, or null if not found
    //   @param cells_xml Doc to use  @param create Will create node if true
    function getLocalLinkXmlNode(cells_xml, create) {
        var matching_nodes = cells_xml.getElementsByTagName(ROOT_ELEMENT_NAME);
        if( matching_nodes.length > 1 ) {
            alert("Todo - multiple matching local-link nodes... clean 'em");
            return null;
        }
        if( matching_nodes.length <= 0 ) {
            if( ! create ) return null;
            var doc_utils = mxUtils.createXmlDocument();
            var new_node = doc_utils.createElement(ROOT_ELEMENT_NAME);
            cells_xml.appendChild(new_node);
            return new_node;
        }
        return matching_nodes[0];
    };
    // Register Object codec
    mxCodecRegistry.register( new mxObjectCodec(new LocalLinkPluginData()) );

    // Generic Helper Functions
    ////////////////////////////////////////////////////////////////////////////
    // Function - @return Xml document used as a cell's `value`  @param cell Cell  
    // @param create_data Make's cell's value support XML elements / nodes
    // - Note: From mxGraph->mxCell docs - override functions (already done in
    //   Drawio source) `graph.convertValueToString` & `graph.cellLabelChanged`
    //   to allow XML - create attribute `label` to preserve non-node values
    function getCellsXmlDataElem(cell, create_data) {
        if( ! cell ) return null;
        if( cell.value && mxUtils.isNode(cell.value) ) return cell.value;
        if( !create_data ) return null;
        var cells_non_node_value = cell.value;
        cell.value = mxUtils.createXmlDocument().createElement('root');
        if( cells_non_node_value ) { //< Read above function doc
            cell.value.setAttribute('label', cells_non_node_value);
        }
        return cell.value;
    };

}); // End loadPlugin
