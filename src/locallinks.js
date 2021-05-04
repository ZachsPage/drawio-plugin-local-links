
const path = require('path');
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

    // Generic Helper Functions
    ////////////////////////////////////////////////////////////////////////////
    // Function - @return Cell's data supporting XML elements, or null if unsupported
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
	// Function - @return file_path converted to a Posix '/' path
    function convertToPosixPath(file_path) {
        return file_path.split(path.sep).join(path.posix.sep);
    }
    // Function - @return file_path converted to a compatible system path
    function convertToSystemPath(file_path) {
        return file_path.split(path.posix.sep).join(path.sep);
    }

    // Menu Creation
    ////////////////////////////////////////////////////////////////////////////
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
        // - Check if has an existing link
        var cells_xml = getCellsXmlDataElem(cell);
        var has_existing_link = (cells_xml && getLocalLinkXmlNode(cells_xml)) ?
            true : false;
        // - Top item to open the sub-menu
        var menu_top_text = has_existing_link ? 
            "Plugin: Local Links (Has Links...)" : "Plugin: Local Links..."
        var menu_top = new MenuAction(menu_top_text, "local_link_open_menu");
        menu.addSeparator();
        var top_menu = this.addMenuItem(menu, menu_top.action, null, evt);
        menu.addSeparator();
        // - Add the `Open` sub-menu button - if the cell has some local links
        if( has_existing_link ) {
            var menu_open_link = new MenuAction("Open Local Link", "local_link_open",
              function(){ 
                if( !pluginIsSupported(ui) ) return;
                openLocalLink(ui, cell);
            });
            this.addMenuItems(menu, ['-', menu_open_link.action], top_menu, evt);
        }
        // - Add the `Edit Link` sub-menu button
        var menu_edit_links = new MenuAction("Edit Local Links", "local_link_edit", function(){ 
            if( !pluginIsSupported(ui) ) return;
            createLocalLinkEditorWindow(ui, cell);
        });
        this.addMenuItems(menu, ['-', menu_edit_links.action], top_menu, evt);
    };

    // Menu Button Click Handling
    ////////////////////////////////////////////////////////////////////////////
    // Class - Shorten creation of text boxes with associated buttons
    function TextAndRemoveButtonPair(parent_div, init_value, prepend) {
        this.parent_div = parent_div;
        this.text_box = document.createElement('textarea');
        this.rm_callback = null;
        this.addRMCallback = function(cb) { this.rm_callback = cb; } 
        this.button = mxUtils.button('Remove', () => {
            this.parent_div.removeChild( this.button );
            this.parent_div.removeChild( this.text_box );
            if( this.rm_callback ) this.rm_callback();
        });
        // Style / append elements
        this.text_box.style.resize = 'none';
        this.text_box.style.width = "75%"
        this.text_box.style.height = "34px"
        this.text_box.style.float = 'left'
        this.text_box.style.marginBottom = '5px'
        if( init_value ) this.text_box.value = init_value; 
        this.button.style.float = 'left'
        this.button.style.height = '34px'
        this.button.style.margin = '2px 2px 2px 5px'
        if( prepend ) {
            parent_div.prepend( this.button );
            parent_div.prepend( this.text_box);
        } else {
            parent_div.append( this.text_box);
            parent_div.append( this.button );
        }
    };

    // Function - Create the window to create / edit / view local links
    function createLocalLinkEditorWindow(ui, cell) {
        // Class - window to show / add local links
        //  - Similar to other dialogs in grapheditor/Dialogs.js
        function LocalLinkDialog(ui, cell) {
            this.link_box_button_pairs = [];
            const MAX_LINKS = 5;
            // Function to add a new removable text box to current dialog
            this.addNewLinkTextBox = function(init_value, prepend) {
                if( this.link_box_button_pairs.length >= MAX_LINKS ) return;
                var new_box = new TextAndRemoveButtonPair(this.link_div, init_value, prepend);
                new_box.addRMCallback( () => {
                    var box_idx = this.link_box_button_pairs.indexOf(new_box);
                    this.link_box_button_pairs.splice(box_idx, 1);
                })
                prepend ?
                    this.link_box_button_pairs.unshift( new_box ) :
                    this.link_box_button_pairs.push( new_box );
            }
            // Create the base divs to keep the element order correct
            this.dialog_div = document.createElement('div');
            this.button_div = document.createElement('div');
            this.dialog_div.append( this.button_div );
            this.link_div = document.createElement('div');
            this.dialog_div.append( this.link_div );
            // Make sure we can write links out
            cells_xml = getCellsXmlDataElem(cell, true);
            if( ! cells_xml ) {
                alert("Plugin: Local Links - Failed to create XML data!");
                return;
            }
            // Read cells existing links / populate text boxes
            this.link_data = new LocalLinkPluginData();
            if( this.link_data.readFromXml(cells_xml) && this.link_data.relative_paths.length ) {
                this.link_data.relative_paths.forEach((path) => {
                    this.addNewLinkTextBox( path );
                });
            } else {
                this.addNewLinkTextBox(); //< Add a blank box if no links exist
            }
            // Add instructional text
            this.button_div.innerHTML = "Add a link to another Drawio diagram using "+
                "the relative path from the currently opened Drawio file. Paths listed "+
                "higher will be attemped first - using the rest as alternatives on failure. <br/><br/>"
            // Add button to write out new LocalLink data
            var apply_button = mxUtils.button("Apply Changes", () => {
                while( this.link_data.relative_paths.length > 0 ) 
                    this.link_data.relative_paths.pop();
                this.link_box_button_pairs.forEach((pair) => {
                    var box_value = pair.text_box.value;
                    if( box_value ) box_value = box_value.trim();
                    if( box_value )
                        this.link_data.relative_paths.push( convertToPosixPath(box_value) );
                });
                if( ! this.link_data.writeToXml(cells_xml) ) 
                    alert("Plugin: Local Links - Failed to store links!");
            });
            apply_button.style.marginBottom = "10px"
            this.button_div.append(apply_button);
            // Add 'new link' buttons with opening order priority
            this.addNewLinkButton = function(high_priority) {
                var new_button;
                if( high_priority ) {
                    new_button = mxUtils.button("Add High Priority Link", () => {
                        this.addNewLinkTextBox("", true);
                    });
                } else {
                    new_button = mxUtils.button("Add Low Priority Link", () => {
                        this.addNewLinkTextBox();
                    });
                }
                new_button.style.marginLeft = "10px"
                new_button.style.marginBottom= "10px"
                this.button_div.append(new_button);
            }
            this.addNewLinkButton();
            this.addNewLinkButton(true);
        };
        ui.showDialog( new LocalLinkDialog(ui, cell).dialog_div, 450, 300, true, true );
    };
    // Function - Attempt to a new Drawio instance using a local link
    function openLocalLink(ui, cell) {
        // Know we can get the local files path since the plugin is supported
        var local_file_path = convertToPosixPath(ui.currentFile.fileObject.path);
        var this_files_dir = path.dirname(local_file_path);
        // Know cells_xml is valid since this button was added
        var cells_xml = getCellsXmlDataElem(cell);
        var links = new LocalLinkPluginData();
        if( links.readFromXml(cells_xml) ) {
            var link_to_use = "";
            links.relative_paths.forEach((rel_path) => {
                var local_link = path.join(this_files_dir, rel_path);
                local_link = path.normalize( convertToSystemPath(local_link) );
                if( fs.existsSync(local_link) ) {
                    // Get the first existing file then leave
                    link_to_use = local_link;
                    return;
                }
            });

            link_to_use ?
                openNewDrawioWindow(link_to_use) :
                alert("Plugin - locallinks - No valid local files found. " +
                    "In order, attempted to use these relative paths: \n  - " + 
                    links.relative_paths.join('\n  - '));
        }

        // Function - create new Drawio instance, then make it load the new file
        function openNewDrawioWindow(file_link) {
            const { ipcRenderer } = require('electron');
            const { BrowserWindow } = require('electron').remote
            var win_id = ipcRenderer.sendSync('winman', {action:'newfile'});
            var new_window = BrowserWindow.fromId(win_id);
            // Don't like this sleep, but oddly needed for Windows...
            function sleep(ms) {
                return(new Promise(function(resolve, reject) {        
                    setTimeout(function() { resolve(); }, ms);        
                }));    
            }
            new_window.webContents.on('did-finish-load', function() {
                sleep(500).then(function() {
                    new_window.webContents.send('args-obj', {args: [file_link]});
                });
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
            // Delete XML object if no links
            if( this.relative_paths.length == 0 ) {
                var xml_node = getLocalLinkXmlNode(cells_xml);
                xml_node.remove(); //< Delete XML object if not links
                return true;
            }
            var xml_node = getLocalLinkXmlNode(cells_xml, true);
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

}); // End loadPlugin
