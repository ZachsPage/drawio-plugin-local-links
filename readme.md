# Drawio Plugin - Local Links
## Plugin Support
This plugin is only supported in Drawio-desktop while opening local files

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

## Test Example
Open `./test/top_level.drawio.png` in Drawio, then traverse into both sub-components

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
    * **Note:** Dont believe this supports Plugins (like this repo...), but is nice 
    regardless

## Working Notes
### Milestones
* Create an input box & two buttons (save, remove)
* Save -> saves a link value into the diagram that can can be saved/exported
* Remove -> removes link value from the diagram (persists saves)
* Use saved link value to open the new diagram in a new window
### Developing
* Clone drawio-desktop, then follow the README to get `npm start` working
    * Once running, go to `Extras` -> `Plugins` -> `Add...`:
        * Select the local `locallinks.js` -> `OK` -> `Apply`
        * Close Drawio and re-run `npm start`
    * **For quicker development**, use `export DRAWIO_ENV=dev` to edit the .js file
      while the app is running. If not, the plugin needs removed & added & restarted
      for each change
* Building `drawio` (non-desktop version):
    * Building / running / killing - need `ant` and python: From `drawio` main repo:
    * ```
        (cd etc/build; ant); \
        (cd src/main/webapp; python -m SimpleHTTPServer &); \
        firefox "localhost:8000"; \
        kill $(ps -ef | grep SimpleHTTPServer | grep -v grep | awk '{print $2}');
    ```
