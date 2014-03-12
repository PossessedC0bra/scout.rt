// SCOUT GUI
// (c) Copyright 2013-2014, BSI Business Systems Integration AG

Scout.DesktopTree = function (scout, $parent, model) {
  this.model = model;
  this.scout = scout;
  this._desktopTable;

  this.scout.widgetMap[model.id] = this;
  this._$desktopTreeScroll = $parent.appendDiv('DesktopTreeScroll');
  this.scrollbar = new Scout.Scrollbar(this._$desktopTreeScroll, 'y');
  this._addNodes(this.model.nodes);
};

Scout.DesktopTree.prototype.detach = function () {
  this._$desktopTreeScroll.detach();
  if (this._desktopTable) {
    this._desktopTable.detach();
  }
};

Scout.DesktopTree.prototype.attach = function ($container) {
  this._$desktopTreeScroll.appendTo($container);
  if (this._desktopTable) {
    this._desktopTable.attach($('#DesktopBench'));
  }
};

Scout.DesktopTree.prototype.attachModel = function () {
  if (this.model.selectedNodeIds) {
    var node = this.model.selectedNodeIds[0];
    this.setNodeSelectedById(node);

//    if(this.model.detailTable) {
//      node.outlineId = this.model.id;
//      this._desktopTable = new Scout.DesktopTable(this.scout, $('#DesktopBench'), this.model.detailTable, node);
//    }
  }
};

Scout.DesktopTree.prototype.setNodeExpandedById = function (nodeId, expanded) {
  var $node = this._$desktopTreeScroll.find('#'+nodeId);
  this._setNodeExpanded($node, expanded);
};

Scout.DesktopTree.prototype._setNodeExpanded = function ($node, expanded) {
  if ($node.data('expanding') || expanded == $node.hasClass('expanded')) {
    return true;
  }
  var node = $node.data('node');
  node.expanded = expanded;
  //Only expand / collapse if there are child nodes
  if(node.childNodes.length == 0) {
    return true;
  }
  var level = $node.attr('data-level');
  if (expanded) {
    this._addNodes(node.childNodes,$node);

    // open node
    if ($node.hasClass('can-expand') && !$node.hasClass('expanded')) {
      var $newNodes = $node.nextUntil(
        function() {
          return $(this).attr("data-level") <= level;
        }
      );
      if ($newNodes.length) {
        // animated opening ;)
        $newNodes.wrapAll('<div id="TreeItemAnimate"></div>)');
        var that = this;
        var h = $newNodes.height() * $newNodes.length,
          removeContainer = function () {$(this).replaceWith($(this).contents()); that.scrollbar.initThumb();};

        $('#TreeItemAnimate').css('height', 0)
          .animateAVCSD('height', h, removeContainer, this.scrollbar.initThumb.bind(this.scrollbar));

        // animated control, at the end: parent is expanded
        $node.data('expanding', true); //save expanding state to prevent adding the same nodes twice
        var $control = $node.children('.tree-item-control'),
          rotateControl = function (now, fx) {
            $control.css('transform', 'rotate(' + now + 'deg)');
          },
          addExpanded = function () {
            $node.addClass('expanded');
            $node.removeData('expanding');
          };

        $control.css('borderSpacing', 0)
          .animateAVCSD('borderSpacing', 90, addExpanded, rotateControl);
      }
    }
  }
  else {
    $node.removeClass('expanded');

    // animated closing ;)
    $node.nextUntil(function() {return $(this).attr("data-level") <= level;})
      .wrapAll('<div id="TreeItemAnimate"></div>)');
    $('#TreeItemAnimate').animateAVCSD('height', 0, $.removeThis, this.scrollbar.initThumb.bind(this.scrollbar));

    // animated control
    var $control = $node.children('.tree-item-control'),
      rotateControl = function(now, fx){$control.css('transform', 'rotate(' + now + 'deg)');};
    $control.css('borderSpacing', 90)
      .animateAVCSD('borderSpacing', 0, null, rotateControl);
   }
};

Scout.DesktopTree.prototype.setNodeSelectedById = function (nodeId) {
  var $node = undefined;
  if (nodeId) {
    $node = this._$desktopTreeScroll.find('#' + nodeId);
    if ($node.data('node') === undefined) {
      //FIXME happens if tree with a selected node gets collapsed selected node should be showed again after outline switch.
      throw "No node found for id " + nodeId;
    }
  }

  this._setNodeSelected($node);
};

Scout.DesktopTree.prototype._setNodeSelected = function ($node) {
  if (!$node) {
    this._$desktopTreeScroll.children().select(false);
    return;
  }

  $node.selectOne();

  var node = $node.data('node');

  //update model
  this.model.selectedNodeIds = [node.id];

  if (this._desktopTable) {
    this._desktopTable.detach();
  }
  $('#DesktopBench').html('');
  if (node.table) {
    //FIXME really do this here? or better listen to detailTable property?
    this._desktopTable = this.scout.widgetMap[node.table.id];
    this._desktopTable.attach($('#DesktopBench'));
  }
  else{
    $('#DesktopBench').text(JSON.stringify(node));
  }
};

Scout.DesktopTree.prototype._onNodesInserted = function (nodes, parentNodeId) {
  var $parent = this._$desktopTreeScroll.find('#'+parentNodeId);
  var parentNode = $parent.data('node');
  if(parentNode === undefined) {
    throw "No parentNode found for id " + parentNodeId;
  }

  //update parent with new child nodes
  parentNode.childNodes.push.apply(parentNode.childNodes, nodes);

  if (parentNode.expanded) {
    this._setNodeExpanded($parent, true);
  }
};

