scout.ColumnUserTableFilter = function() {
  scout.ColumnUserTableFilter.parent.call(this);
  this.filterType = 'column';
  this.selectedValues = [];
};
scout.inherits(scout.ColumnUserTableFilter, scout.UserTableFilter);

scout.ColumnUserTableFilter.prototype.calculateCube = function() {
  var group = (this.column.type === 'date') ? scout.ChartTableControlMatrix.DateGroup.YEAR : -1;
  this.matrix = new scout.ChartTableControlMatrix(this.table, this.session),
  this.xAxis = this.matrix.addAxis(this.column, group);
  this.matrix.calculateCube();
  this.availableValues = [];
  this.xAxis.forEach(function(key) {
    var text = this.xAxis.format(key);
    // In case of text columns, the normalized key generated by the matrix is not deterministic, it depends on the table data
    // -> use the text.
    // In the other cases it is possible to use the normalized key which has the advantage that it is locale independent
    if (this.column.type === 'text') {
      key = text;
    }
    this.availableValues.push({key: key, text: text});
  }, this);
};

scout.ColumnUserTableFilter.prototype.createAddFilterEventData = function() {
  var data = scout.ColumnUserTableFilter.parent.prototype.createAddFilterEventData.call(this);
  return $.extend(data, {
    columnId: this.column.id,
    selectedValues: this.selectedValues
  });
};

scout.ColumnUserTableFilter.prototype.createRemoveFilterEventData = function() {
  var data = scout.ColumnUserTableFilter.parent.prototype.createRemoveFilterEventData.call(this);
  return $.extend(data, {
    columnId: this.column.id
  });
};

scout.ColumnUserTableFilter.prototype.createLabel = function() {
  return this.column.text || '';
};

scout.ColumnUserTableFilter.prototype.createKey = function() {
  return this.column.id;
};

scout.ColumnUserTableFilter.prototype.accept = function($row) {
  if (!this.xAxis) {
    // Lazy calculation. It is not possible on init, because the table is not rendered yet.
    this.calculateCube();
  }
  var row = $row.data('row'),
    key = this.column.getValueForGrouping(row),
    normKey = this.xAxis.norm(key);

  if (this.column.type === 'text') {
    normKey = this.xAxis.format(normKey);
  }
  return (this.selectedValues.indexOf(normKey) > -1);
};
