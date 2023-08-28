# Highly customizable d3 based organization chart

Rewritten to TS and enhanced version of original https://github.com/bumbeishvili/org-chart

Added: 
* drag and drop
* new methods and properties: 
  * addNodes(nodes) - add multiple nodes, useful when you'd like to add subtree under existing node
  * onDataChange - callback to get noticed that there are some changed made to original chart, triggered on add/remove/drag nodes
  * getData
  * setParentNodeId(node, newId)
  * zoom(scale) - set specific scale to chart
  * d3Instance - exports imported d3 plugins. Useful when you don't want to directly reference d3 in your package.json
* typings