Scout.DesktopTree.prototype._addNodes = function (nodes, $parent) {
  var $allNodes = $('');

  for (var i =  nodes.length - 1; i >= 0; i--) {
    // create node
    var node = nodes[i];
    var state = '';
    if (node.expanded && node.childNodes.length > 0) {
      state='expanded ';
    }
    if (!node.leaf) {
      state+='can-expand '; //TODO rename to leaf
    }
    level = $parent ? $parent.data('level') + 1 : 0;

    var that = this;
    var onNodeClicked = function() {
      return that._onNodeClicked(event, $(this));
    };

    var $node = $.makeDiv(node.id, 'tree-item ' + state, node.text)
            .on('click', '', onNodeClicked)
            .data('node', node)
            .attr('data-level', level)
            .css('margin-left', level * 20)
            .css('width', 'calc(100% - ' + (level * 20 + 20) + 'px)');

    var onNodeControlClicked = function() {
      return that._onNodeControlClicked(event, $(this));
    };

    // decorate with (close) control
    var $control = $node.appendDiv('', 'tree-item-control')
      .on('click', '', onNodeControlClicked);

    // rotate control if expanded
    if ($node.hasClass('expanded')) {
      $control.css('transform', 'rotate(90deg)');
    }

    var onNodeMenuClicked = function() {
      return that._onNodeMenuClicked(event, $(this));
    };

    // decorate with menu
    $node.appendDiv('', 'tree-item-menu')
      .on('click', '', onNodeMenuClicked);

    // append first node and successors
    if ($parent) {
      $node.insertAfter($parent);
    } else {
      $node.appendTo(this._$desktopTreeScroll);
    }

    // Create tables for table pages
    //FIXME really always create table (no gui is created)
    if (node.table) {
      var desktopTable = this.scout.widgetMap[node.table.id];
      if (!desktopTable) {
        node.outlineId = this.model.id;
        new Scout.DesktopTable(this.scout, $('#DesktopBench'), node, this.model.id);
      }
    }

    // collect all nodes for later return
    $allNodes = $allNodes.add($node);

    // if model demands children, create them
    if (node.expanded && node.childNodes) {
      var $n = this._addNodes(node.childNodes, $node);
      $allNodes = $allNodes.add($n);
    }
  }

  // return all created nodes
  return $allNodes;
};

Scout.DesktopTree.prototype._onNodeClicked = function (event, $clicked) {
  var node = $clicked.data('node'),
    nodeId = $clicked.attr('id'),
    wasSelected = $clicked.isSelected();

  // pre select for immediate feedback
  $clicked.selectOne();

  var events = [];
  if (!$clicked.hasClass('expanded')) {
    events.push(new Scout.Event('nodeExpanded', this.model.id, {"nodeId":node.id, "expanded":true}));
  }
  events.push(new Scout.Event('nodeClicked', this.model.id, {"nodeId":nodeId}));

  //don't send if already selected node gets clicked again
  if (!wasSelected) {
    events.push(new Scout.Event('nodeSelected', this.model.id, {"nodeId":nodeId}));
  }
  this.scout.sendEvents(events);
};

Scout.DesktopTree.prototype._onNodeControlClicked = function (event, $clicked) {
  var $node = $clicked.parent(),
    expanded = !$node.hasClass('expanded'),
    node = $node.data('node');

  this._setNodeExpanded($node, expanded);

  //FIXME really necessary? maybe property sync back
  this.scout.send('nodeExpanded', this.model.id, {"nodeId":node.id, "expanded":expanded});

  // prevent immediately reopening
  return false;
};

Scout.DesktopTree.prototype._onNodeMenuClicked = function (event, $clicked) {
  if (!$clicked.parent().isSelected()) {
    //make sure node is selected when activating the menu, otherwise the wrong menus are returned
    //FIXME section event for the server must be sent in setNodesSelected rather than nodeClick
    this._setNodesSelected($clicked.parent());
  }

  var nodeId = $clicked.parent().attr('id'),
    x = $clicked.offset().left,
    y = $clicked.offset().top,
    emptySpace = !nodeId;

  new Scout.Menu(this.scout, this.model.id, emptySpace, x, y);

  return false;
};

Scout.DesktopTree.prototype.onModelPropertyChange = function (event) {
//  if (event.detailTableId !== undefined) {
//    if (this._desktopTable) {
//      this._desktopTable.detach();
//    }
//
//    this._desktopTable = this.scout.widgetMap[event.detailTableId];
//    this._desktopTable.attach($('#DesktopBench'));
//
//    this.model.detailTable = this._desktopTable.model;
//  }
};

Scout.DesktopTree.prototype.onModelCreate = function (event) {
  if (event.objectType == "Table") {
    if (this._desktopTable) {
      this._desktopTable.detach();
    }
    var node = this.model.selectedNodeIds[0];
    this._desktopTable = new Scout.DesktopTable(this.scout,$('#DesktopBench'), event, node);
  }
};

Scout.DesktopTree.prototype.onModelAction = function (event) {
  if (event.type_ == 'nodesInserted') {
    this._onNodesInserted(event.nodes, event.commonParentNodeId);
  }
  else if (event.type_ == 'nodesDeleted') {
    //FIXME implement
//    this.removeNodes(event.nodeIds);
  }
  else if (event.type_ == 'nodesSelected') {
    this.setNodeSelectedById(event.nodeIds[0]);
  }
  else if (event.type_ == 'nodeExpanded') {
    this.setNodeExpandedById(event.nodeId, event.expanded);
  }
};
