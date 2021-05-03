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

## Demo
![](doc/local_links_demo.gif)

## Test Example
Install the plugin, open `./test/top_level.drawio.png` in Drawio, then 
traverse into both sub-components using right click -> `Plugin: Local Links`

## Possible Improvements
* Add ability to preview the linked image instead of opening a new Drawio instance
* Add ability to preview other files - like `readme.md` using paths

## Additional Suggestion - Drawio VSCode Extension
* Use `Draw.io Integration by Henning Dieterichs` for great Drawio -> VSCode integration
    * [VSCode Extension Link](https://marketplace.visualstudio.com/items?itemName=hediet.vscode-drawio)
    * [Github link here](https://github.com/hediet/vscode-drawio)
    * **Note:** Don't believe this supports Plugins (like this repo, though)
