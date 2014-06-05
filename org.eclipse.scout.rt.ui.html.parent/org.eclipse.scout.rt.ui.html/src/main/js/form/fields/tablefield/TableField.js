// SCOUT GUI
// (c) Copyright 2013-2014, BSI Business Systems Integration AG

scout.TableField = function() {
  scout.TableField.parent.call(this);
};
scout.inherits(scout.TableField, scout.ModelAdapter);

scout.TableField.prototype._render = function($parent) {
  this.$container = $parent.appendDiv(undefined, 'table-field');
  if (this.model.label) {
    this.$label = this.$container.appendDiv(undefined, 'label');
  }

  this.table = this.session.modelAdapterRegistry[this.model.table];
  if (!this.table) {
    this.table = this.session.objectFactory.create(this.model.table);
  }
  this.table.attach(this.$container);
};

scout.TableField.prototype.dispose = function() {
  this.table.dispose();
};

scout.TableField.prototype.onModelCreate = function(event) {
  if (event.objectType == "Table") {
    if (this.table) {
      this.table.detach();
    }
    this.table = this.session.objectFactory.create(event);
    this.table.attach();
  }
  else {
    $.log("Widget creation not handled for object type '" + event.objectType + "'.");
  }
};

scout.TableField.prototype._onModelTableChanged = function(tableId) {
  this.table.detach();
  this.table = this.session.modelAdapterRegistry[tableId];
  this.table.attach(this._$container);
};

scout.TableField.prototype.onModelPropertyChange = function(event) {
  if (event.tableId !== undefined) {
    this._onModelTableChanged(event.tableId);
  }
};
