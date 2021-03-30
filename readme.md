# Drawio Plugin - Local Links
## Problem To Solve
Drawio allows linkage to other pages in the same diagram, or web links.
However, it does not allow linking to other diagram files:
* For example: top_level.drawio.png with a block containing a link to a relative
  path'd ./sub_component.drawio.png or another block to ./docs/sub_component_two.drawio.png

This is useful for larger projects consisting of submodules or many folder each
containing its own "component". 

Links traversing users through separate diagrams also allows each component 
to be agnostic to the rest of the system - modular diagrams that can be tied 
together at a system level, without having one large "system" diagram.

### Goals
* Click link to open another .drawio.png in a new window (possibily tab... but still allow individual editing...)
* Offer ordered alternative links:
    * Use relative path, if file not found, try next, and so on, until one is found
* Go to parent / previous drawio link (maybe not needed... previous will be open...)
* Click link to open a markdown file like readme.md with xdg-open
    * Open with shell.openPath https://www.electronjs.org/docs/api/shell#shellopenpathpath
    * Preview instead of opening with new program?
* Click link to preview the png
    * Probably just use the shell.openPath to open png too
    * Create iframe to preview instead?

#### Related - But Not This Project
* Possible to add command to Doxygen to open the drawio.png in drawio?
    * Would be easier to have Doxygen show the link to open with drawio...
##### VSCode - Additional Suggestion
* Use `Draw.io Integration by Henning Dieterichs` for great Drawio -> VSCode integration
    * [VSCode Extension Link](https://marketplace.visualstudio.com/items?itemName=hediet.vscode-drawio)
    * [Github link here](https://github.com/hediet/vscode-drawio)
    * **Note:** Dont believe this supports Plugins (like this repo...), but is nice regardles

## Working Notes
### Milestones
* Load my plugin that creates a new section in the toolbar
    * Better to add a context click option?
        * Have a `Plugin: Local Link` option, with children `Open Local Link`
          & `Create Local Link`
    * Check how other plugins work...
* Create an input box & two buttons (save, remove)
* Save -> saves a link value into the diagram that can can be saved/exported
* Remove -> removes link value from the diagram (persists saves)
* Use saved link value to open the new diagram in a new window
### Developing
* Only Drawio-desktop should work (due to knowing local path of drawio file), but online version should report this too
* Get drawio-deskop & git submodule update --init
    * `npm install` in there and in `drawio` submodule
    * `npm start` in drawio-deskop root

### Task Resources / Helpful Notes
* Reference exapmle plugins in `drawio` - `src/main/webapp/plugins`
    * https://desk.draw.io/support/solutions/articles/16000056430-list-of-diagrams-net-plugins
* https://stackoverflow.com/questions/38530293/electron-get-full-path-of-uploaded-file
    * Check if File object has path property - `if 'path' in files[0] { files[0].path }`
    * Should have in Electron, but not in browser version
* Prexisting Plugins
    * Use explore.js for adding context click
    * Use svgdata.js to add metadata to svg... how to make work for png?
        * From here https://stackoverflow.com/questions/56284570/how-to-programatically-extract-xml-data-from-draw-io-png
          they embed the xml data in png... so may just work...
        * Look at `writeGraphModelToPng` & `extractGraphModelFromPng` in 
          `src/main/webapp/js/diagramly/Editor.js`
    * Use props.js to show metadata... may be helpful...

